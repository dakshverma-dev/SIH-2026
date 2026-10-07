"""Adapter for Preethy's workbook. Nothing here guesses: every alias below was read off
the real file (data/ontology.xlsx).

Layout facts, verified 2026-08-31:
  * 2-3 title/blank rows sit above the real header, and the count differs per tab,
    so the header row is sniffed by looking for activity_id / variant_id / case_id
  * Schedule_Activities is AUTHORITATIVE for activity_id.  Activity_Register is an
    earlier draft that reuses PIP-325/326/327 for different work; Benchmark_Events
    agrees with Schedule_Activities, so the register only contributes wbs_code /
    duration_days / predecessors, never identity.
  * two Benchmark_Events rows are shifted one column left (rationale sits in test_split)
  * predecessor_ids holds prose too ("Approved IFC drawing") -> kept as notes
Unknown columns are never dropped; they land in ScheduleActivity.meta.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

from .schemas import Discipline, Identifiers, ScheduleActivity, Status, TerminologyVariant

# any tab whose header row contains one of these is a real header row
_HEADER_MARKERS = {"activity_id", "variant_id", "case_id", "wbs_level", "wbs_code"}
ID_RE = re.compile(r"^[A-Z]{2,4}-\d{2,4}$")

_STATUS_MAP = {
    "not started": Status.not_started, "in progress": Status.in_progress,
    "completed": Status.completed, "complete": Status.completed,
    "started": Status.started, "blocked": Status.blocked, "delayed": Status.delayed,
}

# Columns we understand. Anything else -> meta. Lowercased/stripped on both sides.
_ACTIVITY_ALIASES = {
    "activity_id": "activity_id", "id": "activity_id",
    "canonical_activity": "activity_name", "schedule_activity": "activity_name",
    "activity_name": "activity_name", "description": "activity_name",
    "l5": "l5", "l6": "l6", "discipline": "discipline",
    "activity_type": "activity_type", "asset_tag": "asset_tag",
    "location": "location", "size": "size",
    "schedule_status": "schedule_status", "status": "schedule_status",
    "wbs_code": "wbs_id", "wbs_id": "wbs_id",
    "duration_days": "duration_days", "duration": "duration_days",
    "predecessor_ids": "predecessors", "predecessors": "predecessors",
    "successor_ids": "successors", "successors": "successors",
    "planned_start": "planned_start", "planned_finish": "planned_finish",
}


def _read(path: Path, sheet: str) -> pd.DataFrame:
    """Header row is sniffed, not assumed -- title/subtitle/blank rows above it vary per tab."""
    probe = pd.read_excel(path, sheet_name=sheet, header=None, nrows=12)
    hdr = 0
    for i, row in probe.iterrows():
        cells = [str(v).strip().lower() for v in row.tolist() if str(v) != "nan"]
        if any(c in _HEADER_MARKERS for c in cells):
            hdr = i
            break
    df = pd.read_excel(path, sheet_name=sheet, header=hdr).dropna(how="all")
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _s(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def _split_refs(v: Any) -> tuple[list[str], list[str]]:
    """'PIP-322, PIP-323' -> ids;  'Approved IFC drawing' -> notes."""
    raw = _s(v)
    if not raw:
        return [], []
    ids, notes = [], []
    for part in re.split(r"[,;/]| and ", raw):
        p = part.strip()
        if not p:
            continue
        (ids if ID_RE.match(p.upper()) else notes).append(p)
    return ids, notes


def _discipline(v: Any) -> Discipline:
    s = (_s(v) or "unknown").lower()
    try:
        return Discipline(s)
    except ValueError:
        return Discipline.unknown


def load_activities(path: Path, project_id: str) -> tuple[list[ScheduleActivity], dict]:
    """Schedule_Activities (identity) enriched with Activity_Register + Realistic_WBS."""
    report: dict[str, Any] = {"sheets_seen": [], "columns_seen": [], "unmapped_columns": [], "warnings": []}
    xl = pd.ExcelFile(path)
    report["sheets_seen"] = list(xl.sheet_names)

    master = _read(path, "Schedule_Activities")
    report["columns_seen"] = list(master.columns)
    unmapped = [c for c in master.columns if c.lower() not in _ACTIVITY_ALIASES]
    report["unmapped_columns"] = unmapped

    # --- enrichment tables, keyed by activity_id ---
    reg: dict[str, dict] = {}
    if "Activity_Register" in xl.sheet_names:
        r = _read(path, "Activity_Register")
        for _, row in r.iterrows():
            aid = _s(row.get("activity_id"))
            if not aid:
                continue
            pre_ids, pre_notes = _split_refs(row.get("predecessor_ids"))
            suc_ids, _ = _split_refs(row.get("successor_ids"))
            reg[aid] = {
                "wbs_id": _s(row.get("wbs_code")),
                "duration_days": pd.to_numeric(row.get("duration_days"), errors="coerce"),
                "predecessors": pre_ids, "successors": suc_ids,
                "predecessor_notes": pre_notes,
                "register_activity": _s(row.get("schedule_activity")),
                "control_note": _s(row.get("control_note")),
            }

    wbs_path: dict[str, str] = {}
    if "Realistic_WBS" in xl.sheet_names:
        w = _read(path, "Realistic_WBS")
        elem = {_s(r.get("wbs_code")): _s(r.get("wbs_element")) for _, r in w.iterrows()}
        parent = {_s(r.get("wbs_code")): _s(r.get("parent_wbs_code")) for _, r in w.iterrows()}
        for code in [c for c in elem if c]:
            chain, cur, guard = [], code, 0
            while cur and cur in elem and guard < 12:
                chain.append(elem[cur]); cur = parent.get(cur); guard += 1
            wbs_path[code] = " > ".join(reversed(chain))

    out: list[ScheduleActivity] = []
    for _, row in master.iterrows():
        aid = _s(row.get("activity_id"))
        if not aid:
            continue
        extra = reg.get(aid, {})
        meta = {c: _s(row.get(c)) for c in unmapped if _s(row.get(c))}
        # Register drifted from master on identity? Then its wbs/duration/logic describes
        # DIFFERENT work -- enriching from it would attach the wrong WBS path. Drop it.
        rn = extra.get("register_activity")
        mn = (_s(row.get("canonical_activity")) or "").lower()
        if rn and rn.lower().split(" - ")[0] not in mn and mn.split()[0] not in rn.lower():
            report["warnings"].append(
                f"{aid}: Activity_Register says '{rn}' but Schedule_Activities says "
                f"'{_s(row.get('canonical_activity'))}' -- master wins, register enrichment dropped"
            )
            meta["register_conflict"] = rn
            extra = {}
        for k in ("predecessor_notes", "register_activity", "control_note"):
            if extra.get(k):
                meta[k] = extra[k]
        wid = extra.get("wbs_id")

        dur = extra.get("duration_days")
        out.append(ScheduleActivity(
            activity_id=aid, project_id=project_id,
            activity_name=_s(row.get("canonical_activity")) or aid,
            level="L6", l5=_s(row.get("L5")), l6=_s(row.get("L6")),
            wbs_id=wid, wbs_path=wbs_path.get(wid or ""),
            discipline=_discipline(row.get("discipline")),
            activity_type=_s(row.get("activity_type")),
            location=_s(row.get("location")),
            duration_days=None if dur is None or pd.isna(dur) else float(dur),
            predecessors=extra.get("predecessors", []),
            successors=extra.get("successors", []),
            schedule_status=_STATUS_MAP.get((_s(row.get("schedule_status")) or "").lower(), Status.unknown),
            identifiers=Identifiers(asset_tag=_s(row.get("asset_tag")), size=_s(row.get("size"))),
            meta=meta,
        ))
    return out, report


def load_variants(path: Path) -> list[TerminologyVariant]:
    df = _read(path, "Terminology_Variants")
    out = []
    for _, row in df.iterrows():
        vid = _s(row.get("variant_id"))
        phrase = _s(row.get("reported_phrase"))
        if not vid or not phrase:
            continue
        out.append(TerminologyVariant(
            variant_id=vid, reported_phrase=phrase,
            canonical_term=_s(row.get("canonical_term")) or phrase,
            default_activity_id=_s(row.get("default_activity_id")),
            variation_type=_s(row.get("variation_type")),
            reliability=_s(row.get("reliability")),
            note=_s(row.get("domain_note")),
        ))
    return out


def normalization_rules(variants: list[TerminologyVariant]) -> list[tuple[str, str]]:
    """Variants with NO default_activity_id are pure surface-form fixes (V040-V045:
    'rack three'->'Rack 3', 'P-104'->'P104', '24"'->'24 in'). Deterministic, no LLM.
    Longest phrase first so 'P 104' cannot be half-eaten by a shorter rule."""
    rules = [
        (v.reported_phrase, v.canonical_term)
        for v in variants
        if not v.default_activity_id and v.reported_phrase.lower() != v.canonical_term.lower()
    ]
    return sorted(rules, key=lambda r: -len(r[0]))


def load_benchmark(path: Path) -> list[dict]:
    """Benchmark_Events. Two rows are shifted one column left (domain_rationale landed in
    test_split); repaired by checking the split value against the known vocabulary."""
    df = _read(path, "Benchmark_Events")
    rows = []
    for _, r in df.iterrows():
        cid = _s(r.get("case_id"))
        report = _s(r.get("field_report"))
        if not cid or not report:
            continue
        split = _s(r.get("test_split"))
        rationale = _s(r.get("domain_rationale"))
        if split and split not in ("Train", "Test"):
            rationale, split = split, "Train"      # shifted row: recover both fields
        rows.append({
            "case_id": cid,
            "case_type": _s(r.get("case_type")),
            "field_report": report,
            "expected_activity_id": _s(r.get("expected_activity_id")),
            "expected_decision": (_s(r.get("expected_decision")) or "REVIEW").upper(),
            "difficulty": _s(r.get("difficulty")),
            "test_split": split or "Train",
            "domain_rationale": rationale,
        })
    return rows


def load_conflict_cases(path: Path) -> list[dict]:
    df = _read(path, "Conflict_Cases")
    rows = []
    for _, r in df.iterrows():
        cid = _s(r.get("case_id"))
        if not cid:
            continue
        rows.append({
            "case_id": cid,
            "activity_id": _s(r.get("activity_id")),
            "earlier_report": _s(r.get("earlier_report")),
            "later_report": _s(r.get("later_report")),
            "expected_conflict_type": _s(r.get("expected_conflict_type")),
            "expected_action": _s(r.get("expected_action")),
            "domain_rationale": _s(r.get("domain_rationale")),
        })
    return rows
