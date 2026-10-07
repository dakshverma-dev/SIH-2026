"""SQLAlchemy models. Postgres JSONB for the flexible bits (metadata, identifiers, warnings)
so an unexpected ontology column never needs a migration.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, Float, ForeignKey, Index, String, Text, create_engine, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import settings

# JSONB on Postgres, plain JSON if someone points DATABASE_URL at sqlite for a demo fallback
JSONType = JSONB().with_variant(JSON(), "sqlite")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String(64), primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32))
    full_name: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SourceRow(Base):
    __tablename__ = "captured_sources"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(32), index=True)
    source_type: Mapped[str] = mapped_column(String(16))
    source_name: Mapped[str | None] = mapped_column(String(255))
    raw_content: Mapped[str | None] = mapped_column(Text)
    normalized_text: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    file_path: Mapped[str | None] = mapped_column(String(512))
    submitted_by: Mapped[str | None] = mapped_column(String(64))
    event_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSONType, default=dict)


class EventRow(Base):
    __tablename__ = "execution_events"
    event_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(32), index=True)
    source_id: Mapped[str] = mapped_column(String(32), ForeignKey("captured_sources.id"), index=True)

    activity_description: Mapped[str] = mapped_column(Text)
    discipline: Mapped[str] = mapped_column(String(24), index=True)
    location: Mapped[str | None] = mapped_column(String(128))
    progress_percent: Mapped[float | None] = mapped_column(Float)
    event_date: Mapped[Date | None] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(24))

    identifiers: Mapped[dict] = mapped_column(JSONType, default=dict)
    quantities: Mapped[list] = mapped_column(JSONType, default=list)
    evidence: Mapped[str] = mapped_column(Text)
    extraction_confidence: Mapped[float] = mapped_column(Float)
    warnings: Mapped[list] = mapped_column(JSONType, default=list)

    trust: Mapped[str] = mapped_column(String(16), index=True)
    trust_reasons: Mapped[list] = mapped_column(JSONType, default=list)
    conflicts: Mapped[list] = mapped_column(JSONType, default=list)

    model_used: Mapped[str] = mapped_column(String(96))
    prompt_version: Mapped[str] = mapped_column(String(32))
    agent_trace: Mapped[dict] = mapped_column(JSONType, default=dict)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


Index("ix_events_project_date", EventRow.project_id, EventRow.event_date)
Index("ix_events_project_trust", EventRow.project_id, EventRow.trust)


class ActivityRow(Base):
    __tablename__ = "schedule_activities"
    activity_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    activity_name: Mapped[str] = mapped_column(Text)
    level: Mapped[str | None] = mapped_column(String(8))
    l5: Mapped[str | None] = mapped_column(String(128))
    l6: Mapped[str | None] = mapped_column(String(128))
    wbs_id: Mapped[str | None] = mapped_column(String(64), index=True)
    wbs_path: Mapped[str | None] = mapped_column(Text)
    discipline: Mapped[str] = mapped_column(String(24), index=True)
    activity_type: Mapped[str | None] = mapped_column(String(128))
    location: Mapped[str | None] = mapped_column(String(128))
    planned_start: Mapped[Date | None] = mapped_column(Date)
    planned_finish: Mapped[Date | None] = mapped_column(Date)
    duration_days: Mapped[float | None] = mapped_column(Float)
    predecessors: Mapped[list] = mapped_column(JSONType, default=list)
    successors: Mapped[list] = mapped_column(JSONType, default=list)
    schedule_status: Mapped[str] = mapped_column(String(24), default="unknown")
    identifiers: Mapped[dict] = mapped_column(JSONType, default=dict)
    meta: Mapped[dict] = mapped_column(JSONType, default=dict)


class VariantRow(Base):
    __tablename__ = "terminology_variants"
    variant_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    reported_phrase: Mapped[str] = mapped_column(String(255), index=True)
    canonical_term: Mapped[str] = mapped_column(String(255))
    default_activity_id: Mapped[str | None] = mapped_column(String(32))
    variation_type: Mapped[str | None] = mapped_column(String(64))
    reliability: Mapped[str | None] = mapped_column(String(16))
    note: Mapped[str | None] = mapped_column(Text)


class AuditRow(Base):
    """Append-only. Never UPDATEd, never DELETEd -- that is the whole point."""
    __tablename__ = "audit_ledger"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(32), index=True)
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    action: Mapped[str] = mapped_column(String(48))
    actor: Mapped[str] = mapped_column(String(64), default="system")
    payload: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class MemoryRow(Base):
    """PPT phase 05 Recover & Learn. Written on activity close, read by nobody in the MVP."""
    __tablename__ = "execution_memory"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(32), index=True)
    activity_id: Mapped[str] = mapped_column(String(32), index=True)
    planned_duration: Mapped[float | None] = mapped_column(Float)
    actual_duration: Mapped[float | None] = mapped_column(Float)
    delay_reason: Mapped[str | None] = mapped_column(Text)
    recovery_action: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # Postgres drops idle conns; without this the demo dies at hour 3
    pool_recycle=3600,
    future=True,
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


def init_db() -> None:
    Base.metadata.create_all(engine)


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
