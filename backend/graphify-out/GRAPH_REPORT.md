# Graph Report - .  (2026-08-31)

## Corpus Check
- Corpus is ~12,007 words - fits in a single context window. You may not need a graph.

## Summary
- 289 nodes · 621 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13

## God Nodes (most connected - your core abstractions)
1. `User` - 23 edges
2. `ExtractedEvent` - 17 edges
3. `Identifiers` - 15 edges
4. `ev()` - 14 edges
5. `load_activities()` - 13 edges
6. `extract()` - 13 edges
7. `SourceRow` - 12 edges
8. `ExecutionEvent` - 12 edges
9. `ExtractionError` - 10 edges
10. `EventRow` - 10 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `User`  [EXTRACTED]
  scripts/seed_users.py → app/db.py
- `ev()` --calls--> `ExtractedEvent`  [EXTRACTED]
  tests/test_pipeline.py → app/schemas.py
- `stored()` --calls--> `ExecutionEvent`  [EXTRACTED]
  tests/test_pipeline.py → app/schemas.py
- `Plan2Reality Capture & Understand Layer` --references--> `FastAPI 0.121.2`  [INFERRED]
  README.md → requirements.txt
- `Plan2Reality Capture & Understand Layer` --references--> `pytest 9.0.1`  [EXTRACTED]
  README.md → requirements.txt

## Import Cycles
- None detected.

## Communities (14 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (48): ActivityRow, AuditRow, Base, EventRow, get_session(), MemoryRow, datetime, SQLAlchemy models. Postgres JSONB for the flexible bits (metadata, identifiers, (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (26): Identifiers, ev(), Offline checks -- no NVIDIA key, no network. The model is faked so that a failur, The 'do not cry wolf' guarantee: normal progress must never produce a FLAG., Benchmark B016: 'Rack 3 piping erection started.' -> REVIEW, Benchmark B030 mixed update -> REVIEW, never a silent single event., Benchmark writes 'Rack-3'; the ontology only lists 'R-3'., B026: model maps 'in the yard' -> 'Fabrication Yard'. That is correct, not inven (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (22): current_user(), hash_password(), Session, RBAC. Four roles, JWT bearer, bcrypt hashes. Deliberately small -- the demo need, Admin passes everything; otherwise the role must be listed., require_role(), Path, Single source of truth for every tunable. Nothing model-related lives elsewhere. (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (26): decide_trust(), detect_conflicts(), known_locations(), Deterministic layer: normalizer, validator, trust gate, conflict detector. No LL, Do two events describe the same physical activity? Asset tag must agree; descrip, `prior` = earlier ExecutionEvents for the same project, newest first.     Types, MATCH / REVIEW / UNMATCHED -- PPT slide 3 auto-post / review / unmatched.      N, Locations the schedule actually uses. Mapping "the yard" -> "Fabrication Yard" i (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (25): _discipline(), load_activities(), load_benchmark(), load_conflict_cases(), load_variants(), normalization_rules(), Any, DataFrame (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (25): audit(), capture(), extract(), extract_batch(), extract_source(), import_schedule(), _next_id(), normalize() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (25): Audit Ledger, CapturedSource, Critical Path Method (CPM), ExecutionEvent, ExtractedEvent, Extraction Trust, Extractor Agent, Matcher (Daksh) (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (21): _chat(), client(), extract_event(), extract_events(), ExtractionError, The agent layer. Five specialists, fixed sequence, deterministic orchestration., Split into single-activity spans. Cheap guard first: a short single sentence, One span -> one validated ExtractedEvent. One schema-repair round-trip allowed. (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (7): ExecutionEvent, What leaves my service. Daksh's matcher consumes this and nothing else., main(), Benchmark runner. Measures ONLY what it actually observes -- no metric is printe, Conflict_Cases: extract both reports, then ask the rule engine what it sees., run_conflicts(), run_extraction()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (9): _cell(), _norm_cols(), parse_table(), Any, DataFrame, File -> rows. Excel/CSV never go to an LLM as a whole workbook; we read cells an, Build one short natural sentence. Structured cells first, remarks appended verba, Returns (rows, unmapped_columns, warnings). Each row dict has a 'sentence' key. (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (7): Activity_Register, Benchmark_Events, Schedule_Activities, ScheduleActivity, NumPy 2.3.5, openpyxl 3.1.5, pandas 3.0.5

## Knowledge Gaps
- **20 isolated node(s):** `Normalizer Agent`, `Segmenter Agent`, `Validator Agent`, `Evidence-Backed Validation`, `Planner Console (Yash)` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ExtractedEvent` connect `Community 3` to `Community 8`, `Community 0`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `ExecutionEvent` connect `Community 8` to `Community 0`, `Community 1`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `load_activities()` connect `Community 4` to `Community 1`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `Normalizer Agent`, `Segmenter Agent`, `Validator Agent` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10204081632653061 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07862679955703211 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07956989247311828 - nodes in this community are weakly interconnected._