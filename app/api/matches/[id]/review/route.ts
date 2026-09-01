import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession, can } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { computeImpact } from "@/lib/engine/schedule";
import { MatchReviewSchema, zodErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "review")) return NextResponse.json({ error: "Not permitted for your role." }, { status: 403 });

  const { id: matchId } = await params;
  const raw = await req.json().catch(() => null);
  if (raw === null) return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  const parsed = MatchReviewSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
  const { decision, activityId } = parsed.data;
  const supabase = await createClient();

  const { data: match } = await supabase.from("activity_matches").select("*").eq("id", matchId).single();
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const before = { ...match };
  const finalActivityId = activityId || match.best_activity_id;

  const { error: updateErr } = await supabase
    .from("activity_matches")
    .update({
      status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewed_by: session.id,
      reviewed_at: new Date().toISOString(),
      best_activity_id: finalActivityId,
    })
    .eq("id", matchId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 403 });

  let impact = null;

  if (decision === "APPROVE" && finalActivityId) {
    const { data: event } = await supabase.from("field_events").select("*").eq("id", match.field_event_id).single();
    const { data: activity } = await supabase.from("schedule_activities").select("*").eq("id", finalActivityId).single();

    if (event && activity) {
      const newProgress = event.progress !== null ? event.progress : activity.progress;
      const newStatus = newProgress >= 100 ? "COMPLETE" : newProgress > 0 ? "IN_PROGRESS" : activity.status;

      const { error: schedErr } = await supabase
        .from("schedule_activities")
        .update({
          progress: newProgress,
          status: newStatus,
          actual_start: activity.actual_start || event.actual_start || activity.planned_start,
          updated_by: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", finalActivityId);

      if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 403 });

      await logAudit(supabase, {
        projectId: match.project_id,
        actor: session.email,
        action: "SCHEDULE_UPDATED",
        entityType: "schedule_activity",
        entityId: finalActivityId,
        before: { progress: activity.progress, status: activity.status },
        after: { progress: newProgress, status: newStatus },
        source: "review-approval",
        confidence: match.confidence,
        reason: "Planner approved matched field event.",
      });

      impact = await computeImpact(supabase, match.project_id, finalActivityId);

      await logAudit(supabase, {
        projectId: match.project_id,
        actor: "system",
        action: "IMPACT_RECALCULATED",
        entityType: "schedule_impact",
        entityId: impact?.id,
        after: impact,
        source: "impact-engine",
      });

      if (impact?.criticalPathChanged) {
        await notify(supabase, {
          projectId: match.project_id,
          userRole: "PROJECT_MANAGER",
          title: "Critical path moved",
          body: `${activity.description}: forecast finish shifted to ${impact.forecastFinish} (${impact.varianceDays > 0 ? "+" : ""}${impact.varianceDays} days).`,
          link: "/impact",
        });
      }
    }
  }

  await logAudit(supabase, {
    projectId: match.project_id,
    actor: session.email,
    action: decision === "APPROVE" ? "MATCH_APPROVED" : "MATCH_REJECTED",
    entityType: "activity_match",
    entityId: matchId,
    before,
    after: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", activityId: finalActivityId },
    source: "review-queue",
    confidence: match.confidence,
  });

  return NextResponse.json({ ok: true, impact });
}
