"""Plan2Reality -- Capture & Understand layer (SIH26122, Oil India Limited).

Owns: ingestion, AI extraction, RBAC, audit ledger.
Boundary: emits ExecutionEvent. Schedule matching, CPM and prediction are downstream.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .db import init_db
from .routes import router

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("plan2reality")

DESCRIPTION = """
Turns messy field reports (text, Excel, photographed DPR, voice) into structured,
evidence-backed **ExecutionEvent** records that the matcher can consume directly.

**Two models, two jobs**
* `nemotron-3-nano-omni-30b-a3b-reasoning` -- transcription of images/audio only
* `nemotron-3-super-120b-a12b` -- all reasoning: segmentation and event extraction

Digital text and Excel never touch the OCR model.

**Trust gate** -- every event carries `trust` = `MATCH` / `REVIEW` / `UNMATCHED` plus
`trust_reasons` and any `conflicts`, so nothing updates a schedule unexplained.

**Login for testing:** `POST /api/v1/auth/login` then use *Authorize* above.
Seeded users: `supervisor` / `planner` / `manager` (see scripts/seed_users.py).
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("db ready | reasoning=%s | ocr=%s | temp=%s",
             settings.reasoning_model, settings.ocr_model, settings.extraction_temperature)
    if not settings.nvidia_api_key or settings.nvidia_api_key.startswith("nvapi-replace"):
        log.warning("NVIDIA_API_KEY not set -- ingestion works, extraction will return 502")
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Plan2Reality -- Capture & Understand API",
    version="0.1.0",
    description=DESCRIPTION,
    contact={"name": "Vignesh Reddy Tadasina -- Backend & Security"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    """Log the traceback server-side, return something safe to the frontend."""
    log.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "internal server error"})


@app.get("/", include_in_schema=False)
def root():
    return {"service": "plan2reality-capture-understand", "docs": "/docs"}
