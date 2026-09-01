import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession, can } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { rateLimit, rateLimitKey } from "@/lib/rateLimit";
import { extractEvent } from "@/lib/engine/extraction";
import { matchEventToActivities } from "@/lib/engine/matching";
import { detectConflicts } from "@/lib/engine/schedule";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "field-updates:create")) {
    return NextResponse.json({ error: `Role '${session.role}' cannot trigger extraction/matching.` }, { status: 403 });
  }
  const rl = rateLimit(rateLimitKey(req, session.id), 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many extraction requests. Wait a moment and try again." }, { status: 429 });
  const { id: reportId } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase.from("field_reports").select("*").eq("id", reportId).single();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  await supabase.from("field_reports").update({ status: "PROCESSING" }).eq("id", reportId);

  const extracted = await extractEvent(report.raw_text);

  const { data: eventRow, error: eventErr } = await supabase
    .from("field_events")
    .insert({
      report_id: reportId,
      project_id: report.project_id,
      event_type: extracted.event_type,
      activity_description: extracted.activity_description,
      engineering_tag: extracted.engineering_tag,
      line_number: extracted.line_number,
      location: extracted.location,
      discipline: extracted.discipline || report.discipline,
      progress: extracted.progress,
      actual_start: extracted.actual_start,
      actual_finish: extracted.actual_finish,
      quantity: extracted.quantity,
      unit: extracted.unit,
      delay_reason: extracted.delay_reason,
      evidence_span: extracted.evidence_span,
      extraction_mode: extracted.extraction_mode,
    })
    .select()
    .single();
  if (eventErr) {
    await supabase.from("field_reports").update({ status: "ERROR" }).eq("id", reportId);
    return NextResponse.json({ error: eventErr.message }, { status: 403 });
  }
  const eventId = eventRow.id;

  await logAudit(supabase, {
    projectId: report.project_id,
    actor: session.email,
    action: "EVENT_EXTRACTED",
    entityType: "field_event",
    entityId: eventId,
    after: extracted,
    source: "extraction-service",
    model: extracted.extraction_mode,
  });

  const matchResult = await matchEventToActivities(supabase, report.project_id, extracted);

  if (matchResult.candidates.length > 0) {
    await supabase.from("match_candidates").insert(
      matchResult.candidates.map((c, idx) => ({
        field_event_id: eventId,
        activity_id: c.activity.id,
        score: c.score,
        reasons: c.reasons,
        score_breakdown: c.scoreBreakdown,
        rank: idx + 1,
      }))
    );
  }

  const { data: matchRow, error: matchErr } = await supabase
    .from("activity_matches")
    .insert({
      field_event_id: eventId,
      project_id: report.project_id,
      best_activity_id: matchResult.best?.activity.id || null,
      confidence: matchResult.confidence,
      trust_level: matchResult.trustLevel,
      score_breakdown: matchResult.best?.scoreBreakdown || [],
      status: "PENDING",
    })
    .select()
    .single();
  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 403 });

  if (matchResult.trustLevel !== "HIGH") {
    await notify(supabase, {
      projectId: report.project_id,
      userRole: "PLANNER",
      title: matchResult.trustLevel === "UNMATCHED" ? "Unmatched field event needs triage" : "Review required",
      body: `${extracted.activity_description || "Field event"} — ${matchResult.trustLevel} confidence (${Math.round(matchResult.confidence * 100)}%).`,
      link: `/evidence/${matchRow.id}`,
    });
  }

  let conflicts: Awaited<ReturnType<typeof detectConflicts>> = [];
  if (extracted.progress !== null && matchResult.best) {
    conflicts = await detectConflicts(supabase, report.project_id, matchResult.best.activity.id, extracted.progress);
  }
  if (conflicts.length > 0) {
    await notify(supabase, {
      projectId: report.project_id,
      userRole: "PLANNER",
      title: "Contradiction detected",
      body: conflicts.map((c) => c.description).join(" "),
      link: "/conflicts",
    });
  }

  await logAudit(supabase, {
    projectId: report.project_id,
    actor: session.email,
    action: "ACTIVITY_MATCHED",
    entityType: "activity_match",
    entityId: matchRow.id,
    after: { best: matchResult.best?.activity.activity_id, confidence: matchResult.confidence, trustLevel: matchResult.trustLevel },
    source: "matching-engine",
    confidence: matchResult.confidence,
  });

  await supabase.from("field_reports").update({ status: "PROCESSED" }).eq("id", reportId);

  return NextResponse.json({
    eventId,
    matchId: matchRow.id,
    matchResult: { confidence: matchResult.confidence, trustLevel: matchResult.trustLevel },
  });
}
