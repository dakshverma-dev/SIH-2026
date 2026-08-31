"""Offline checks -- no NVIDIA key, no network. The model is faked so that a failure here
means OUR logic broke, not that NVIDIA rate-limited us at 2am.

    pytest -q
"""
import json
import sys
from datetime import date, datetime
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import agents, ontology, parsers, rules            # noqa: E402
from app.config import settings                             # noqa: E402
from app.schemas import (                                    # noqa: E402
    ConflictAction, ConflictType, ExecutionEvent, ExtractedEvent, Identifiers, Status,
    TrustDecision,
)


def ev(desc, evidence, conf=0.95, **kw):
    return ExtractedEvent(activity_description=desc, evidence=evidence,
                          extraction_confidence=conf, **kw)


def stored(e, eid="EVT-OLD"):
    return ExecutionEvent(**e.model_dump(), event_id=eid, project_id="PRJ-001",
                          source_id="SRC-001", model_used="fake",
                          extracted_at=datetime.now())


# ─────────────────── json salvage ───────────────────
@pytest.mark.parametrize("raw,expect", [
    ('{"a":1}', {"a": 1}),
    ('```json\n{"a":1}\n```', {"a": 1}),
    ('Sure! {"a":1} hope this helps', {"a": 1}),
])
def test_salvage_json(raw, expect):
    assert agents.salvage_json(raw) == expect


def test_salvage_json_rejects_garbage():
    with pytest.raises(ValueError):
        agents.salvage_json("no json at all")


# ─────────────────── normalizer (Terminology_Variants V040-V045) ───────────────────
@pytest.mark.parametrize("raw,must_contain", [
    ("P-104 spoll ercted R-3 today.", ["P104", "Rack 3"]),
    ("The twenty-four inch header near rack three is now in place.", ["24 in", "Rack 3"]),
    ('P 104 24" spool erected.', ["P104", "24 in"]),
])
def test_normalizer(raw, must_contain):
    out, applied = rules.normalize_text(raw)
    assert applied, "expected at least one ontology rule to fire"
    for token in must_contain:
        assert token in out


# ─────────────────── validator: hallucination detection ───────────────────
def test_identifier_not_in_evidence_is_flagged():
    warns = rules.validate_event(
        ev("erection", "Rack 3 piping erection started.", identifiers=Identifiers(asset_tag="P104")))
    assert any(w.startswith("unverified_identifier") for w in warns)


def test_digit_in_location_is_not_progress_evidence():
    warns = rules.validate_event(
        ev("erection", "Rack 3 piping erection started.", progress_percent=60))
    assert "progress_not_supported_by_evidence" in warns


def test_explicit_percent_passes():
    warns = rules.validate_event(
        ev("erection", "P104 erection at Rack 3 is 60% complete.", progress_percent=60,
           location="Rack 3", identifiers=Identifiers(asset_tag="P104")))
    assert warns == []


# ─────────────────── conflict detector: all 10 Conflict_Cases ───────────────────
P = lambda t="P104": Identifiers(asset_tag=t)  # noqa: E731

CONFLICT_CASES = [
    ("PROGRESS_REGRESSION", ConflictAction.flag,
     ev("piping spool erection", "P104 erection at Rack 3 is 60% complete.", progress_percent=60,
        location="Rack 3", status=Status.in_progress, identifiers=P()),
     ev("piping spool erection", "P104 erection at Rack 3 is 45% complete.", progress_percent=45,
        location="Rack 3", status=Status.in_progress, identifiers=P())),
    ("COMPLETION_REGRESSION", ConflictAction.flag,
     ev("piping spool erection", "P104 erection at Rack 3 completed yesterday.",
        progress_percent=100, location="Rack 3", status=Status.completed, identifiers=P()),
     ev("piping spool erection", "P104 erection at Rack 3 is 70% complete today.",
        progress_percent=70, location="Rack 3", status=Status.in_progress, identifiers=P())),
    ("STATUS_CONTRADICTION", ConflictAction.flag,
     ev("piping spool erection", "P104 erection started this morning at Rack 3.",
        location="Rack 3", status=Status.started, identifiers=P()),
     ev("piping spool erection", "P104 erection has not started at Rack 3.",
        location="Rack 3", status=Status.not_started, identifiers=P())),
    ("DATE_STATUS_CONFLICT", ConflictAction.flag,
     ev("hydrostatic testing", "P104 hydrotest completed successfully.", progress_percent=100,
        status=Status.completed, identifiers=P()),
     ev("hydrostatic testing", "P104 hydrotest is scheduled for tomorrow.",
        status=Status.not_started, identifiers=P())),
    ("DUPLICATE_REPORT", ConflictAction.deduplicate,
     ev("cable pulling", "Cable pulling in Substation B is 80% complete.", progress_percent=80,
        location="Substation B"),
     ev("cable pulling", "Cable pulling in Substation B is 80% complete.", progress_percent=80,
        location="Substation B")),
    ("LOCATION_CONFLICT", ConflictAction.review,
     ev("piping spool erection", "P104 spool erected at Rack 3.", progress_percent=100,
        location="Rack 3", status=Status.completed, identifiers=P()),
     ev("piping spool erection", "P104 spool erected at Rack 4.", progress_percent=100,
        location="Rack 4", status=Status.completed, identifiers=P())),
    ("DATE_CONFLICT", ConflictAction.review,
     ev("piping spool erection", "P104 erection started on 27 Aug.", status=Status.started,
        event_date=date(2026, 8, 27), identifiers=P()),
     ev("piping spool erection", "P104 erection started on 29 Aug.", status=Status.started,
        event_date=date(2026, 8, 29), identifiers=P())),
    ("COMPLETION_REOPENED", ConflictAction.flag,
     ev("foundation excavation", "T201 foundation excavation completed.", progress_percent=100,
        status=Status.completed, identifiers=P("T201")),
     ev("foundation excavation", "T201 foundation excavation resumed today.",
        status=Status.in_progress, identifiers=P("T201"))),
    ("VALID_PROGRESSION", ConflictAction.accept,
     ev("pipe support installation", "Three of five P104 supports installed.",
        progress_percent=60, identifiers=P()),
     ev("pipe support installation", "Four of five P104 supports installed.",
        progress_percent=80, identifiers=P())),
    ("VALID_TRANSITION", ConflictAction.accept,
     ev("flange bolting", "P104 bolt-up started at Rack 3.", location="Rack 3",
        status=Status.started, identifiers=P()),
     ev("flange bolting", "P104 bolt-up completed at Rack 3.", progress_percent=100,
        location="Rack 3", status=Status.completed, identifiers=P())),
]


@pytest.mark.parametrize("expected_type,expected_action,earlier,later",
                         CONFLICT_CASES, ids=[c[0] for c in CONFLICT_CASES])
def test_conflict_cases(expected_type, expected_action, earlier, later):
    found = rules.detect_conflicts(later, [stored(earlier)])
    types = {c.conflict_type.value: c.action for c in found}
    assert expected_type in types, f"expected {expected_type}, got {list(types)}"
    assert types[expected_type] == expected_action


def test_valid_progression_is_not_flagged():
    """The 'do not cry wolf' guarantee: normal progress must never produce a FLAG."""
    _, _, earlier, later = CONFLICT_CASES[8]
    found = rules.detect_conflicts(later, [stored(earlier)])
    assert not any(c.action == ConflictAction.flag for c in found)


def test_unrelated_work_does_not_pair():
    civil = ev("foundation excavation", "T201 excavation started.", identifiers=P("T201"))
    piping = ev("piping spool erection", "P104 spool erected.", identifiers=P())
    assert rules.detect_conflicts(piping, [stored(civil)]) == []


# ─────────────────── trust gate ───────────────────
def _trust(e, spans=1):
    warns = rules.validate_event(e)
    return rules.decide_trust(e, warns, [], spans)[0]


def test_clean_event_auto_posts():
    e = ev("piping spool erection", "P104 24-inch spool erected at Rack-3.", 0.95,
           location="Rack 3", progress_percent=100, status=Status.completed,
           identifiers=Identifiers(asset_tag="P104", size="24 in"))
    assert _trust(e) is TrustDecision.match


def test_missing_asset_goes_to_review():
    """Benchmark B016: 'Rack 3 piping erection started.' -> REVIEW"""
    e = ev("piping erection", "Rack 3 piping erection started.", 0.72,
           location="Rack 3", status=Status.started)
    assert _trust(e) is TrustDecision.review


def test_low_confidence_goes_unmatched():
    e = ev("painting", "P208 painting completed in Tank Farm.", 0.4,
           location="Tank Farm", identifiers=Identifiers(asset_tag="P208"))
    assert _trust(e) is TrustDecision.unmatched


def test_multiple_activities_go_to_review():
    """Benchmark B030 mixed update -> REVIEW, never a silent single event."""
    e = ev("pipe support installation",
           "P104 supports are complete and spool erection started at Rack 3.", 0.88,
           location="Rack 3", identifiers=Identifiers(asset_tag="P104"))
    assert _trust(e, spans=2) is TrustDecision.review


def test_flagged_conflict_forces_review():
    e = ev("piping spool erection", "P104 erection at Rack 3 is 45% complete.", 0.97,
           location="Rack 3", progress_percent=45, identifiers=Identifiers(asset_tag="P104"))
    conflicts = rules.detect_conflicts(e, [stored(CONFLICT_CASES[0][2])])
    trust, reasons = rules.decide_trust(e, rules.validate_event(e), conflicts, 1)
    assert trust is TrustDecision.review
    assert any("PROGRESS_REGRESSION" in r for r in reasons)


# ─────────────────── ontology adapter ───────────────────
@pytest.fixture(scope="module")
def onto():
    p = settings.ontology_path
    if not p.exists():
        pytest.skip("ontology workbook not present")
    return p


def test_activities_load_with_authoritative_ids(onto):
    acts, report = ontology.load_activities(onto, "PRJ-001")
    by_id = {a.activity_id: a for a in acts}
    assert len(acts) == 15
    # Benchmark_Events is the tie-breaker: PIP-325 is the Rack 4 near-duplicate,
    # PIP-327 is weld inspection. Activity_Register disagrees and must lose.
    assert by_id["PIP-325"].location == "Rack 4"
    assert "Inspect" in by_id["PIP-327"].activity_name
    assert by_id["PIP-327"].discipline.value == "quality"
    assert any("PIP-325" in w for w in report["warnings"])


def test_unknown_columns_are_preserved_not_dropped(onto):
    acts, report = ontology.load_activities(onto, "PRJ-001")
    assert "domain_note" in report["unmapped_columns"]
    assert any("domain_note" in a.meta for a in acts)


def test_wbs_path_is_chained(onto):
    acts, _ = ontology.load_activities(onto, "PRJ-001")
    p324 = next(a for a in acts if a.activity_id == "PIP-324")
    assert p324.wbs_path and p324.wbs_path.count(">") == 5
    assert p324.predecessors == ["PIP-322", "PIP-323"]


def test_benchmark_shifted_rows_are_repaired(onto):
    rows = {r["case_id"]: r for r in ontology.load_benchmark(onto)}
    assert len(rows) == 30
    for cid in ("B003", "B004"):
        assert rows[cid]["test_split"] in ("Train", "Test")
    assert {r["expected_decision"] for r in rows.values()} == {"MATCH", "REVIEW", "UNMATCHED"}


def test_normalization_rules_come_from_variants_without_activity(onto):
    rulz = dict(ontology.normalization_rules(ontology.load_variants(onto)))
    assert rulz["R-3"] == "Rack 3"
    assert rulz["P-104"] == "P104"


# ─────────────────── parsers ───────────────────
def test_excel_rows_become_sentences(tmp_path):
    import pandas as pd
    f = tmp_path / "dpr.xlsx"
    pd.DataFrame([
        {"Asset Tag": "P104", "Work Description": "spool erection",
         "Work Area": "Rack 3", "% Complete": 100, "Remarks": "completed today"},
        {"Asset Tag": None, "Work Description": None, "Work Area": "Rack 9", "Remarks": "junk"},
    ]).to_excel(f, index=False)
    rows, unmapped, warns = parsers.parse_table(f.read_bytes(), "dpr.xlsx")
    assert len(rows) == 1                      # junk row skipped, not fatal
    assert "100%" in rows[0]["sentence"]       # not "100.0%"
    assert any("skipped" in w for w in warns)


def test_corrupt_table_raises_valueerror():
    with pytest.raises(ValueError):
        parsers.parse_table(b"not an excel file", "broken.xlsx")


# ─────────────────── segmenter guard (no network) ───────────────────
def test_single_short_sentence_skips_the_model(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("segmenter must not call the model for one short sentence")
    monkeypatch.setattr(agents, "_chat", boom)
    assert agents.segment("P104 spool erected at Rack 3.") == ["P104 spool erected at Rack 3."]


def test_extractor_repairs_bad_json_once(monkeypatch):
    calls = {"n": 0}

    def fake_chat(model, messages, temperature):
        calls["n"] += 1
        if calls["n"] == 1:
            return "here you go: {broken json,,,"
        return json.dumps({
            "activity_description": "piping spool erection", "discipline": "piping",
            "location": "Rack 3", "progress_percent": 100, "event_date": None,
            "status": "completed", "identifiers": {"asset_tag": "P104", "other": {}},
            "quantities": [], "evidence": "P104 spool erected at Rack 3.",
            "extraction_confidence": 0.94, "warnings": [],
        })

    monkeypatch.setattr(agents, "_chat", fake_chat)
    out = agents.extract_event("P104 spool erected at Rack 3.")
    assert calls["n"] == 2, "expected exactly one repair round-trip"
    assert out.identifiers.asset_tag == "P104"


def test_extractor_gives_up_cleanly(monkeypatch):
    monkeypatch.setattr(agents, "_chat", lambda *a, **k: "still not json")
    with pytest.raises(agents.ExtractionError):
        agents.extract_event("P104 spool erected.")


def test_one_bad_span_does_not_kill_the_batch(monkeypatch):
    good = json.dumps({
        "activity_description": "pipe support installation", "discipline": "piping",
        "location": "Rack 3", "progress_percent": 100, "event_date": None,
        "status": "completed", "identifiers": {"asset_tag": "P104", "other": {}},
        "quantities": [], "evidence": "P104 supports complete at Rack 3.",
        "extraction_confidence": 0.9, "warnings": [],
    })
    state = {"n": 0}

    def fake_chat(model, messages, temperature):
        state["n"] += 1
        if state["n"] == 1:
            return json.dumps({"spans": ["P104 supports complete at Rack 3.",
                                         "spool erection started at Rack 3."]})
        return good if state["n"] == 2 else "garbage"

    monkeypatch.setattr(agents, "_chat", fake_chat)
    events, failures, trace = agents.extract_events(
        "P104 supports complete at Rack 3. Spool erection started at Rack 3.")
    assert len(events) == 1 and len(failures) == 1
    assert trace["segmenter"]["spans"] == 2


# ─────────────────── v3 regressions (found by the Train benchmark) ───────────────────
def test_hyphenated_location_is_normalised():
    """Benchmark writes 'Rack-3'; the ontology only lists 'R-3'."""
    out, applied = rules.normalize_text("P104 24-inch spool erected at Rack-3.")
    assert "Rack 3" in out and applied


def test_canonicalised_location_is_not_a_hallucination(onto):
    """B026: model maps 'in the yard' -> 'Fabrication Yard'. That is correct, not invented."""
    rules.known_locations.cache_clear()
    e = ev("piping spool fabrication", "P104 spool fabrication completed in the yard.", 0.92,
           location="Fabrication Yard", progress_percent=100,
           identifiers=Identifiers(asset_tag="P104"))
    assert rules.validate_event(e) == []


def test_invented_location_is_still_flagged(onto):
    rules.known_locations.cache_clear()
    e = ev("erection", "work at Rack 3.", 0.9, location="Atlantis",
           identifiers=Identifiers(asset_tag="P104"))
    assert any(w.startswith("location_not_in_evidence_or_schedule") for w in rules.validate_event(e))


@pytest.mark.parametrize("evidence", [
    "P104 spool delivered to the Rack 3 workfront.",      # B007: movement activity
    "T201 foundation casting finished today.",            # B013: regional terminology
    "The 24 in header near Rack 3 is now in place.",      # B006: natural language
])
def test_discipline_specific_completion_verbs(evidence):
    """100% progress on a completion verb must not be called unsupported just because the
    verb is not the word 'completed'."""
    e = ev("work", evidence, 0.9, progress_percent=100,
           identifiers=Identifiers(asset_tag="P104"))
    assert "progress_not_supported_by_evidence" not in rules.validate_event(e)


# ─────────────────── activity pairing (Conflict_Cases C004 + V034/V035) ───────────────────
@pytest.mark.parametrize("desc_a,desc_b,expected,why", [
    ("hydrostatic test", "hydrotest", True, "C004: morphology must still pair"),
    ("foundation concrete pour", "foundation casting", True, "V034/V035 both -> CIV-113"),
    ("spool erected", "line erection", True, "V001/V003 both -> PIP-324"),
    ("piping spool erection", "pipe support installation", False, "PIP-324 vs PIP-322"),
    ("cable pulling", "cable termination", False, "ELE-341 vs ELE-342"),
    ("piping spool erection", "hydrostatic testing", False, "PIP-324 vs PIP-326"),
    ("piping spool erection", "foundation excavation", False, "cross-discipline"),
])
def test_activity_pairing(onto, desc_a, desc_b, expected, why):
    rules._variant_index.cache_clear()
    assert rules.same_work(ev(desc_a, "e", identifiers=Identifiers(asset_tag="P104")),
                           ev(desc_b, "e", identifiers=Identifiers(asset_tag="P104"))) is expected, why


def test_variant_index_is_actually_populated(onto):
    """Guards a silent failure: a bare except once made this return () and every
    ontology-based pairing quietly fell back to word overlap."""
    rules._variant_index.cache_clear()
    assert len(rules._variant_index()) > 30
    assert rules.canonical_activity("foundation casting") == "CIV-113"


@pytest.mark.parametrize("evidence", [
    "P104 spoll ercted at Rack 3 today.",       # B005: typo case, expected MATCH
    "P104 spool erected at Rack 3.",
    "T201 foundation casting finished today.",
])
def test_completion_language_is_typo_tolerant(evidence):
    e = ev("erection", evidence, 0.9, progress_percent=100,
           identifiers=Identifiers(asset_tag="P104"))
    assert "progress_not_supported_by_evidence" not in rules.validate_event(e)


def test_typo_tolerance_does_not_accept_unrelated_words():
    e = ev("erection", "P104 material awaited at Rack 3.", 0.9, progress_percent=100,
           identifiers=Identifiers(asset_tag="P104"))
    assert "progress_not_supported_by_evidence" in rules.validate_event(e)
