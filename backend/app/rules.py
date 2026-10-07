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

import difflib
import logging

from .config import settings
from .ontology import load_activities, load_variants, normalization_rules
from .schemas import (
    ConflictAction, ConflictFinding, ConflictType, ExtractedEvent, Status, TrustDecision,
)

# ─────────────────────────── NORMALIZER ───────────────────────────


@lru_cache(maxsize=1)
def _rules() -> tuple[tuple[str, str], ...]:
    try:
        return tuple(normalization_rules(load_variants(settings.ontology_path)))
    except Exception as e:  # ontology absent -> normalizer no-ops, but say so out loud
        logging.getLogger("plan2reality.rules").warning("normalization rules unavailable: %r", e)
        return ()


# Hyphen variants the ontology does not spell out: it lists "R-3" but the benchmark also
# writes "Rack-3". Mechanical, so it lives in code rather than waiting on a sheet edit.
_HYPHEN_LOC = re.compile(r"\b(Rack|Bay|Row|Grid|Line|Unit|Zone)-(\d+)\b", re.I)


@lru_cache(maxsize=1)
def known_locations() -> frozenset[str]:
    """Locations the schedule actually uses. Mapping "the yard" -> "Fabrication Yard" is a
    correct canonicalisation, so it must not be punished as a hallucination."""
    try:
        acts, _ = load_activities(settings.ontology_path, "ONTOLOGY")
        return frozenset(a.location.lower() for a in acts if a.location)
    except Exception as e:
        logging.getLogger("plan2reality.rules").warning("known_locations unavailable: %r", e)
        return frozenset()


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
# Completion verbs, by discipline. Material-movement activities finish with "delivered" /
# "shifted", not "completed" -- benchmark B007 (PIP-323 is a Material movement activity).
_COMPLETE_WORDS = re.compile(
    r"\b(complete|completed|completion|finished|closed|erected|done|fixed|poured|cast|"
    r"casting|installed|terminated|pulled|tested|cleared|delivered|shifted|moved|"
    r"transported|placed|excavated|welded|glanded|bolted|tightened|commissioned|"
    r"handed over|in place)\b", re.I)


# Past-tense VERBS only. Activity nouns ("erection", "completion", "casting") must stay out:
# "piping erection started" is a start, not a finish, and putting the noun here would make
# every mention of the activity look like completion evidence.
_COMPLETE_VOCAB = tuple(sorted({
    "complete", "completed", "finished", "closed", "erected", "done", "fixed", "poured",
    "installed", "terminated", "pulled", "tested", "cleared", "delivered", "shifted",
    "moved", "transported", "placed", "excavated", "welded", "glanded", "bolted",
    "tightened", "commissioned",
}))


def _says_complete(evidence: str) -> bool:
    """Completion language, typo-tolerant. Benchmark B005 writes 'ercted' for 'erected' and
    is expected to still resolve -- demanding exact spelling from a field report is how you
    manufacture false hallucination flags."""
    if _COMPLETE_WORDS.search(evidence):
        return True
    for tok in re.findall(r"[a-z]{5,}", evidence.lower()):
        if difflib.get_close_matches(tok, _COMPLETE_VOCAB, n=1, cutoff=0.85):
            return True
    return False


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
        complete = _says_complete(ev.evidence)
        if not stated and not complete:
            warns.append("progress_not_supported_by_evidence")
        elif not stated and ev.progress_percent not in (0, 100):
            warns.append("progress_inferred_without_explicit_number")

    if (ev.location and ev.location.lower() not in ev_low
            and ev.location.lower() not in known_locations()):
        warns.append(f"location_not_in_evidence_or_schedule: {ev.location}")

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
    """Tokens truncated to 4 chars so morphology does not break pairing:
    'hydrostatic test' and 'hydrotest' both reduce to {hydr, test} (benchmark C004), and
    'casting'/'cast' or 'testing'/'test' collapse the same way.
    ponytail: crude stemmer, deliberately. Swap in the ontology's canonical_term lookup if
    a real collision shows up -- 4 chars keeps 'pipi'(piping) and 'pipe' distinct, which is
    what we want, and 'cable pulling' vs 'cable termination' still score below threshold."""
    return {w[:4] for w in re.findall(r"[a-z0-9]+", (s or "").lower())
            if len(w) > 3 and w not in _STOP}


@lru_cache(maxsize=1)
def _variant_index() -> tuple[tuple[frozenset, str], ...]:
    """Terminology_Variants -> (prefix-4 token set, default_activity_id), longest first.
    Lets 'foundation casting' (V035) and 'concrete poured' (V034) both resolve to CIV-113,
    which raw token overlap cannot do."""
    try:
        idx = [(frozenset(_tokens(v.reported_phrase)), v.default_activity_id)
               for v in load_variants(settings.ontology_path) if v.default_activity_id]
        return tuple(sorted(((t, a) for t, a in idx if t), key=lambda r: -len(r[0])))
    except Exception as e:
        logging.getLogger("plan2reality.rules").warning("variant index unavailable: %r", e)
        return ()


def canonical_activity(desc: str) -> str | None:
    """Which schedule activity does this wording point at, per Preethy's variant table?
    A hint only -- the matcher decides for real. Used here to pair two reports of the
    same physical work when they use different words."""
    toks = _tokens(desc)
    if not toks:
        return None
    for phrase_toks, activity_id in _variant_index():
        if phrase_toks <= toks:
            return activity_id
    return None


def same_work(a: ExtractedEvent, b: ExtractedEvent) -> bool:
    """Do two events describe the same physical activity? Asset tag must agree; description
    overlap decides the rest. Location is deliberately NOT part of the key -- C006 needs two
    conflicting locations to still pair up."""
    ta, tb = a.identifiers.asset_tag, b.identifiers.asset_tag
    if ta and tb and ta.lower() != tb.lower():
        return False
    ca, cb = (canonical_activity(a.activity_description),
              canonical_activity(b.activity_description))
    if ca and cb:
        return ca == cb          # ontology is more reliable than word overlap
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
