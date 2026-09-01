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

export interface CandidateResult {
  activity: ScheduleActivityRow;
  score: number; // 0-1
  reasons: string[];
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
    let score = 0;
    const reasons: string[] = [];

    // Stage 1: Hard anchor — engineering tag / line number exact/partial match
    if (event.engineering_tag && activity.engineering_tag) {
      if (activity.engineering_tag.toUpperCase() === event.engineering_tag.toUpperCase()) {
        score += 0.35;
        reasons.push("Engineering tag exact match");
      } else if (
        activity.engineering_tag.toUpperCase().includes(event.engineering_tag.toUpperCase()) ||
        event.engineering_tag.toUpperCase().includes(activity.engineering_tag.toUpperCase())
      ) {
        score += 0.18;
        reasons.push("Engineering tag partial match");
      }
    }

    if (event.line_number && activity.line_number) {
      const a = event.line_number.toLowerCase().replace(/\s+/g, "");
      const b = activity.line_number.toLowerCase().replace(/\s+/g, "");
      if (a === b) {
        score += 0.15;
        reasons.push("Line number aligned");
      } else if (a.includes(b) || b.includes(a)) {
        score += 0.08;
        reasons.push("Line number partially aligned");
      }
    }

    // Stage 2/3: Context filter — discipline
    if (event.discipline && activity.discipline) {
      if (event.discipline.toLowerCase() === activity.discipline.toLowerCase()) {
        score += 0.15;
        reasons.push("Discipline aligned");
      } else {
        score -= 0.1;
      }
    }

    // Location context
    if (event.location && activity.location) {
      if (activity.location.toLowerCase().includes(event.location.toLowerCase())) {
        score += 0.1;
        reasons.push("Location aligned");
      }
    }

    // Stage 4: Semantic/lexical retrieval on description
    const lex = lexicalScore(event.activity_description || event.evidence_span, activity.description);
    score += lex * 0.25;
    if (lex > 0.2) reasons.push("Activity semantics aligned");

    // Stage 5: Timing / status plausibility
    if (activity.status === "COMPLETE") {
      score -= 0.2; // already complete — unlikely target
    } else if (activity.status === "IN_PROGRESS") {
      score += 0.05;
      reasons.push("Schedule timing compatible (in progress)");
    } else if (activity.status === "NOT_STARTED" && event.event_type === "PROGRESS_COMPLETE") {
      score -= 0.05;
    }

    score = Math.max(0, Math.min(1, score));
    return { activity, score, reasons };
  });

  // Stage 6: rerank — sort by score desc
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
