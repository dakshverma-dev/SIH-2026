// Event extraction service.
// Uses a real LLM if ANTHROPIC_API_KEY is set (structured output via Claude API).
// Otherwise falls back to a deterministic, rule-based extractor — clearly labelled
// as DEMO_FALLBACK (never presented as "AI" in the UI/audit trail).

export interface ExtractedEvent {
  event_type: string | null;
  activity_description: string | null;
  engineering_tag: string | null;
  line_number: string | null;
  location: string | null;
  discipline: string | null;
  progress: number | null;
  actual_start: string | null;
  actual_finish: string | null;
  quantity: string | null;
  unit: string | null;
  delay_reason: string | null;
  evidence_span: string;
  extraction_mode: "DEMO_FALLBACK" | "LLM";
}

const DISCIPLINE_KEYWORDS: Record<string, string[]> = {
  Piping: ["spool", "pipe", "piping", "header", "hydrotest", "hydro-test", "weld", "fit-up", "fitup"],
  Mechanical: ["equipment", "pump", "vessel", "compressor", "mechanical", "skid"],
  Electrical: ["cable", "cable pulling", "electrical", "termination", "panel", "switchgear"],
  Instrumentation: ["instrument", "transmitter", "loop", "calibration", "instrumentation"],
  Civil: ["concrete", "foundation", "civil", "excavation", "pour"],
  Structural: ["structural", "steel erection", "erection", "girder", "structure"],
};

function detectDiscipline(text: string): string | null {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let bestHits = 0;
  for (const [disc, kws] of Object.entries(DISCIPLINE_KEYWORDS)) {
    const hits = kws.filter((k) => lower.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = disc;
    }
  }
  return best;
}

function extractTag(text: string): string | null {
  // Engineering tag patterns like PIP-R3-2401, INS-2210, E-101, HX-201
  const m = text.match(/\b([A-Z]{2,4}-[A-Z0-9]{2,6}(?:-[A-Z0-9]{2,6})?)\b/);
  if (m) return m[1];
  const m2 = text.match(/\b([A-Z]{1,3}-\d{2,5})\b/);
  return m2 ? m2[1] : null;
}

function extractLineNumber(text: string): string | null {
  const m = text.match(/\b(\d{1,2}["']?-?inch|\d{1,3}\s?(?:mm|in|inch))\b[^,.]*?(?:header|line)?/i);
  if (m) return m[0].trim();
  const m2 = text.match(/\bline\s?(?:no\.?|number)?\s*[:#]?\s*([A-Z0-9\-]{3,12})/i);
  return m2 ? m2[1] : null;
}

function extractLocation(text: string): string | null {
  const m = text.match(/\b(rack\s?\d+|unit\s?\d+|zone\s?[A-Z0-9]+|area\s?[A-Z0-9]+)\b/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function extractProgress(text: string): number | null {
  const m = text.match(/(\d{1,3})\s?%|\bapproximately\s(\d{1,3})\s?percent\b|\b(\d{1,3})\s?percent\b/i);
  if (!m) return null;
  const val = Number(m[1] ?? m[2] ?? m[3]);
  return Number.isFinite(val) ? Math.min(100, Math.max(0, val)) : null;
}

function extractEventType(text: string): string {
  const lower = text.toLowerCase();
  if (/(complete|completed|finished)/.test(lower)) return "PROGRESS_COMPLETE";
  if (/(start|started|commenced|began)/.test(lower)) return "PROGRESS_START";
  if (/(delay|held up|stopped|blocked|halted)/.test(lower)) return "DELAY";
  return "PROGRESS_UPDATE";
}

function extractDelayReason(text: string): string | null {
  const m = text.match(/(?:due to|because of|owing to)\s([^.]+)/i);
  return m ? m[1].trim() : null;
}

export function extractEventDemoFallback(rawText: string): ExtractedEvent {
  const discipline = detectDiscipline(rawText);
  return {
    event_type: extractEventType(rawText),
    activity_description: rawText.split(/[.]/)[0]?.trim() || rawText.slice(0, 140),
    engineering_tag: extractTag(rawText),
    line_number: extractLineNumber(rawText),
    location: extractLocation(rawText),
    discipline,
    progress: extractProgress(rawText),
    actual_start: null,
    actual_finish: null,
    quantity: null,
    unit: null,
    delay_reason: extractDelayReason(rawText),
    evidence_span: rawText.trim(),
    extraction_mode: "DEMO_FALLBACK",
  };
}

export async function extractEvent(rawText: string): Promise<ExtractedEvent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return extractEventDemoFallback(rawText);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system:
          "You extract structured execution events from infrastructure field reports. Return ONLY JSON matching the schema, no prose. Never invent values — use null for anything not explicitly stated.",
        messages: [
          {
            role: "user",
            content: `Extract from this field report text into JSON with keys: event_type, activity_description, engineering_tag, line_number, location, discipline, progress (number 0-100 or null), actual_start, actual_finish, quantity, unit, delay_reason, evidence_span (verbatim source text). Text: """${rawText}"""`,
          },
        ],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).map((c: { text?: string }) => c.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, extraction_mode: "LLM" } as ExtractedEvent;
  } catch {
    return extractEventDemoFallback(rawText);
  }
}
