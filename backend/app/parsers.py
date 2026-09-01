"""File -> rows. Excel/CSV never go to an LLM as a whole workbook; we read cells and turn
each usable row into one short sentence for the extractor.

Column aliases are the DPR-side ones from the brief (Activity/Progress/Location/Date/Remarks).
Preethy's schedule sheet uses a different path entirely -- see ontology.py.
"""
from __future__ import annotations

import io
from typing import Any

import pandas as pd

_ALIASES: dict[str, str] = {
    "activity": "activity", "description": "activity", "work description": "activity",
    "activity description": "activity", "work": "activity", "task": "activity",
    "progress": "progress", "% complete": "progress", "percent complete": "progress",
    "completion": "progress", "progress %": "progress", "progress percent": "progress",
    "location": "location", "area": "location", "work area": "location", "zone": "location",
    "date": "date", "report date": "date", "execution date": "date", "dpr date": "date",
    "remarks": "remarks", "comments": "remarks", "notes": "remarks", "observation": "remarks",
    "discipline": "discipline", "asset": "asset", "asset_tag": "asset", "tag": "asset",
    "asset tag": "asset", "line": "asset", "equipment": "asset",
}

SUPPORTED_TEXT = {".txt"}
SUPPORTED_TABLE = {".csv", ".xlsx", ".xls"}
SUPPORTED_IMAGE = {".jpg", ".jpeg", ".png", ".webp"}
SUPPORTED_AUDIO = {".wav", ".mp3", ".m4a", ".ogg"}


def _norm_cols(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    mapping, unmapped = {}, []
    for c in df.columns:
        key = str(c).strip().lower()
        if key in _ALIASES:
            mapping[c] = _ALIASES[key]
        else:
            unmapped.append(str(c))
    return df.rename(columns=mapping), unmapped


def _cell(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def row_to_sentence(row: dict) -> str | None:
    """Build one short natural sentence. Structured cells first, remarks appended verbatim
    so the extractor still sees the field wording."""
    parts = []
    if row.get("asset"):
        parts.append(str(row["asset"]))
    if row.get("activity"):
        parts.append(str(row["activity"]))
    if not parts:
        return None
    sentence = " ".join(parts)
    if row.get("location"):
        sentence += f" at {row['location']}"
    if row.get("progress") is not None:
        p = _cell(row["progress"])
        if p:
            try:                      # 100.0 -> 100, so the model sees "100%" not "100.0%"
                f = float(p.replace("%", ""))
                p = f"{f:g}" + ("%" if "%" in p or f <= 100 else "")
            except ValueError:
                pass
            sentence += f" is {p}{'' if '%' in p else '%'} complete"
    if row.get("date"):
        sentence += f" on {row['date']}"
    sentence = sentence.rstrip(".") + "."
    if row.get("remarks"):
        sentence += f" {str(row['remarks']).rstrip('.')}."
    return sentence


def parse_table(data: bytes, filename: str) -> tuple[list[dict], list[str], list[str]]:
    """Returns (rows, unmapped_columns, warnings). Each row dict has a 'sentence' key."""
    warnings: list[str] = []
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(data))
        else:
            df = pd.read_excel(io.BytesIO(data))
    except Exception as e:
        raise ValueError(f"could not read {filename}: {type(e).__name__}") from e

    df = df.dropna(how="all")
    df, unmapped = _norm_cols(df)
    rows: list[dict] = []
    for i, r in df.iterrows():
        d = {k: _cell(v) for k, v in r.to_dict().items()}
        sentence = row_to_sentence(d)
        if not sentence:
            warnings.append(f"row {i}: no activity/asset column value, skipped")
            continue
        d["sentence"] = sentence
        d["row_index"] = int(i)
        rows.append(d)
    if not rows:
        warnings.append("no usable rows found -- check that an Activity or Description column exists")
    return rows, unmapped, warnings
