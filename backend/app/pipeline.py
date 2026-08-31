"""Orchestrator. Plain Python, no LLM, no framework -- it decides which agent runs and in
what order, which is exactly why the flow is debuggable at 2am.

  capture()    any input -> CapturedSource (+ audit row)
  normalize()  CapturedSource -> NormalizedFieldInput   (OCR only if multimodal)
  extract()    NormalizedFieldInput -> ExtractionResult (segment, extract, validate, trust)
"""
from __future__ import annotations

import hashlib
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import agents, rules
from .config import settings
from .db import AuditRow, EventRow, SourceRow
from .schemas import (
    PROMPT_VERSION, VALIDATOR_VERSION, CapturedSource, ExecutionEvent, ExtractionResult,
    NormalizedFieldInput, SourceType,
)

_MULTIMODAL = {SourceType.image, SourceType.audio, SourceType.video}


def _next_id(db: Session, table, col, prefix: str) -> str:
    n = db.execute(select(col)).scalars().all()
    nums = [int(x.rsplit("-", 1)[-1]) for x in n if x and x.rsplit("-", 1)[-1].isdigit()]
    return f"{prefix}-{(max(nums) + 1) if nums else 1:03d}"


def audit(db: Session, entity_type: str, entity_id: str, action: str,
          actor: str = "system", **payload) -> None:
    """Append-only. Callers must not update or delete these rows."""
    db.add(AuditRow(entity_type=entity_type, entity_id=entity_id, action=action,
                    actor=actor, payload=payload))


# ─────────────────────────── CAPTURE ───────────────────────────
def capture(db: Session, *, project_id: str, source_type: SourceType,
            raw_content: str | None = None, source_name: str | None = None,
            event_timestamp: datetime | None = None, file_path: str | None = None,
            actor: str = "system", meta: dict | None = None) -> CapturedSource:
    sid = _next_id(db, SourceRow, SourceRow.id, "SRC")
    digest = hashlib.sha256((raw_content or file_path or sid).encode()).hexdigest()

    dup = db.execute(
        select(SourceRow).where(SourceRow.project_id == project_id,
                                SourceRow.content_hash == digest)
    ).scalars().first()

    row = SourceRow(
        id=sid, project_id=project_id, source_type=source_type.value,
        source_name=source_name, raw_content=raw_content, content_hash=digest,
        file_path=file_path, submitted_by=actor, event_timestamp=event_timestamp,
        meta={**(meta or {}), **({"duplicate_of": dup.id} if dup else {})},
    )
    db.add(row)
    audit(db, "source", sid, "captured", actor,
          source_type=source_type.value, duplicate_of=dup.id if dup else None)
    db.commit()
    return CapturedSource.model_validate(row)


# ─────────────────────────── NORMALIZE ───────────────────────────
def normalize(db: Session, row: SourceRow) -> tuple[NormalizedFieldInput, dict]:
    """Digital text passes through. Only image/audio/video reach the OCR model."""
    st = SourceType(row.source_type)
    trace: dict = {}
    text = row.normalized_text or row.raw_content or ""

    if st in _MULTIMODAL and not row.normalized_text:
        if not row.file_path:
            raise agents.ExtractionError(f"source {row.id} is {st.value} but has no stored file")
        t0 = time.perf_counter()
        with open(row.file_path, "rb") as f:
            data = f.read()
        mime = row.meta.get("mime") or "image/jpeg"
        text = agents.transcribe(data, mime)
        trace["transcription"] = {"model": settings.ocr_model, "mime": mime,
                                  "chars": len(text),
                                  "ms": int((time.perf_counter() - t0) * 1000)}
        row.normalized_text = text          # persisted: /evidence must show what OCR read
        audit(db, "source", row.id, "transcribed", payload_model=settings.ocr_model)
        db.commit()

    if not text.strip():
        raise agents.ExtractionError(f"source {row.id} has no text to extract from")

    text, applied = rules.normalize_text(text)
    if applied:
        trace["normalizer"] = {"rules_applied": applied, "source": "Terminology_Variants"}
        if row.normalized_text != text:      # evidence view must show what the model read
            row.normalized_text = text
            db.commit()

    return NormalizedFieldInput(
        source_id=row.id, project_id=row.project_id, text=text,
        source_type=st, event_timestamp=row.event_timestamp, meta=row.meta or {},
    ), trace


# ─────────────────────────── UNDERSTAND + TRUST ───────────────────────────
def _prior_events(db: Session, project_id: str, limit: int = 200) -> list[ExecutionEvent]:
    rows = db.execute(
        select(EventRow).where(EventRow.project_id == project_id)
        .order_by(EventRow.extracted_at.desc()).limit(limit)
    ).scalars().all()
    return [ExecutionEvent.model_validate(r) for r in rows]


def _persist(db: Session, ev: ExecutionEvent, actor: str) -> None:
    d = ev.model_dump(mode="json")
    db.add(EventRow(
        event_id=ev.event_id, project_id=ev.project_id, source_id=ev.source_id,
        activity_description=ev.activity_description, discipline=ev.discipline.value,
        location=ev.location, progress_percent=ev.progress_percent,
        event_date=ev.event_date, status=ev.status.value,
        identifiers=d["identifiers"], quantities=d["quantities"], evidence=ev.evidence,
        extraction_confidence=ev.extraction_confidence, warnings=ev.warnings,
        trust=ev.trust.value, trust_reasons=ev.trust_reasons, conflicts=d["conflicts"],
        model_used=ev.model_used, prompt_version=ev.prompt_version,
        agent_trace=d["agent_trace"], extracted_at=ev.extracted_at,
    ))
    audit(db, "event", ev.event_id, "extracted", actor,
          source_id=ev.source_id, trust=ev.trust.value, trust_reasons=ev.trust_reasons,
          conflicts=[c["conflict_type"] for c in d["conflicts"]],
          model=ev.model_used, prompt_version=ev.prompt_version,
          validator=VALIDATOR_VERSION, confidence=ev.extraction_confidence)


def _build_event(db: Session, extracted, project_id: str, source_id: str, trace: dict,
                 prior: list, span_count: int) -> ExecutionEvent:
    warns = rules.validate_event(extracted)
    conflicts = rules.detect_conflicts(extracted, prior)
    trust, reasons = rules.decide_trust(extracted, warns, conflicts, span_count)
    return ExecutionEvent(
        **extracted.model_dump(exclude={"warnings"}),
        warnings=sorted(set(extracted.warnings) | set(warns)),
        event_id=_next_id(db, EventRow, EventRow.event_id, "EVT"),
        project_id=project_id, source_id=source_id,
        trust=trust, trust_reasons=reasons, conflicts=conflicts,
        model_used=settings.reasoning_model, prompt_version=PROMPT_VERSION,
        agent_trace=trace, extracted_at=datetime.now(timezone.utc),
    )


def extract(db: Session, norm: NormalizedFieldInput, *, actor: str = "system",
            base_trace: dict | None = None) -> ExtractionResult:
    """segment -> extract -> validate -> conflicts -> trust -> persist."""
    t0 = time.perf_counter()
    ref = (norm.event_timestamp or datetime.now(timezone.utc)).date()
    events, failures, trace = agents.extract_events(norm.text, ref)
    trace = {**(base_trace or {}), **trace, "validator": VALIDATOR_VERSION,
             "reference_date": ref.isoformat()}

    prior = _prior_events(db, norm.project_id)
    out: list[ExecutionEvent] = []
    warnings: list[str] = []

    for extracted in events:
        ev = _build_event(db, extracted, norm.project_id, norm.source_id, trace,
                          prior, len(events))
        _persist(db, ev, actor)
        db.commit()                 # commit per event so _next_id sees it
        prior.insert(0, ev)         # later spans conflict-check against earlier ones
        out.append(ev)

    for f in failures:
        warnings.append(f"span {f['span_index']} failed: {f['reason']}")

    if not out and failures:
        audit(db, "source", norm.source_id, "extraction_failed", actor, failures=failures)
        db.commit()

    return ExtractionResult(
        source_id=norm.source_id, events=out, warnings=warnings,
        failed_records=failures, elapsed_ms=int((time.perf_counter() - t0) * 1000),
    )


def extract_source(db: Session, source_id: str, *, actor: str = "system") -> ExtractionResult:
    row = db.get(SourceRow, source_id)
    if row is None:
        raise KeyError(source_id)
    norm, trace = normalize(db, row)
    return extract(db, norm, actor=actor, base_trace=trace)


def extract_batch(db: Session, source_id: str, *, actor: str = "system") -> ExtractionResult:
    """Excel/CSV: one extraction per row, isolated. One bad row cannot kill the batch."""
    row = db.get(SourceRow, source_id)
    if row is None:
        raise KeyError(source_id)
    rows = (row.meta or {}).get("rows") or []
    if not rows:
        return extract_source(db, source_id, actor=actor)

    t0 = time.perf_counter()
    events, failures, warnings = [], [], list((row.meta or {}).get("parse_warnings", []))
    ref = (row.event_timestamp or datetime.now(timezone.utc)).date()

    # Rows are independent for the LLM part, so fan them out; then persist in row order so
    # conflict detection still sees earlier rows as prior events.
    sentences = [(r.get("row_index"), rules.normalize_text(r["sentence"])[0]) for r in rows]
    with ThreadPoolExecutor(max_workers=min(len(sentences), 6)) as pool:
        futures = [(idx, text, pool.submit(agents.extract_events, text, ref))
                   for idx, text in sentences]
        results = []
        for idx, text, fut in futures:
            try:
                results.append((idx, text, fut.result(), None))
            except agents.ExtractionError as e:
                results.append((idx, text, None, str(e)))

    prior = _prior_events(db, row.project_id)
    for idx, text, res, err in results:
        if err or res is None:
            failures.append({"row_index": idx, "span": text, "reason": err or "no result"})
            continue
        extracted, row_failures, trace = res
        failures.extend({**f, "row_index": idx} for f in row_failures)
        trace = {**trace, "row_index": idx, "validator": VALIDATOR_VERSION,
                 "reference_date": ref.isoformat()}
        for e in extracted:
            ev = _build_event(db, e, row.project_id, row.id, trace, prior, len(extracted))
            _persist(db, ev, actor)
            db.commit()
            prior.insert(0, ev)
            events.append(ev)

    return ExtractionResult(source_id=source_id, events=events, warnings=warnings,
                            failed_records=failures,
                            elapsed_ms=int((time.perf_counter() - t0) * 1000))


# ─────────────────────────── SCHEDULE IMPORT (no matching here) ───────────────────────────
def import_schedule(db: Session, path, project_id: str, *, actor: str = "system"):
    """Reads Preethy's workbook via the ontology adapter and upserts activities + variants.
    Import and normalize only -- matching is Daksh's service."""
    from .ontology import load_activities, load_variants
    from .db import ActivityRow, VariantRow
    from .schemas import ScheduleImportResponse

    activities, report = load_activities(path, project_id)
    for a in activities:
        d = a.model_dump(mode="json")
        existing = db.get(ActivityRow, {"activity_id": a.activity_id, "project_id": project_id})
        payload = dict(
            activity_name=a.activity_name, level=a.level, l5=a.l5, l6=a.l6,
            wbs_id=a.wbs_id, wbs_path=a.wbs_path, discipline=a.discipline.value,
            activity_type=a.activity_type, location=a.location,
            planned_start=a.planned_start, planned_finish=a.planned_finish,
            duration_days=a.duration_days, predecessors=a.predecessors,
            successors=a.successors, schedule_status=a.schedule_status.value,
            identifiers=d["identifiers"], meta=a.meta,
        )
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
        else:
            db.add(ActivityRow(activity_id=a.activity_id, project_id=project_id, **payload))

    variants = []
    try:
        variants = load_variants(path)
        for v in variants:
            existing = db.get(VariantRow, v.variant_id)
            payload = dict(reported_phrase=v.reported_phrase, canonical_term=v.canonical_term,
                           default_activity_id=v.default_activity_id,
                           variation_type=v.variation_type, reliability=v.reliability, note=v.note)
            if existing:
                for k, val in payload.items():
                    setattr(existing, k, val)
            else:
                db.add(VariantRow(variant_id=v.variant_id, **payload))
    except Exception as e:                       # workbook without that tab is not fatal
        report["warnings"].append(f"terminology variants not imported: {type(e).__name__}: {e}")

    audit(db, "schedule", project_id, "imported", actor,
          activities=len(activities), variants=len(variants),
          unmapped_columns=report["unmapped_columns"], warnings=report["warnings"])
    db.commit()
    rules._rules.cache_clear()                   # new variants -> refresh normalizer

    return ScheduleImportResponse(
        project_id=project_id, activities_imported=len(activities),
        variants_imported=len(variants), sheets_seen=report["sheets_seen"],
        columns_seen=report["columns_seen"], unmapped_columns=report["unmapped_columns"],
        warnings=report["warnings"],
    )
