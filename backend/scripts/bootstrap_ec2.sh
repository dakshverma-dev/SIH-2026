#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created backend/.env from backend/.env.example. Edit NVIDIA_API_KEY, JWT_SECRET and CORS_ORIGINS before exposing it."
else
  echo "Using existing backend/.env. Not overwriting it."
fi

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

.venv/bin/python scripts/seed_users.py
.venv/bin/python - <<'PY'
from pathlib import Path

from app.db import SessionLocal, init_db
from app.pipeline import import_schedule

init_db()
db = SessionLocal()
try:
    result = import_schedule(db, Path("../data/ontology.xlsx"), "PRJ-001", actor="deploy")
    print(result)
finally:
    db.close()
PY

cat <<EOF

Backend bootstrap complete.

Run locally:
  cd $BACKEND_DIR
  .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8107

Health:
  curl http://127.0.0.1:8107/api/v1/health
EOF
