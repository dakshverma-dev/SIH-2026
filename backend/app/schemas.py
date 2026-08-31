"""All Pydantic contracts. One file so the matcher/frontend owners can read it in one pass.

Vocabulary comes from data/ontology.xlsx (Preethy). Enums below are NOT invented --
TrustDecision mirrors Benchmark_Events.expected_decision, ConflictType mirrors
Conflict_Cases.expected_conflict_type.
"""
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

PROMPT_VERSION = "extract-v6"
VALIDATOR_VERSION = "rules-v1"


# ─────────────────────────── enums ───────────────────────────
class SourceType(str, Enum):
    text = "text"
    excel = "excel"
    csv = "csv"
    image = "image"
    dpr = "dpr"
    audio = "audio"
    video = "video"


class Discipline(str, Enum):
    piping = "piping"
    civil = "civil"
    mechanical = "mechanical"
    electrical = "electrical"
    instrumentation = "instrumentation"
    hse = "hse"
    structural = "structural"
    quality = "quality"          # ontology uses Quality for NDT/inspection (PIP-327)
    unknown = "unknown"


class Status(str, Enum):
    not_started = "not_started"
    started = "started"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"
    delayed = "delayed"
    unknown = "unknown"


class TrustDecision(str, Enum):
    """Benchmark_Events.expected_decision -> PPT slide 3 auto-post / review / unmatched."""
    match = "MATCH"
    review = "REVIEW"
    unmatched = "UNMATCHED"


class ConflictType(str, Enum):
    """Verbatim from Conflict_Cases. Last two are non-conflicts and must stay that way."""
    progress_regression = "PROGRESS_REGRESSION"
    completion_regression = "COMPLETION_REGRESSION"
    status_contradiction = "STATUS_CONTRADICTION"
    date_status_conflict = "DATE_STATUS_CONFLICT"
    duplicate_report = "DUPLICATE_REPORT"
    location_conflict = "LOCATION_CONFLICT"
    date_conflict = "DATE_CONFLICT"
    completion_reopened = "COMPLETION_REOPENED"
    valid_progression = "VALID_PROGRESSION"
    valid_transition = "VALID_TRANSITION"


class ConflictAction(str, Enum):
    flag = "FLAG"
    review = "REVIEW"
    deduplicate = "DEDUPLICATE"
    accept = "ACCEPT"


class Role(str, Enum):
    field_supervisor = "field_supervisor"
    planner = "planner"
    project_manager = "project_manager"
    admin = "admin"


# ─────────────────────── capture / normalize ───────────────────────
class CapturedSource(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    source_type: SourceType
    source_name: str | None = None
    raw_content: str | None = None
    normalized_text: str | None = None   # post-OCR / post-parse. what the LLM actually saw
    created_at: datetime
    event_timestamp: datetime | None = None
    submitted_by: str | None = None
    meta: dict = Field(default_factory=dict)


# The team contract (Daksh's lib/api) calls a captured source a "FieldUpdate" and reads it
# from GET /updates. Same object, agreed name -- alias rather than a rename so nothing that
# already speaks CapturedSource/{/sources} breaks.
FieldUpdate = CapturedSource


class NormalizedFieldInput(BaseModel):
    """The only contract the Understand layer sees. Origin format is invisible here."""
    source_id: str
    project_id: str
    text: str
    source_type: SourceType
    event_timestamp: datetime | None = None
    meta: dict = Field(default_factory=dict)


# ─────────────────────────── execution event ───────────────────────────
class Identifiers(BaseModel):
    line_id: str | None = None
    equipment_id: str | None = None
    spool_id: str | None = None
    foundation_id: str | None = None
    instrument_id: str | None = None
    cable_id: str | None = None
    asset_tag: str | None = None     # ontology's join hint: P104 / T201
    size: str | None = None
    other: dict = Field(default_factory=dict)

    def present(self) -> dict[str, str]:
        d = {k: v for k, v in self.model_dump().items() if k != "other" and v}
        d.update({k: str(v) for k, v in (self.other or {}).items() if v})
        return d


class Quantity(BaseModel):
    value: float
    unit: str
    of: str | None = None
    total: float | None = None       # "two of five supports" -> value=2 total=5


class ExtractedEvent(BaseModel):
    """Exactly what the LLM is allowed to return. No ids -- the server owns identity,
    so the model cannot hallucinate an event_id or a schedule activity_id."""
    activity_description: str
    discipline: Discipline = Discipline.unknown
    location: str | None = None
    progress_percent: float | None = Field(None, ge=0, le=100)
    event_date: date | None = None
    status: Status = Status.unknown
    identifiers: Identifiers = Field(default_factory=Identifiers)
    quantities: list[Quantity] = Field(default_factory=list)
    evidence: str
    extraction_confidence: float = Field(..., ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)

    @field_validator("discipline", "status", mode="before")
    @classmethod
    def _coerce_enum(cls, v):
        # model says "Piping" / "N/A" / None -> don't 422 a whole batch over casing
        if isinstance(v, (Discipline, Status)):
            return v
        if v is None:
            return "unknown"
        s = str(v).strip().lower().replace(" ", "_").replace("-", "_")
        return s or "unknown"

    @field_validator("progress_percent", mode="before")
    @classmethod
    def _coerce_pct(cls, v):
        if v in (None, "", "null", "N/A", "n/a"):
            return None
        if isinstance(v, str):
            v = v.replace("%", "").strip()
        return v


class ConflictFinding(BaseModel):
    conflict_type: ConflictType
    action: ConflictAction
    detail: str
    against_event_id: str | None = None   # the earlier event we disagreed with


class ExecutionEvent(ExtractedEvent):
    """What leaves my service. Daksh's matcher consumes this and nothing else."""
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    project_id: str
    source_id: str

    # trust gate -- PPT slide 3
    trust: TrustDecision = TrustDecision.review
    trust_reasons: list[str] = Field(default_factory=list)
    conflicts: list[ConflictFinding] = Field(default_factory=list)

    # audit -- "where did this number come from"
    model_used: str
    prompt_version: str = PROMPT_VERSION
    agent_trace: dict = Field(default_factory=dict)
    extracted_at: datetime


class ExtractionResult(BaseModel):
    """One source can yield many events (Benchmark B030 mixed update)."""
    source_id: str
    events: list[ExecutionEvent] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    failed_records: list[dict] = Field(default_factory=list)
    elapsed_ms: int = 0


# ─────────────────────── schedule side (import only) ───────────────────────
class ScheduleActivity(BaseModel):
    """Planned work. NEVER merged with ExecutionEvent -- the matcher joins them."""
    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    project_id: str
    activity_name: str
    level: str | None = None            # "L6"
    l5: str | None = None
    l6: str | None = None
    wbs_id: str | None = None
    wbs_path: str | None = None
    discipline: Discipline = Discipline.unknown
    activity_type: str | None = None    # ontology: "Piping spool erection"
    location: str | None = None
    planned_start: date | None = None
    planned_finish: date | None = None
    duration_days: float | None = None
    predecessors: list[str] = Field(default_factory=list)
    successors: list[str] = Field(default_factory=list)
    schedule_status: Status = Status.unknown
    identifiers: Identifiers = Field(default_factory=Identifiers)
    meta: dict = Field(default_factory=dict)   # every column we did not map, kept verbatim

    @field_validator("discipline", mode="before")
    @classmethod
    def _disc(cls, v):
        if isinstance(v, Discipline):
            return v
        return str(v).strip().lower() if v else "unknown"


class TerminologyVariant(BaseModel):
    """Terminology_Variants tab. Feeds normalizer + matcher hints, not the prompt wholesale."""
    variant_id: str
    reported_phrase: str
    canonical_term: str
    default_activity_id: str | None = None
    variation_type: str | None = None
    reliability: str | None = None
    note: str | None = None


# ─────────────────────────── API request/response ───────────────────────────
class IngestTextRequest(BaseModel):
    project_id: str = Field(..., examples=["PRJ-001"])
    text: str = Field(..., min_length=1, examples=["24-inch header spool erected near Rack 3."])
    timestamp: datetime | None = None
    source_name: str | None = Field(None, examples=["DPR-30-Aug"])


class ExtractRequest(BaseModel):
    source_id: str = Field(..., examples=["SRC-001"])


class RawExtractRequest(BaseModel):
    project_id: str = Field(..., examples=["PRJ-001"])
    text: str = Field(..., min_length=1, examples=["P104 24-inch spool erected at Rack-3."])
    event_timestamp: datetime | None = None


class ScheduleImportResponse(BaseModel):
    project_id: str
    activities_imported: int
    variants_imported: int = 0
    sheets_seen: list[str] = Field(default_factory=list)
    columns_seen: list[str] = Field(default_factory=list)
    unmapped_columns: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class EvidenceResponse(BaseModel):
    """Answers the jury question: where did this progress update come from?"""
    event: ExecutionEvent
    source: CapturedSource
    normalized_text: str | None = None
    audit_trail: list[dict] = Field(default_factory=list)


class LoginRequest(BaseModel):
    username: str = Field(..., examples=["planner"])
    password: str = Field(..., examples=["planner123"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    username: str


class HealthResponse(BaseModel):
    status: str
    database: str
    ocr_model: str
    reasoning_model: str
    nvidia_key_present: bool
    activities_loaded: int
    prompt_version: str
