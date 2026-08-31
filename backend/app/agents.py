"""The agent layer. Five specialists, fixed sequence, deterministic orchestration.

  TRANSCRIPTION  Nano Omni    multimodal bytes -> text      (only for image/audio/video)
  NORMALIZER     no LLM       surface-form fixes from the ontology (V040-V045)
  SEGMENTER      Super 120B   one report -> N single-activity spans
  EXTRACTOR      Super 120B   one span -> ExtractedEvent
  VALIDATOR      no LLM       hallucination + conflict rules   (see validator.py)

Two of the five use no model at all, and that is the point: "evidence-backed validation"
means deterministic checks, not an LLM grading its own homework.
"""
from __future__ import annotations

import base64
import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

from openai import APIError, OpenAI
from pydantic import ValidationError

from .config import settings
from .prompts import REPAIR_PROMPT, extraction_messages, segmenter_messages, OCR_SYSTEM
from .schemas import ExtractedEvent

log = logging.getLogger("plan2reality.agents")


class ExtractionError(RuntimeError):
    """Model or schema failure we chose to surface as 502 rather than crash on."""


@lru_cache(maxsize=1)
def client() -> OpenAI:
    if not settings.nvidia_api_key or settings.nvidia_api_key.startswith("nvapi-replace"):
        raise ExtractionError("NVIDIA_API_KEY is not configured")
    return OpenAI(
        base_url=settings.nvidia_base_url,
        api_key=settings.nvidia_api_key,
        timeout=settings.request_timeout,
        max_retries=settings.transport_retries,   # SDK retries 429/5xx only
    )


def _chat(model: str, messages: list[dict], temperature: float) -> str:
    """Returns the FINAL answer only. Reasoning/CoT never leaves this function."""
    try:
        r = client().chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            top_p=0.95,
            max_tokens=settings.max_tokens,
            extra_body={"chat_template_kwargs": {"enable_thinking": settings.enable_thinking}},
            stream=False,
        )
    except APIError as e:
        raise ExtractionError(f"model call failed: {type(e).__name__}") from e
    return (r.choices[0].message.content or "").strip()


_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.S)


def salvage_json(raw: str) -> dict:
    """Models wrap JSON in fences and prose. Strip fences, else take first{..last}."""
    if not raw:
        raise ValueError("empty model response")
    m = _FENCE.search(raw)
    if m:
        raw = m.group(1)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    i, j = raw.find("{"), raw.rfind("}")
    if i == -1 or j <= i:
        raise ValueError("no JSON object found in model response")
    return json.loads(raw[i : j + 1])


# ─────────────────────── TRANSCRIPTION AGENT (Nano Omni) ───────────────────────
def transcribe(data: bytes, mime: str) -> str:
    """Multimodal input -> plain text. The ONLY place the OCR model is ever called."""
    kind = "image_url" if mime.startswith("image/") else "input_audio"
    b64 = base64.b64encode(data).decode()
    if kind == "image_url":
        content = [{"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}]
    else:
        fmt = mime.split("/")[-1].replace("mpeg", "mp3")
        content = [{"type": "input_audio", "input_audio": {"data": b64, "format": fmt}}]
    messages = [
        {"role": "system", "content": OCR_SYSTEM},
        {"role": "user", "content": content},
    ]
    return _chat(settings.ocr_model, messages, settings.ocr_temperature)


# ─────────────────────── SEGMENTER AGENT (Super 120B) ───────────────────────
_SENT = re.compile(r"(?<=[.!?])\s+")


def segment(text: str) -> list[str]:
    """Split into single-activity spans. Cheap guard first: a short single sentence
    cannot contain two activities, so skip the model entirely."""
    stripped = text.strip()
    if len(_SENT.split(stripped)) == 1 and len(stripped) < 200:
        return [stripped]
    try:
        raw = _chat(settings.reasoning_model, segmenter_messages(stripped), 0.0)
        spans = [s.strip() for s in salvage_json(raw).get("spans", []) if str(s).strip()]
    except (ExtractionError, ValueError, KeyError, TypeError) as e:
        log.warning("segmenter fell back to whole text: %s", e)
        return [stripped]
    return spans or [stripped]


# ─────────────────────── EXTRACTOR AGENT (Super 120B) ───────────────────────
def extract_event(span: str, reference_date=None) -> ExtractedEvent:
    """One span -> one validated ExtractedEvent. One schema-repair round-trip allowed."""
    messages = extraction_messages(span, reference_date)
    raw = _chat(settings.reasoning_model, messages, settings.extraction_temperature)
    for attempt in range(settings.schema_repair_retries + 1):
        try:
            return ExtractedEvent(**salvage_json(raw))
        except (ValueError, ValidationError) as e:
            if attempt >= settings.schema_repair_retries:
                raise ExtractionError(f"model returned unusable JSON: {e}") from e
            log.info("schema repair round-trip: %s", e)
            raw = _chat(
                settings.reasoning_model,
                messages + [
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content": REPAIR_PROMPT.format(error=str(e)[:400])},
                ],
                0.0,
            )
    raise ExtractionError("unreachable")


def extract_events(text: str, reference_date=None
                   ) -> tuple[list[ExtractedEvent], list[dict], dict]:
    """Segment then extract each span. One bad span fails alone.
    Returns (events, failures, trace)."""
    t0 = time.perf_counter()
    spans = segment(text)
    t_seg = time.perf_counter()

    # Spans are independent -> extract concurrently. 3 events cost ~1 call of wall clock
    # instead of 3, which matters when an Excel batch has 20 rows.
    events: list[ExtractedEvent] = []
    failures: list[dict] = []
    if len(spans) == 1:
        try:
            events.append(extract_event(spans[0], reference_date))
        except ExtractionError as e:
            failures.append({"span_index": 0, "span": spans[0], "reason": str(e)})
    else:
        with ThreadPoolExecutor(max_workers=min(len(spans), 6)) as pool:
            for i, (span, fut) in enumerate(
                    [(s, pool.submit(extract_event, s, reference_date)) for s in spans]):
                try:
                    events.append(fut.result())
                except ExtractionError as e:
                    failures.append({"span_index": i, "span": span, "reason": str(e)})

    trace = {
        "segmenter": {"model": settings.reasoning_model, "spans": len(spans),
                      "ms": int((t_seg - t0) * 1000)},
        "extractor": {"model": settings.reasoning_model, "calls": len(spans),
                      "ms": int((time.perf_counter() - t_seg) * 1000)},
        "prompt_temperature": settings.extraction_temperature,
    }
    return events, failures, trace
