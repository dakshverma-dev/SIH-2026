"""Benchmark runner. Measures ONLY what it actually observes -- no metric is printed that
was not computed from a real model call.

    python scripts/evaluate_extraction.py                 # Train split (tuning)
    python scripts/evaluate_extraction.py --split Test    # held-out, run once you are done
    python scripts/evaluate_extraction.py --conflicts     # Conflict_Cases pairs

Metrics map to PPT slide 7. Activity-matching accuracy and schedule-impact accuracy are NOT
computed here -- they belong to the matcher and CPM owners.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import agents, ontology, rules            # noqa: E402
from app.config import settings                    # noqa: E402
from app.schemas import ExecutionEvent, TrustDecision  # noqa: E402


def _norm(s):
    return (str(s).strip().lower().replace("-", " ").replace("_", " ") if s else None)


def _expected_fields() -> dict[str, dict]:
    """Benchmark_Events has no expected_discipline/location columns, but it does have
    expected_activity_id -- so the answer key for those fields is the schedule activity
    itself. Derived, not invented."""
    acts, _ = ontology.load_activities(settings.ontology_path, "BENCH")
    return {a.activity_id: {"discipline": a.discipline.value, "location": a.location}
            for a in acts}


def run_extraction(split: str, limit: int | None) -> dict:
    cases = [c for c in ontology.load_benchmark(settings.ontology_path)
             if split == "All" or c["test_split"] == split]
    expected = _expected_fields()
    if limit:
        cases = cases[:limit]

    rows, valid_json, hallucinations = [], 0, 0
    t0 = time.perf_counter()

    for c in cases:
        text, _ = rules.normalize_text(c["field_report"])
        rec = {"case_id": c["case_id"], "case_type": c["case_type"],
               "difficulty": c["difficulty"], "report": c["field_report"],
               "expected_decision": c["expected_decision"],
               "expected_activity_id": c["expected_activity_id"]}
        t1 = time.perf_counter()
        try:
            events, failures, _ = agents.extract_events(text)
        except agents.ExtractionError as e:
            rec.update(error=str(e), actual_decision=None)
            rows.append(rec)
            continue
        rec["ms"] = int((time.perf_counter() - t1) * 1000)

        if not events:
            rec.update(error=failures[0]["reason"] if failures else "no events",
                       actual_decision=None)
            rows.append(rec)
            continue

        valid_json += 1
        ev = events[0]
        warns = rules.validate_event(ev)
        conflicts = rules.detect_conflicts(ev, [])
        trust, reasons = rules.decide_trust(ev, warns, conflicts, len(events))
        if any(w.startswith("unverified_identifier") or w.startswith("progress_not_supported")
               for w in warns):
            hallucinations += 1

        want = expected.get(c["expected_activity_id"] or "", {})
        rec["expected_discipline"] = want.get("discipline")
        rec["expected_location"] = want.get("location")
        rec["discipline_ok"] = (want.get("discipline") is None
                                or ev.discipline.value == want["discipline"])
        rec["location_ok"] = (want.get("location") is None or ev.location is None
                              or _norm(ev.location) == _norm(want["location"]))
        rec.update(
            actual_decision=trust.value, trust_reasons=reasons,
            spans=len(events), discipline=ev.discipline.value, location=ev.location,
            progress=ev.progress_percent, status=ev.status.value,
            asset_tag=ev.identifiers.asset_tag, size=ev.identifiers.size,
            confidence=ev.extraction_confidence, warnings=warns,
            activity_description=ev.activity_description,
        )
        rows.append(rec)

    return {"split": split, "cases": rows, "valid_json": valid_json,
            "hallucinations": hallucinations, "total": len(cases),
            "wall_ms": int((time.perf_counter() - t0) * 1000)}


def report_extraction(res: dict) -> None:
    rows, total = res["cases"], res["total"]
    ran = [r for r in rows if r.get("actual_decision")]
    dec_ok = sum(1 for r in ran if r["actual_decision"] == r["expected_decision"])
    with_ms = [r["ms"] for r in rows if r.get("ms")]

    print(f"\n{'='*66}\nEXTRACTION BENCHMARK -- split={res['split']}  "
          f"model={settings.reasoning_model}\n{'='*66}")
    print(f"TOTAL CASES          : {total}")
    print(f"COMPLETED            : {len(ran)}   (failed/no-event: {total - len(ran)})")
    print(f"VALID JSON RATE      : {res['valid_json']}/{total} "
          f"({res['valid_json']/total*100:.0f}%)" if total else "")
    print(f"TRUST DECISION MATCH : {dec_ok}/{len(ran)} "
          f"({dec_ok/len(ran)*100:.0f}%)" if ran else "TRUST DECISION MATCH : n/a")
    print(f"HALLUCINATION FLAGS  : {res['hallucinations']}"
          "   (identifier or progress unsupported by evidence)")
    scored = [r for r in ran if r.get("expected_discipline")]
    if scored:
        d_ok = sum(1 for r in scored if r["discipline_ok"])
        l_ok = sum(1 for r in scored if r["location_ok"])
        print(f"DISCIPLINE ACCURACY  : {d_ok}/{len(scored)} ({d_ok/len(scored)*100:.0f}%)"
              "   vs the schedule activity's own discipline")
        print(f"LOCATION ACCURACY    : {l_ok}/{len(scored)} ({l_ok/len(scored)*100:.0f}%)")
    if with_ms:
        print(f"PROCESSING TIME      : median {sorted(with_ms)[len(with_ms)//2]} ms/report, "
              f"total {res['wall_ms']/1000:.1f}s")

    print("\nDecision confusion (expected -> actual):")
    conf = Counter((r["expected_decision"], r["actual_decision"]) for r in ran)
    for (exp, act), n in sorted(conf.items()):
        mark = " " if exp == act else "!"
        print(f"  {mark} {exp:10s} -> {act:10s}  x{n}")

    bad_fields = [r for r in ran if r.get("expected_discipline")
                  and not (r["discipline_ok"] and r["location_ok"])]
    if bad_fields:
        print("\nField mismatches vs the schedule activity:")
        for r in bad_fields:
            print(f"  {r['case_id']}: {r['report']}")
            if not r["discipline_ok"]:
                print(f"     discipline: got {r['discipline']} want {r['expected_discipline']}")
            if not r["location_ok"]:
                print(f"     location  : got {r['location']} want {r['expected_location']}")

    wrong = [r for r in ran if r["actual_decision"] != r["expected_decision"]]
    if wrong:
        print("\nDisagreements (these are the tuning targets):")
        for r in wrong:
            print(f"  {r['case_id']} [{r['difficulty']}] {r['case_type']}")
            print(f"     report   : {r['report']}")
            print(f"     expected : {r['expected_decision']}   got: {r['actual_decision']}")
            print(f"     reasons  : {r.get('trust_reasons')}")

    failed = [r for r in rows if r.get("error")]
    if failed:
        print("\nFailures:")
        for r in failed:
            print(f"  {r['case_id']}: {r['error']}")
    print("\nNOTE: activity-matching accuracy and schedule-impact accuracy are NOT measured "
          "here.\n      They belong to the matcher and CPM services.")


def run_conflicts() -> dict:
    """Conflict_Cases: extract both reports, then ask the rule engine what it sees."""
    cases = ontology.load_conflict_cases(settings.ontology_path)
    rows = []
    for c in cases:
        rec = {"case_id": c["case_id"],
               "expected_type": c["expected_conflict_type"],
               "expected_action": c["expected_action"]}
        try:
            e_txt, _ = rules.normalize_text(c["earlier_report"])
            l_txt, _ = rules.normalize_text(c["later_report"])
            ref = datetime.now().date()
            earlier = agents.extract_event(e_txt, ref)
            later = agents.extract_event(l_txt, ref)
        except agents.ExtractionError as e:
            rec.update(error=str(e))
            rows.append(rec)
            continue
        prior = ExecutionEvent(**earlier.model_dump(), event_id="EVT-BENCH",
                              project_id="BENCH", source_id="BENCH",
                              model_used=settings.reasoning_model,
                              extracted_at=datetime.now())
        # record what was extracted -- a MISS is undebuggable without it
        for tag, x in (("earlier", earlier), ("later", later)):
            rec[tag] = {"desc": x.activity_description, "status": x.status.value,
                        "pct": x.progress_percent, "date": str(x.event_date),
                        "asset": x.identifiers.asset_tag, "loc": x.location}
        rec["same_work"] = rules.same_work(later, earlier)
        found = rules.detect_conflicts(later, [prior])
        rec["found"] = [{"type": f.conflict_type.value, "action": f.action.value} for f in found]
        rec["type_ok"] = any(f["type"] == rec["expected_type"] for f in rec["found"])
        rec["action_ok"] = any(f["action"] == rec["expected_action"] for f in rec["found"])
        rows.append(rec)
    return {"cases": rows}


def report_conflicts(res: dict) -> None:
    rows = res["cases"]
    ran = [r for r in rows if "found" in r]
    t_ok = sum(1 for r in ran if r["type_ok"])
    a_ok = sum(1 for r in ran if r["action_ok"])
    print(f"\n{'='*66}\nCONFLICT BENCHMARK (Conflict_Cases)\n{'='*66}")
    print(f"TOTAL PAIRS          : {len(rows)}   completed: {len(ran)}")
    if ran:
        print(f"CONFLICT TYPE MATCH  : {t_ok}/{len(ran)} ({t_ok/len(ran)*100:.0f}%)")
        print(f"ACTION MATCH         : {a_ok}/{len(ran)} ({a_ok/len(ran)*100:.0f}%)")
    for r in rows:
        if "error" in r:
            print(f"  ERR  {r['case_id']}: {r['error']}")
        else:
            mark = "OK  " if r["type_ok"] else "MISS"
            print(f"  {mark} {r['case_id']} expected {r['expected_type']}/"
                  f"{r['expected_action']} -> {r['found']}")
            if not r["type_ok"]:
                print(f"        earlier: {r['earlier']}")
                print(f"        later  : {r['later']}   same_work={r['same_work']}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--split", default="Train", choices=["Train", "Test", "All"])
    ap.add_argument("--limit", type=int)
    ap.add_argument("--conflicts", action="store_true", help="run the Conflict_Cases pairs")
    ap.add_argument("--json-out", type=Path, help="write raw per-case results here")
    args = ap.parse_args()

    if not settings.nvidia_api_key or settings.nvidia_api_key.startswith("nvapi-replace"):
        print("NVIDIA_API_KEY is not set in backend/.env -- nothing can be measured.\n"
              "Refusing to print made-up numbers.")
        sys.exit(2)

    res = run_conflicts() if args.conflicts else run_extraction(args.split, args.limit)
    (report_conflicts if args.conflicts else report_extraction)(res)
    if args.json_out:
        args.json_out.write_text(json.dumps(res, indent=2, default=str))
        print(f"\nraw results -> {args.json_out}")


if __name__ == "__main__":
    main()
