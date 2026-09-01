import { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedEvent } from "./extraction";

export interface ScheduleActivityRow {
  id: string;
  project_id: string;
  activity_id: string;
  wbs: string;
  discipline: string;
  description: string;
  location: string | null;
  engineering_tag: string | null;
  line_number: string | null;
  contractor: string | null;
  planned_start: string | null;
  planned_finish: string | null;
  actual_start: string | null;
  actual_finish: string | null;
  progress: number | string;
  duration_days: number;
  predecessor_id: string | null;
  is_critical: boolean;
  status: string;
}

/** One explainable signal in the trust score. `weight` is the signed
 * contribution actually applied for this candidate (can be negative for a
 * penalty). Persisted verbatim to match_candidates.score_breakdown so the
 * Evidence view can render the exact arithmetic that produced the score —
 * never a black-box percentage. */
export interface ScoreSignal {
  signal:
    | "IDENTIFIER_TAG"
    | "IDENTIFIER_LINE"
    | "DISCIPLINE"
    | "LOCATION"
    | "SEMANTIC"
    | "SCHEDULE_STATUS";
  label: string;
  weight: number;
  hit: boolean;
}

export interface CandidateResult {
  activity: ScheduleActivityRow;
  score: number; // 0-1, clamped sum of scoreBreakdown weights
  reasons: string[]; // positive-weight signal labels, for compact display
  scoreBreakdown: ScoreSignal[];
}

export interface MatchResult {
  best: CandidateResult | null;
  candidates: CandidateResult[];
  confidence: number;
  trustLevel: "HIGH" | "MEDIUM" | "LOW" | "UNMATCHED";
}

// Simple token-overlap "lexical/semantic" score (BM25-lite, no external embedding
// dependency needed — deterministic and explainable, per spec Stage 3/4).
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function lexicalScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.min(ta.size, tb.size);
}

export function scoreCandidate(event: ExtractedEvent, activity: ScheduleActivityRow): ScoreSignal[] {
  const s: ScoreSignal[] = [];

  // Signal 1a: hard anchor — engineering tag
  if (event.engineering_tag && activity.engineering_tag) {
    const eTag = event.engineering_tag.toUpperCase();
    const aTag = activity.engineering_tag.toUpperCase();
    if (eTag === aTag) {
      s.push({ signal: "IDENTIFIER_TAG", label: `Engineering tag exact match (${aTag})`, weight: 0.35, hit: true });
    } else if (aTag.includes(eTag) || eTag.includes(aTag)) {
      s.push({ signal: "IDENTIFIER_TAG", label: `Engineering tag partial match (${eTag} ~ ${aTag})`, weight: 0.18, hit: true });
    } else {
      s.push({ signal: "IDENTIFIER_TAG", label: `Engineering tag present but differs (${eTag} vs ${aTag})`, weight: 0, hit: false });
    }
  }

  // Signal 1b: hard anchor — line/size identifier
  if (event.line_number && activity.line_number) {
    const a = event.line_number.toLowerCase().replace(/\s+/g, "");
    const b = activity.line_number.toLowerCase().replace(/\s+/g, "");
    if (a === b) {
      s.push({ signal: "IDENTIFIER_LINE", label: `Line/size identifier aligned (${activity.line_number})`, weight: 0.15, hit: true });
    } else if (a.includes(b) || b.includes(a)) {
      s.push({ signal: "IDENTIFIER_LINE", label: "Line/size identifier partially aligned", weight: 0.08, hit: true });
    }
  }

  // Signal 3a: schedule context — discipline compatibility
  if (event.discipline && activity.discipline) {
    if (event.discipline.toLowerCase() === activity.discipline.toLowerCase()) {
      s.push({ signal: "DISCIPLINE", label: `Discipline aligned (${activity.discipline})`, weight: 0.15, hit: true });
    } else {
      s.push({ signal: "DISCIPLINE", label: `Discipline mismatch (event=${event.discipline}, activity=${activity.discipline})`, weight: -0.1, hit: true });
    }
  }

  // Signal 3b: schedule context — location compatibility
  if (event.location && activity.location) {
    if (activity.location.toLowerCase().includes(event.location.toLowerCase())) {
      s.push({ signal: "LOCATION", label: `Location aligned (${activity.location})`, weight: 0.1, hit: true });
    } else {
      s.push({ signal: "LOCATION", label: `Location present but differs (event=${event.location}, activity=${activity.location})`, weight: 0, hit: false });
    }
  }

  // Signal 2: semantic/lexical similarity on description
  const lex = lexicalScore(event.activity_description || event.evidence_span, activity.description);
  if (lex > 0) {
    s.push({
      signal: "SEMANTIC",
      label: `Description overlap ${Math.round(lex * 100)}% (token-overlap similarity)`,
      weight: Number((lex * 0.25).toFixed(4)),
      hit: lex > 0.2,
    });
  }

  // Signal 3c: schedule context — status/timing plausibility
  if (activity.status === "COMPLETE") {
    s.push({ signal: "SCHEDULE_STATUS", label: "Activity already marked COMPLETE — unlikely target", weight: -0.2, hit: true });
  } else if (activity.status === "IN_PROGRESS") {
    s.push({ signal: "SCHEDULE_STATUS", label: "Schedule timing compatible (activity in progress)", weight: 0.05, hit: true });
  } else if (activity.status === "NOT_STARTED" && event.event_type === "PROGRESS_COMPLETE") {
    s.push({ signal: "SCHEDULE_STATUS", label: "Event reports completion but activity not yet started", weight: -0.05, hit: true });
  }

  return s;
}

export async function matchEventToActivities(
  supabase: SupabaseClient,
  projectId: string,
  event: ExtractedEvent
): Promise<MatchResult> {
  const { data, error } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  const activities = (data || []) as ScheduleActivityRow[];

  const candidates: CandidateResult[] = activities.map((activity) => {
    const scoreBreakdown = scoreCandidate(event, activity);
    const rawScore = scoreBreakdown.reduce((sum, x) => sum + x.weight, 0);
    const score = Math.max(0, Math.min(1, rawScore));
    const reasons = scoreBreakdown.filter((x) => x.hit && x.weight > 0).map((x) => x.label);
    return { activity, score, reasons, scoreBreakdown };
  });

  // Rerank — sort by score desc
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 5);

  const best = top[0] && top[0].score > 0 ? top[0] : null;
  const confidence = best ? Math.round(best.score * 100) / 100 : 0;

  let trustLevel: MatchResult["trustLevel"] = "UNMATCHED";
  if (confidence >= 0.75) trustLevel = "HIGH";
  else if (confidence >= 0.45) trustLevel = "MEDIUM";
  else if (confidence > 0) trustLevel = "LOW";

  return { best, candidates: top, confidence, trustLevel };
}
