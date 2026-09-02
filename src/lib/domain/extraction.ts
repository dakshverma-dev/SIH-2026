import type { ExtractionMode } from "./types";

export interface ExtractedEvent {
  event_type: string;
  activity_description: string;
  engineering_tag: string | null;
  line_number: string | null;
  location: string | null;
  discipline: string | null;
  progress: number | null;
  delay_reason: string | null;
  evidence_span: string | null;
  extraction_mode: ExtractionMode;
}

const DISCIPLINES: Array<[string, RegExp]> = [
  ["PIPING", /\b(pipe|piping|spool|weld|flange|line|hydrotest)\b/i],
  ["MECHANICAL", /\b(pump|compressor|vessel|mechanical|skid|rotating)\b/i],
  ["ELECTRICAL", /\b(cable|electrical|switchgear|transformer|earthing|glanding)\b/i],
  ["INSTRUMENTATION", /\b(instrument|loop|transmitter|junction box|calibrat)\b/i],
  ["CIVIL", /\b(civil|concrete|pour|foundation|grout|excavat|rebar)\b/i],
  ["STRUCTURAL", /\b(structur|steel|erect|beam|column|platform)\b/i],
];

const LOCATIONS = [
  "Unit 100",
  "Unit 200",
  "Unit 300",
  "Tank Farm",
  "Pipe Rack A",
  "Pipe Rack B",
  "Substation",
  "Utility Block",
];

const DELAY_PATTERNS: Array<[string, RegExp]> = [
  ["MATERIAL_SHORTAGE", /\b(material|spool|not (yet )?(delivered|received)|shortage|awaiting material)\b/i],
  ["WEATHER", /\b(rain|storm|wind|weather)\b/i],
  ["MANPOWER", /\b(manpower|crew short|no crew|labour|labor shortage)\b/i],
  ["PERMIT", /\b(permit|ptw|clearance)\b/i],
  ["ACCESS", /\b(access|scaffold|blocked)\b/i],
  ["REWORK", /\b(rework|repair|reject|ndt fail)\b/i],
];

function findSpan(text: string, re: RegExp): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) if (re.test(s)) return s.trim();
  return null;
}

/**
 * Deterministic rule-based extractor. This is not AI. It is regex and
 * keyword matching, and the UI labels it DEMO FALLBACK wherever it is used.
 */
export function extractDeterministic(rawText: string): ExtractedEvent {
  const text = rawText ?? "";

  const tag = text.match(/\b([A-Z]{1,4}-\d{2,5}[A-Z]?(?:-[A-Z0-9]{1,4})?)\b/);
  const line = text.match(/\b(\d{1,2}"?\s*-\s*[A-Z]{1,3}-\d{2,5}(?:-[A-Z0-9]+)?)\b/) ?? text.match(/\b(\d{1,2}\s*inch)\b/i);

  let discipline: string | null = null;
  for (const [name, re] of DISCIPLINES) {
    if (re.test(text)) {
      discipline = name;
      break;
    }
  }

  const location = LOCATIONS.find((l) => text.toLowerCase().includes(l.toLowerCase())) ?? null;

  const progressMatch = text.match(/\b(\d{1,3})\s*%/);
  const progress = progressMatch ? Math.min(Number(progressMatch[1]), 100) : null;

  let delayReason: string | null = null;
  for (const [name, re] of DELAY_PATTERNS) {
    if (re.test(text)) {
      delayReason = name;
      break;
    }
  }

  let eventType = "PROGRESS_UPDATE";
  if (/\b(complete|completed|finished|closed out)\b/i.test(text)) eventType = "COMPLETION";
  else if (/\b(start|started|commenced|mobilis|mobiliz)\b/i.test(text)) eventType = "START";
  if (delayReason) eventType = /\b(hold|stopped|halted|delay)\b/i.test(text) ? "DELAY" : eventType;
  if (/\b(ndt fail|reject|rework)\b/i.test(text)) eventType = "QUALITY_ISSUE";

  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text.trim();
  const tagValue = tag?.[1] ?? null;
  const lineValue = line?.[1] ?? null;
  const evidence =
    (tagValue
      ? findSpan(text, new RegExp(tagValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
      : null) ??
    (progressMatch ? findSpan(text, /\d{1,3}\s*%/) : null) ??
    (firstSentence || null);

  return {
    event_type: eventType,
    activity_description: firstSentence.slice(0, 240),
    engineering_tag: tagValue,
    line_number: lineValue ? lineValue.replace(/\s+/g, "") : null,
    location,
    discipline,
    progress,
    delay_reason: delayReason,
    evidence_span: evidence,
    extraction_mode: "DEMO_FALLBACK",
  };
}
