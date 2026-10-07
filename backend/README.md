# Plan2Reality — Capture & Understand layer

SIH26122 · Oil India Limited · Team Seekers
Owner: **Vignesh Reddy Tadasina** — ingestion, APIs, RBAC, audit ledger.

Turns messy field reports into structured **ExecutionEvent** records. Schedule matching,
CPM and prediction are downstream services and are deliberately not implemented here.

```
text / .xlsx / .csv / photo DPR / voice
        │
   CAPTURE ──────────► CapturedSource
        │
   NORMALIZE ────────► NormalizedFieldInput      (OCR only for image/audio/video)
        │              + surface-form rules from Terminology_Variants
   UNDERSTAND ───────► ExecutionEvent[]          (segmenter → extractor)
        │
   VALIDATE + TRUST ─► MATCH / REVIEW / UNMATCHED + conflicts + audit row
        │
        ▼  ExecutionEvent  →  matcher (Daksh) → CPM → planner console (Yash)
```

## Agents

| Agent | Model | Job |
|---|---|---|
| Transcription | `nemotron-3-nano-omni-30b-a3b-reasoning` | image/audio → text. **Only** multimodal input |
| Normalizer | none | `R-3`→`Rack 3`, `P-104`→`P104`, `24"`→`24 in` (ontology V040–V045) |
| Segmenter | `nemotron-3-super-120b-a12b` | one report → N single-activity spans |
| Extractor | `nemotron-3-super-120b-a12b` | one span → `ExtractedEvent` |
| Validator | none | hallucination checks, 10 conflict types, trust gate |

Two of five use no model. That is the point: "evidence-backed validation" means
deterministic checks, not an LLM grading its own output.

## Run

```bash
# once
python3.12 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
sudo -u postgres psql -c "CREATE USER p2r PASSWORD 'p2r_dev' CREATEDB;" \
                     -c "CREATE DATABASE plan2reality OWNER p2r;"
cp backend/.env.example backend/.env    # then put your real NVIDIA_API_KEY in it
cd backend && ../.venv/bin/python scripts/seed_users.py

# serve
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Swagger: <http://localhost:8000/docs> · Health: `/api/v1/health`

Serve on `--host 0.0.0.0` and teammates reach it at `http://<your-lan-ip>:8000/api/v1`.

### Endpoint names

The team contract calls a captured source a **FieldUpdate** and reads it from **`/updates`**.
`CapturedSource` / `/sources` are the same objects under the original names -- both are live,
so neither side had to migrate:

| Team contract | Equivalent |
|---|---|
| `POST /updates` | `POST /ingest/text` |
| `GET /updates` | `GET /sources` |
| `GET /updates/{id}` | `GET /sources/{id}` |

`GET /events?trust=REVIEW` is the planner review queue.

## Smoke test

```bash
TOK=$(curl -s -X POST localhost:8000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"planner","password":"planner123"}' | python -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -s -X POST localhost:8000/api/v1/schedule/import \
  -H "Authorization: Bearer $TOK" -F project_id=PRJ-001

curl -s -X POST localhost:8000/api/v1/extract/raw \
  -H "Authorization: Bearer $TOK" -H 'content-type: application/json' \
  -d '{"project_id":"PRJ-001","text":"P104 24-inch spool erected at Rack-3."}'
```

## Roles

| Role | Password (demo) | Can |
|---|---|---|
| `supervisor` | `supervisor123` | submit sources, extract, read |
| `planner` | `planner123` | everything above + import schedule |
| `manager` | `manager123` | submit, read |
| `admin` | `admin123` | all |

Override with `P2R_<USER>_PASSWORD` before seeding. Passwords are bcrypt-hashed;
`JWT_SECRET` must be changed before anything leaves localhost.

## Measured results

`extract-v6`, temperature 0.0, Train split (14 cases). Reproduce with the commands below;
nothing here is estimated.

| Metric | Result |
|---|---|
| Valid JSON rate | 14/14 (100%) |
| Trust decision match | 13/14 (93%) |
| Discipline accuracy | 14/14 (100%) |
| Location accuracy | 14/14 (100%) |
| Hallucination flags | 0 |
| Conflict type + action | 9/9 completed (100%) |
| Processing time | median 8.5 s/report |
| Repeatability | identical across 3 consecutive runs |

The single decision miss (B014, "Cable pulling in Substation B finished.") is a boundary,
not a defect: `expected_decision` in the sheet pairs with `expected_activity_id`, so it is a
*post-match* answer, while this service emits *pre-match* trust. Telling "no asset tag but
unambiguous" (B014 -> MATCH) from "no asset tag and two candidate assets" (B016 -> REVIEW)
requires the schedule candidate set and their action verbs, which belong to the matcher.
A false MATCH auto-posts wrong progress; a false REVIEW costs one planner click -- so this
gate stays conservative. 93% is the honest ceiling for a pre-match gate scored against a
post-match key.

Not measured here: activity-matching accuracy and schedule-impact accuracy (matcher / CPM).

## Tests & benchmark

```bash
cd backend
../.venv/bin/python -m pytest tests/ -q                          # 38 tests, offline, no API key
../.venv/bin/python scripts/evaluate_extraction.py --split Train \
    --json-out benchmark-out/train.json                          # tuning
../.venv/bin/python scripts/evaluate_extraction.py --split Test  # held out; run once
../.venv/bin/python scripts/evaluate_extraction.py --conflicts   # Conflict_Cases pairs
```

The benchmark refuses to print any metric it did not measure, and exits 2 without an API key.

## Ontology notes (data/ontology.xlsx)

* Header row is **sniffed** per tab, not assumed — the title/blank rows above it vary.
* `Schedule_Activities` is authoritative for `activity_id`. `Activity_Register` reuses
  PIP-325/326/327 for different work; `Benchmark_Events` agrees with the former, so the
  register contributes only `wbs_code`/`duration`/`predecessors`, and is dropped entirely
  for any ID where the two disagree. The import response reports these as warnings.
* Unknown columns are never discarded — they land in `ScheduleActivity.meta`.
* `Benchmark_Events` B003/B004 are shifted one column left; the loader repairs them.

## Boundary

This service never assigns a schedule `activity_id`. `ExecutionEvent.trust` is confidence in
the *extraction*; the matcher may still downgrade `MATCH` to `UNMATCHED` when nothing scores.
