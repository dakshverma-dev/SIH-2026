import { supabase } from "@/integrations/supabase/client";
import { extractDeterministic } from "@/lib/domain/extraction";
import { rankCandidates, routeMatch } from "@/lib/domain/matching";
import type { ScheduleActivity } from "@/lib/domain/types";
import type { Json } from "@/integrations/supabase/types";

/** jsonb columns are typed as Json by the generated client. */
const toJson = (value: unknown): Json => value as Json;

export const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

/** Simple in-memory sliding-window limiter. Per browser tab, not distributed. */
const windowHits: number[] = [];
export function rateLimit(maxPerMinute = 10): boolean {
  const now = Date.now();
  while (windowHits.length && now - windowHits[0]! > 60_000) windowHits.shift();
  if (windowHits.length >= maxPerMinute) return false;
  windowHits.push(now);
  return true;
}

export interface ProcessResult {
  reportId: string;
  eventId: string;
  matchId: string;
  trust: string;
  confidence: number;
}

/**
 * Runs one field report through the full pipeline: extract, score every
 * candidate activity, route by trust level, persist candidates, the match,
 * any contradiction, and the audit trail. All writes go through the signed-in
 * user's session, so row level security decides what is actually allowed.
 */
export async function processReport(
  reportId: string,
  actor: { id: string | null; name: string },
): Promise<ProcessResult | null> {
  const { data: report, error: repErr } = await supabase
    .from("field_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  if (repErr || !report) return null;

  const extracted = extractDeterministic(report.raw_text);

  const { data: eventRow, error: evErr } = await supabase
    .from("field_events")
    .insert({
      report_id: report.id,
      project_id: report.project_id,
      event_type: extracted.event_type,
      activity_description: extracted.activity_description,
      engineering_tag: extracted.engineering_tag,
      line_number: extracted.line_number,
      location: extracted.location ?? report.location,
      discipline: extracted.discipline ?? report.discipline,
      progress: extracted.progress,
      delay_reason: extracted.delay_reason,
      evidence_span: extracted.evidence_span,
      extraction_mode: extracted.extraction_mode,
    })
    .select()
    .single();
  if (evErr || !eventRow) throw evErr ?? new Error("Could not store the extracted event.");

  const { data: activities } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("project_id", report.project_id);

  const candidates = rankCandidates(extracted, (activities ?? []) as ScheduleActivity[]);
  const decision = routeMatch(candidates);

  const top = candidates.filter((c) => c.score > 0).slice(0, 5);
  if (top.length) {
    await supabase.from("match_candidates").insert(
      top.map((c, i) => ({
        field_event_id: eventRow.id,
        activity_id: c.activity.id,
        score: c.score,
        reasons: toJson(c.breakdown.filter((s) => s.weight !== 0).map((s) => s.label)),
        score_breakdown: toJson(c.breakdown),
        rank: i + 1,
      })),
    );
  }

  const { data: matchRow, error: matchErr } = await supabase
    .from("activity_matches")
    .insert({
      field_event_id: eventRow.id,
      project_id: report.project_id,
      best_activity_id: decision.best_activity_id,
      confidence: decision.confidence,
      trust_level: decision.trust_level,
      status: decision.status,
      score_breakdown: toJson(decision.score_breakdown),
      reviewed_by: decision.status === "APPROVED" ? null : null,
    })
    .select()
    .single();
  if (matchErr || !matchRow) throw matchErr ?? new Error("Could not store the match.");

  // Contradiction detection against the matched activity.
  const best = candidates[0];
  if (decision.best_activity_id && best) {
    const a = best.activity;
    const conflictRows: Array<{ conflict_type: string; description: string }> = [];
    if (a.status === "COMPLETE" && extracted.progress !== null && extracted.progress < 100) {
      conflictRows.push({
        conflict_type: "PROGRESS_REGRESSION",
        description: `Schedule shows ${a.activity_id} complete, the field reports ${extracted.progress}% progress.`,
      });
    }
    if (
      extracted.progress !== null &&
      extracted.progress + 15 < a.progress &&
      a.status !== "COMPLETE"
    ) {
      conflictRows.push({
        conflict_type: "PROGRESS_CONTRADICTION",
        description: `Field reports ${extracted.progress}% against a recorded ${a.progress}% on ${a.activity_id}.`,
      });
    }
    if (extracted.delay_reason && a.status === "NOT_STARTED") {
      conflictRows.push({
        conflict_type: "DELAY_ON_UNSTARTED",
        description: `A delay cause (${extracted.delay_reason}) was reported against ${a.activity_id}, which has not started.`,
      });
    }
    if (conflictRows.length) {
      await supabase.from("conflicts").insert(
        conflictRows.map((c) => ({
          project_id: report.project_id,
          activity_id: a.id,
          field_event_id: eventRow.id,
          conflict_type: c.conflict_type,
          description: c.description,
          status: "OPEN",
        })),
      );
    }
  }

  await supabase.from("audit_events").insert([
    {
      project_id: report.project_id,
      actor: actor.name,
      actor_id: actor.id,
      action: "EXTRACT",
      entity_type: "field_event",
      entity_id: eventRow.id,
      after_json: toJson(extracted),
      source: "rule_based_extractor",
      model: extracted.extraction_mode,
      reason: "Deterministic regex and keyword extraction.",
    },
    {
      project_id: report.project_id,
      actor: actor.name,
      actor_id: actor.id,
      action: "MATCH",
      entity_type: "activity_match",
      entity_id: matchRow.id,
      after_json: toJson({ trust_level: decision.trust_level, confidence: decision.confidence }),
      source: "weighted_signal_matcher",
      confidence: decision.confidence,
      reason: `Routed as ${decision.trust_level}.`,
    },
  ]);

  await supabase
    .from("field_reports")
    .update({ status: "PROCESSED" })
    .eq("id", report.id);

  if (decision.trust_level !== "HIGH") {
    await supabase.from("notifications").insert({
      project_id: report.project_id,
      user_role: "PLANNER",
      title: `Review required: ${decision.trust_level} confidence match`,
      body: extracted.activity_description,
      link: `/evidence/${matchRow.id}`,
    });
  }

  return {
    reportId: report.id,
    eventId: eventRow.id,
    matchId: matchRow.id,
    trust: decision.trust_level,
    confidence: decision.confidence,
  };
}
