"""Deterministic layer: normalizer, validator, trust gate, conflict detector. No LLM.

Every rule here traces to Preethy's workbook:
  * normalization  -> Terminology_Variants V040-V045 (no default_activity_id)
  * conflicts      -> Conflict_Cases (10 types, 4 actions) verbatim
  * trust          -> Benchmark_Events.expected_decision (MATCH / REVIEW / UNMATCHED)
"""
from __future__ import annotations

import re
from datetime import date
from functools import lru_cache

from .config import settings
from .ontology import load_variants, normalization_rules
from .schemas import (
    ConflictAction, ConflictFinding, ConflictType, ExtractedEvent, Status, TrustDecision,
)

# ─────────────────────────── NORMALIZER ───────────────────────────


@lru_cache(maxsize=1)
def _rules() -> tuple[tuple[str, str], ...]:
    try:
        return tuple(normalization_rules(load_variants(settings.ontology_path)))
    except Exception:      # ontology absent -> normalizer becomes a no-op, never a crash
        return ()


# Hyphen variants the ontology does not spell out: it lists "R-3" but the benchmark also
# writes "Rack-3". Mechanical, so it lives in code rather than waiting on a sheet edit.
_HYPHEN_LOC = re.compile(r"\b(Rack|Bay|Row|Grid|Line|Unit|Zone)-(\d+)\b", re.I)


def normalize_text(text: str) -> tuple[str, list[str]]:
    """Apply surface-form rules. Returns (text, applied). Case-insensitive, word-bounded."""
    applied = []
    fixed = _HYPHEN_LOC.sub(lambda m: f"{m.group(1).title()} {m.group(2)}", text)
    if fixed != text:
        applied.append("hyphenated location -> spaced (Rack-3 -> Rack 3)")
        text = fixed
    for phrase, canon in _rules():
        pat = re.compile(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", re.I)
        if pat.search(text):
            text = pat.sub(canon, text)
            applied.append(f"{phrase} -> {canon}")
    return text, applied


# ─────────────────────────── VALIDATOR ───────────────────────────
# A digit alone is not progress evidence -- "Rack 3" has one. Look for percent, a
# "N of M" fraction, or spelled-out counts.
_PCT = re.compile(r"\d+(?:\.\d+)?\s*(?:%|percent|pct)", re.I)
_FRACTION = re.compile(
    r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:of|out of)\s+"
    r"(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b", re.I)
_COMPLETE_WORDS = re.compile(
    r"\b(complete|completed|completion|finished|closed|erected|done|fixed|poured|cast|"
    r"installed|terminated|pulled|tested|cleared)\b", re.I)


def validate_event(ev: ExtractedEvent) -> list[str]:
    """Cheap hallucination checks. A value the evidence does not contain is not evidence."""
    warns: list[str] = []
    ev_low = ev.evidence.lower()

    for field, value in ev.identifiers.present().items():
        bare = re.sub(r"[\s\-_]", "", str(value)).lower()
        hay = re.sub(r"[\s\-_]", "", ev_low)
        if bare and bare not in hay:
            warns.append(f"unverified_identifier: {field}={value} not found in evidence")

    if ev.progress_percent is not None:
        stated = bool(_PCT.search(ev.evidence) or _FRACTION.search(ev.evidence))
        complete = bool(_COMPLETE_WORDS.search(ev.evidence))
        if not stated and not complete:
            warns.append("progress_not_supported_by_evidence")
        elif not stated and ev.progress_percent not in (0, 100):
            warns.append("progress_inferred_without_explicit_number")

    if ev.location and ev.location.lower() not in ev_low:
        warns.append(f"location_not_verbatim_in_evidence: {ev.location}")

    if ev.status == Status.completed and ev.progress_percent not in (None, 100):
        warns.append(f"status_completed_but_progress={ev.progress_percent}")

    if not ev.identifiers.present():
        warns.append("no_identifier_reported")

    if ev.extraction_confidence < settings.review_min_confidence:
        warns.append("low_confidence")

    return warns


# ─────────────────────────── CONFLICT DETECTOR ───────────────────────────
_STOP = {"the", "and", "for", "with", "near", "from", "into", "work", "works", "activity"}
_FUTURE = re.compile(r"\b(tomorrow|scheduled|will be|plans to|planned for|next week|upcoming)\b", re.I)
_RESUME = re.compile(r"\b(resumed|restarted|reopened|recommenced|continuing again)\b", re.I)
_NOT_STARTED = re.compile(r"\b(not (?:yet )?started|has not started|no work)\b", re.I)

_ACTION = ConflictAction  # local alias for brevity below


def _tokens(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(w) > 3 and w not in _STOP}


def same_work(a: ExtractedEvent, b: ExtractedEvent) -> bool:
    """Do two events describe the same physical activity? Asset tag must agree; description
    overlap decides the rest. Location is deliberately NOT part of the key -- C006 needs two
    conflicting locations to still pair up."""
    ta, tb = a.identifiers.asset_tag, b.identifiers.asset_tag
    if ta and tb and ta.lower() != tb.lower():
        return False
    wa, wb = _tokens(a.activity_description), _tokens(b.activity_description)
    if not wa or not wb:
        return False
    return len(wa & wb) / len(wa | wb) >= 0.34


def detect_conflicts(new: ExtractedEvent, prior: list) -> list[ConflictFinding]:
    """`prior` = earlier ExecutionEvents for the same project, newest first.
    Types and actions are Conflict_Cases verbatim; VALID_* are recorded as ACCEPT so the
    'conflict detection' metric can prove we do not cry wolf on normal progress."""
    out: list[ConflictFinding] = []
    for old in prior:
        if not same_work(new, old):
            continue
        oid = getattr(old, "event_id", None)
        n_txt, o_txt = new.evidence, old.evidence

        if n_txt.strip().lower() == o_txt.strip().lower():
            out.append(ConflictFinding(
                conflict_type=ConflictType.duplicate_report, action=_ACTION.deduplicate,
                detail="identical report already recorded", against_event_id=oid))
            break

        old_done = old.status == Status.completed or old.progress_percent == 100
        new_pct, old_pct = new.progress_percent, old.progress_percent

        if old_done and _RESUME.search(n_txt):
            out.append(ConflictFinding(
                conflict_type=ConflictType.completion_reopened, action=_ACTION.flag,
                detail="work resumed after being reported complete", against_event_id=oid))
        elif old_done and new_pct is not None and new_pct < 100:
            out.append(ConflictFinding(
                conflict_type=ConflictType.completion_regression, action=_ACTION.flag,
                detail=f"was complete, now reports {new_pct}%", against_event_id=oid))
        elif old_done and _FUTURE.search(n_txt):
            out.append(ConflictFinding(
                conflict_type=ConflictType.date_status_conflict, action=_ACTION.flag,
                detail="completion conflicts with a future execution claim", against_event_id=oid))
        elif old.status in (Status.started, Status.in_progress) and (
                new.status == Status.not_started or _NOT_STARTED.search(n_txt)):
            out.append(ConflictFinding(
                conflict_type=ConflictType.status_contradiction, action=_ACTION.flag,
                detail="previously started, now reported as not started", against_event_id=oid))
        elif new_pct is not None and old_pct is not None and new_pct < old_pct:
            out.append(ConflictFinding(
                conflict_type=ConflictType.progress_regression, action=_ACTION.flag,
                detail=f"progress decreased {old_pct}% -> {new_pct}%", against_event_id=oid))
        elif new_pct is not None and old_pct is not None and new_pct > old_pct:
            out.append(ConflictFinding(
                conflict_type=ConflictType.valid_progression, action=_ACTION.accept,
                detail=f"progress increased {old_pct}% -> {new_pct}%", against_event_id=oid))
        elif old.status in (Status.started, Status.in_progress) and new.status == Status.completed:
            out.append(ConflictFinding(
                conflict_type=ConflictType.valid_transition, action=_ACTION.accept,
                detail="start followed by finish", against_event_id=oid))

        if new.location and old.location and new.location.lower() != old.location.lower():
            out.append(ConflictFinding(
                conflict_type=ConflictType.location_conflict, action=_ACTION.review,
                detail=f"same asset reported at {old.location} and {new.location}",
                against_event_id=oid))

        if (new.event_date and old.event_date and new.event_date != old.event_date
                and new.status == old.status == Status.started):
            out.append(ConflictFinding(
                conflict_type=ConflictType.date_conflict, action=_ACTION.review,
                detail=f"two actual-start dates: {old.event_date} and {new.event_date}",
                against_event_id=oid))
        break   # newest matching prior event is the one that governs
    return out


# ─────────────────────────── TRUST GATE ───────────────────────────
def decide_trust(ev: ExtractedEvent, warns: list[str],
                 conflicts: list[ConflictFinding], span_count: int = 1
                 ) -> tuple[TrustDecision, list[str]]:
    """MATCH / REVIEW / UNMATCHED -- PPT slide 3 auto-post / review / unmatched.

    Note this gate decides *trust in the extraction*, not whether a schedule activity was
    found; Daksh's matcher can still downgrade MATCH to UNMATCHED when no candidate scores.
    """
    reasons: list[str] = []

    if any(c.action == ConflictAction.flag for c in conflicts):
        reasons += [f"conflict:{c.conflict_type.value}" for c in conflicts
                    if c.action == ConflictAction.flag]
        return TrustDecision.review, reasons
    if any(c.action == ConflictAction.review for c in conflicts):
        reasons += [f"conflict:{c.conflict_type.value}" for c in conflicts
                    if c.action == ConflictAction.review]
        return TrustDecision.review, reasons

    if span_count > 1:
        # B030 "supports complete and erection started" -> domain answer is REVIEW
        reasons.append("multiple_activities_in_one_report")
        return TrustDecision.review, reasons

    hard = [w for w in warns if w.startswith(("unverified_identifier", "progress_not_supported"))]
    if hard:
        reasons += hard
        return TrustDecision.review, reasons

    if ev.extraction_confidence < settings.review_min_confidence:
        reasons.append(f"confidence_below_{settings.review_min_confidence}")
        return TrustDecision.unmatched, reasons

    if not ev.identifiers.present():
        # ponytail: conservative on purpose. Separating "no asset tag but unambiguous"
        # (benchmark B014, Substation B cable pulling -> MATCH) from "no asset tag and two
        # candidate assets" (B016, Rack 3 piping erection -> REVIEW) needs the schedule
        # candidate set and their action verbs -- that is the matcher's information, not
        # ours. A false MATCH auto-posts wrong progress to a schedule; a false REVIEW costs
        # a planner one click. So we stay upstream and send both to REVIEW.
        reasons.append("no_asset_identifier")
        return TrustDecision.review, reasons

    if ev.extraction_confidence < settings.auto_post_min_confidence:
        reasons.append(f"confidence_below_auto_post_{settings.auto_post_min_confidence}")
        return TrustDecision.review, reasons

    if settings.auto_post_requires_identifier and not (
            ev.identifiers.asset_tag or ev.identifiers.line_id or ev.identifiers.equipment_id):
        reasons.append("no_primary_asset_tag")
        return TrustDecision.review, reasons

    reasons.append("high_confidence_with_verified_identifier")
    return TrustDecision.match, reasons
