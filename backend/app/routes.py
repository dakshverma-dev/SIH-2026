"""Every endpoint. Swagger at /docs is the contract teammates read instead of this file."""
from __future__ import annotations

import os
from datetime import date as Date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import auth, parsers, pipeline
from .agents import ExtractionError
from .config import settings
from .db import ActivityRow, AuditRow, EventRow, SourceRow, User, get_session
from .schemas import (
    PROMPT_VERSION, CapturedSource, EvidenceResponse, FieldUpdate, ExecutionEvent, ExtractRequest,
    ExtractionResult, HealthResponse, IngestTextRequest, LoginRequest, RawExtractRequest,
    Role, ScheduleActivity, ScheduleImportResponse, SourceType, TokenResponse, TrustDecision,
)

router = APIRouter(prefix="/api/v1")


def _model_err(e: ExtractionError):
    # never leak a stack trace to the frontend
    return HTTPException(status.HTTP_502_BAD_GATEWAY, f"extraction failed: {e}")


# ─────────────────────────── health & auth ───────────────────────────
@router.get("/health", response_model=HealthResponse, tags=["health"])
def health(db: Session = Depends(get_session)):
    try:
        n = len(db.execute(select(ActivityRow.activity_id)).scalars().all())
        dbstat = "ok"
    except Exception as e:
        n, dbstat = 0, f"error: {type(e).__name__}"
    return HealthResponse(
        status="ok", database=dbstat,
        ocr_model=settings.ocr_model, reasoning_model=settings.reasoning_model,
        nvidia_key_present=bool(settings.nvidia_api_key
                                and not settings.nvidia_api_key.startswith("nvapi-replace")),
        activities_loaded=n, prompt_version=PROMPT_VERSION,
    )


@router.post("/auth/login", response_model=TokenResponse, tags=["auth"])
def login(body: LoginRequest, db: Session = Depends(get_session)):
    user = db.get(User, body.username)
    if user is None or not auth.verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid username or password")
    return TokenResponse(access_token=auth.make_token(user.username, user.role),
                         role=Role(user.role), username=user.username)


@router.get("/auth/me", tags=["auth"])
def me(user: User = Depends(auth.current_user)):
    return {"username": user.username, "role": user.role, "full_name": user.full_name}


# ─────────────────────────── ingestion ───────────────────────────
@router.post("/updates", response_model=FieldUpdate, tags=["ingestion"],
             summary="Capture a field update from text (alias of /ingest/text)")
@router.post("/ingest/text", response_model=CapturedSource, tags=["ingestion"],
             summary="Capture a free-text field update / DPR line")
def ingest_text(body: IngestTextRequest, db: Session = Depends(get_session),
                user: User = Depends(auth.can_submit)):
    return pipeline.capture(
        db, project_id=body.project_id, source_type=SourceType.text,
        raw_content=body.text, source_name=body.source_name,
        event_timestamp=body.timestamp, actor=user.username,
    )


@router.post("/ingest/file", response_model=CapturedSource, tags=["ingestion"],
             summary="Capture .txt / .csv / .xlsx (Excel rows are parsed, never sent whole to an LLM)")
async def ingest_file(project_id: str = Form(..., examples=["PRJ-001"]),
                      file: UploadFile = File(...),
                      source_type: SourceType | None = Form(None),
                      db: Session = Depends(get_session),
                      user: User = Depends(auth.can_submit)):
    name = file.filename or "upload"
    ext = Path(name).suffix.lower()
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "uploaded file is empty")

    if ext in parsers.SUPPORTED_TEXT:
        text = data.decode("utf-8", errors="replace")
        return pipeline.capture(db, project_id=project_id,
                                source_type=source_type or SourceType.dpr,
                                raw_content=text, source_name=name, actor=user.username)

    if ext in parsers.SUPPORTED_TABLE:
        try:
            rows, unmapped, warns = parsers.parse_table(data, name)
        except ValueError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from None
        st = source_type or (SourceType.csv if ext == ".csv" else SourceType.excel)
        return pipeline.capture(
            db, project_id=project_id, source_type=st,
            raw_content="\n".join(r["sentence"] for r in rows),
            source_name=name, actor=user.username,
            meta={"rows": rows, "unmapped_columns": unmapped, "parse_warnings": warns},
        )

    if ext in parsers.SUPPORTED_IMAGE | parsers.SUPPORTED_AUDIO:
        return _store_binary(db, project_id, name, ext, data, user.username, source_type)

    raise HTTPException(status.HTTP_400_BAD_REQUEST,
                        f"unsupported file type '{ext}'. supported: "
                        f"{sorted(parsers.SUPPORTED_TEXT | parsers.SUPPORTED_TABLE | parsers.SUPPORTED_IMAGE | parsers.SUPPORTED_AUDIO)}")


def _store_binary(db, project_id, name, ext, data, actor, source_type=None):
    os.makedirs(settings.upload_dir, exist_ok=True)
    st = source_type or (SourceType.image if ext in parsers.SUPPORTED_IMAGE else SourceType.audio)
    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".webp": "image/webp", ".wav": "audio/wav", ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4", ".ogg": "audio/ogg"}.get(ext, "application/octet-stream")
    src = pipeline.capture(db, project_id=project_id, source_type=st, raw_content=None,
                           source_name=name, actor=actor, meta={"mime": mime})
    path = Path(settings.upload_dir) / f"{src.id}{ext}"
    path.write_bytes(data)
    row = db.get(SourceRow, src.id)
    row.file_path = str(path)
    db.commit()
    return CapturedSource.model_validate(row)


@router.post("/ingest/image", response_model=CapturedSource, tags=["ingestion"],
             summary="Capture a photographed DPR (transcribed by Nano Omni at extract time)")
async def ingest_image(project_id: str = Form(..., examples=["PRJ-001"]),
                       file: UploadFile = File(...),
                       db: Session = Depends(get_session),
                       user: User = Depends(auth.can_submit)):
    name = file.filename or "upload.jpg"
    ext = Path(name).suffix.lower()
    if ext not in parsers.SUPPORTED_IMAGE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"expected an image {sorted(parsers.SUPPORTED_IMAGE)}, got '{ext}'")
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "uploaded file is empty")
    return _store_binary(db, project_id, name, ext, data, user.username, SourceType.image)


@router.get("/updates", response_model=list[FieldUpdate], tags=["ingestion"],
            summary="List captured field updates (alias of /sources -- team contract name)")
@router.get("/sources", response_model=list[CapturedSource], tags=["ingestion"])
def list_sources(project_id: str | None = None, source_type: SourceType | None = None,
                 limit: int = Query(50, le=500), db: Session = Depends(get_session),
                 user: User = Depends(auth.can_read)):
    q = select(SourceRow).order_by(SourceRow.created_at.desc()).limit(limit)
    if project_id:
        q = q.where(SourceRow.project_id == project_id)
    if source_type:
        q = q.where(SourceRow.source_type == source_type.value)
    return [CapturedSource.model_validate(r) for r in db.execute(q).scalars().all()]


@router.get("/updates/{source_id}", response_model=FieldUpdate, tags=["ingestion"],
            summary="One field update (alias of /sources/{id})")
@router.get("/sources/{source_id}", response_model=CapturedSource, tags=["ingestion"])
def get_source(source_id: str, db: Session = Depends(get_session),
               user: User = Depends(auth.can_read)):
    row = db.get(SourceRow, source_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"no source '{source_id}'")
    return CapturedSource.model_validate(row)


# ─────────────────────────── extraction ───────────────────────────
@router.post("/extract", response_model=ExtractionResult, tags=["extraction"],
             summary="Understand a captured source -> ExecutionEvent[]")
def extract(body: ExtractRequest, db: Session = Depends(get_session),
            user: User = Depends(auth.can_submit)):
    try:
        return pipeline.extract_source(db, body.source_id, actor=user.username)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"no source '{body.source_id}'") from None
    except ExtractionError as e:
        raise _model_err(e) from None


@router.post("/extract/raw", response_model=ExtractionResult, tags=["extraction"],
             summary="Capture + normalize + extract in one call (demo/testing path)")
def extract_raw(body: RawExtractRequest, db: Session = Depends(get_session),
                user: User = Depends(auth.can_submit)):
    src = pipeline.capture(db, project_id=body.project_id, source_type=SourceType.text,
                           raw_content=body.text, source_name="inline",
                           event_timestamp=body.event_timestamp, actor=user.username)
    try:
        return pipeline.extract_source(db, src.id, actor=user.username)
    except ExtractionError as e:
        raise _model_err(e) from None


@router.post("/extract/batch", response_model=ExtractionResult, tags=["extraction"],
             summary="Row-by-row extraction for Excel/CSV. One bad row cannot kill the batch")
def extract_batch(body: ExtractRequest, db: Session = Depends(get_session),
                  user: User = Depends(auth.can_submit)):
    try:
        return pipeline.extract_batch(db, body.source_id, actor=user.username)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"no source '{body.source_id}'") from None
    except ExtractionError as e:
        raise _model_err(e) from None


# ─────────────────────────── events ───────────────────────────
@router.get("/events", response_model=list[ExecutionEvent], tags=["events"],
            summary="Query events. trust=REVIEW is the planner review queue")
def list_events(project_id: str | None = None, discipline: str | None = None,
                date: Date | None = None, source_id: str | None = None,
                trust: TrustDecision | None = None, limit: int = Query(100, le=1000),
                db: Session = Depends(get_session), user: User = Depends(auth.can_read)):
    q = select(EventRow).order_by(EventRow.extracted_at.desc()).limit(limit)
    if project_id:
        q = q.where(EventRow.project_id == project_id)
    if discipline:
        q = q.where(EventRow.discipline == discipline.lower())
    if date:
        q = q.where(EventRow.event_date == date)
    if source_id:
        q = q.where(EventRow.source_id == source_id)
    if trust:
        q = q.where(EventRow.trust == trust.value)
    return [ExecutionEvent.model_validate(r) for r in db.execute(q).scalars().all()]


@router.get("/events/{event_id}", response_model=ExecutionEvent, tags=["events"])
def get_event(event_id: str, db: Session = Depends(get_session),
              user: User = Depends(auth.can_read)):
    row = db.get(EventRow, event_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"no event '{event_id}'")
    return ExecutionEvent.model_validate(row)


@router.get("/events/{event_id}/evidence", response_model=EvidenceResponse, tags=["events"],
            summary="Full provenance: original source, what the model saw, and the audit trail")
def get_evidence(event_id: str, db: Session = Depends(get_session),
                 user: User = Depends(auth.can_read)):
    row = db.get(EventRow, event_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"no event '{event_id}'")
    src = db.get(SourceRow, row.source_id)
    trail = db.execute(
        select(AuditRow).where(
            ((AuditRow.entity_type == "event") & (AuditRow.entity_id == event_id))
            | ((AuditRow.entity_type == "source") & (AuditRow.entity_id == row.source_id))
        ).order_by(AuditRow.created_at)
    ).scalars().all()
    return EvidenceResponse(
        event=ExecutionEvent.model_validate(row),
        source=CapturedSource.model_validate(src),
        normalized_text=src.normalized_text or src.raw_content,
        audit_trail=[{"action": a.action, "actor": a.actor, "at": a.created_at.isoformat(),
                      "payload": a.payload} for a in trail],
    )


# ─────────────────────────── schedule ───────────────────────────
@router.post("/schedule/import", response_model=ScheduleImportResponse, tags=["schedule"],
             summary="Import the L5/L6 ontology workbook. Import + normalize only, no matching")
async def import_schedule(project_id: str = Form(..., examples=["PRJ-001"]),
                          file: UploadFile | None = File(None),
                          db: Session = Depends(get_session),
                          user: User = Depends(auth.can_import_schedule)):
    if file is None:
        path = settings.ontology_path       # no upload -> the bundled workbook
        if not path.exists():
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "no file uploaded and no bundled ontology found")
    else:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in {".xlsx", ".xls", ".csv"}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                f"schedule import expects .xlsx/.xls/.csv, got '{ext}'")
        os.makedirs(settings.upload_dir, exist_ok=True)
        path = Path(settings.upload_dir) / f"schedule_{project_id}{ext}"
        path.write_bytes(await file.read())
    try:
        return pipeline.import_schedule(db, path, project_id, actor=user.username)
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"could not import schedule: {type(e).__name__}: {e}") from None


@router.get("/schedule/activities", response_model=list[ScheduleActivity], tags=["schedule"],
            summary="Candidate L5/L6 activities for the matcher")
def list_activities(project_id: str | None = None, discipline: str | None = None,
                    location: str | None = None, limit: int = Query(500, le=5000),
                    db: Session = Depends(get_session), user: User = Depends(auth.can_read)):
    q = select(ActivityRow).order_by(ActivityRow.activity_id).limit(limit)
    if project_id:
        q = q.where(ActivityRow.project_id == project_id)
    if discipline:
        q = q.where(ActivityRow.discipline == discipline.lower())
    if location:
        q = q.where(ActivityRow.location == location)
    return [ScheduleActivity.model_validate(r) for r in db.execute(q).scalars().all()]


@router.get("/audit", tags=["audit"], summary="Append-only audit ledger")
def list_audit(entity_id: str | None = None, entity_type: str | None = None,
               limit: int = Query(100, le=1000), db: Session = Depends(get_session),
               user: User = Depends(auth.can_read)):
    q = select(AuditRow).order_by(AuditRow.created_at.desc()).limit(limit)
    if entity_id:
        q = q.where(AuditRow.entity_id == entity_id)
    if entity_type:
        q = q.where(AuditRow.entity_type == entity_type)
    return [{"id": a.id, "entity_type": a.entity_type, "entity_id": a.entity_id,
             "action": a.action, "actor": a.actor, "at": a.created_at.isoformat(),
             "payload": a.payload} for a in db.execute(q).scalars().all()]
