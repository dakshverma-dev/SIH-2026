import { SupabaseClient } from "@supabase/supabase-js";
import type { ScheduleActivityRow } from "./matching";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

// Deterministic simplified CPM: walks the predecessor chain forward, recomputing
// forecast finish = start + remaining duration, propagating slippage to successors.
export async function recalcForecast(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("planned_start", { ascending: true });
  if (error) throw error;
  const activities = (data || []) as ScheduleActivityRow[];

  const byId = new Map(activities.map((a) => [a.id, a]));
  const forecastFinish = new Map<string, string>();

  for (const act of activities) {
    let start = act.actual_start || act.planned_start || new Date().toISOString().slice(0, 10);
    if (act.predecessor_id) {
      const predFinish = forecastFinish.get(act.predecessor_id);
      const pred = byId.get(act.predecessor_id);
      if (predFinish && pred) {
        const predPlannedFinish = pred.planned_finish || predFinish;
        if (diffDays(predFinish, predPlannedFinish) > 0) {
          start = addDays(act.planned_start || start, diffDays(predFinish, predPlannedFinish));
        }
      }
    }
    if (act.status === "COMPLETE" && act.actual_finish) {
      forecastFinish.set(act.id, act.actual_finish);
    } else {
      const remaining = Math.ceil(num(act.duration_days) * (1 - num(act.progress) / 100));
      forecastFinish.set(act.id, addDays(start, Math.max(remaining, 0)));
    }
  }
  return forecastFinish;
}

export async function computeImpact(supabase: SupabaseClient, projectId: string, activityId: string) {
  const { data: activity } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("id", activityId)
    .single();
  if (!activity) return null;

  const forecastMap = await recalcForecast(supabase, projectId);
  const forecastFinish = forecastMap.get(activityId) || activity.planned_finish;
  const baselineFinish = activity.planned_finish;
  const variance = baselineFinish && forecastFinish ? diffDays(forecastFinish, baselineFinish) : 0;

  const { data: successorsData } = await supabase
    .from("schedule_activities")
    .select("description")
    .eq("predecessor_id", activityId);
  const affected = (successorsData || []).map((s: { description: string }) => s.description);

  const wasCritical = activity.is_critical === true;
  const criticalPathChanged = wasCritical && variance > 0;

  const { data: inserted, error } = await supabase
    .from("schedule_impacts")
    .insert({
      project_id: projectId,
      activity_id: activityId,
      baseline_finish: baselineFinish,
      forecast_finish: forecastFinish,
      variance_days: variance,
      affected_activities: affected,
      critical_path_changed: criticalPathChanged,
    })
    .select()
    .single();
  if (error) throw error;

  return {
    id: inserted.id,
    activity,
    baselineFinish,
    forecastFinish,
    varianceDays: variance,
    affected,
    criticalPathChanged,
  };
}

export async function detectConflicts(
  supabase: SupabaseClient,
  projectId: string,
  activityId: string,
  newProgress: number | null
) {
  const { data: activity } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("id", activityId)
    .single();
  const conflicts: { type: string; description: string }[] = [];
  if (!activity) return conflicts;

  const currentProgress = num(activity.progress);

  if (newProgress !== null && newProgress < currentProgress) {
    conflicts.push({
      type: "PROGRESS_DECREASE",
      description: `Reported progress (${newProgress}%) is lower than current recorded progress (${currentProgress}%).`,
    });
  }

  if (activity.status === "COMPLETE" && newProgress !== null && newProgress < 100) {
    conflicts.push({
      type: "DUPLICATE_UPDATE",
      description: `Activity is already marked COMPLETE but a new partial update (${newProgress}%) was submitted.`,
    });
  }

  if (activity.predecessor_id) {
    const { data: pred } = await supabase
      .from("schedule_activities")
      .select("*")
      .eq("id", activity.predecessor_id)
      .single();
    if (pred && pred.status !== "COMPLETE" && newProgress !== null && newProgress >= 100) {
      conflicts.push({
        type: "SEQUENCE_VIOLATION",
        description: `Activity reported complete before predecessor "${pred.description}" is complete.`,
      });
    }
  }

  for (const c of conflicts) {
    await supabase.from("conflicts").insert({
      project_id: projectId,
      activity_id: activityId,
      conflict_type: c.type,
      description: c.description,
      status: "OPEN",
    });
  }

  return conflicts;
}

export async function runRecoverySimulation(supabase: SupabaseClient, projectId: string, activityId: string) {
  const { data: activity } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("id", activityId)
    .single();
  if (!activity) return null;

  const { data: impactRow } = await supabase
    .from("schedule_impacts")
    .select("forecast_finish")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const forecastFinish =
    impactRow?.forecast_finish || activity.planned_finish || new Date().toISOString().slice(0, 10);

  const options = [
    { key: "ADD_CREW", label: "Add Crew", recoveryDays: 4, effort: "2 additional crews x remaining duration", risk: "LOW" },
    { key: "EXTRA_SHIFT", label: "Extra Shift", recoveryDays: 3, effort: "Night shift added, 6 days", risk: "MEDIUM" },
    { key: "RESEQUENCE", label: "Resequence", recoveryDays: 2, effort: "Reorder with parallel-eligible successor", risk: "MEDIUM" },
  ];

  const results = [];
  for (const o of options) {
    const projected = addDays(forecastFinish, -o.recoveryDays);
    const { data: inserted, error } = await supabase
      .from("recovery_scenarios")
      .insert({
        project_id: projectId,
        activity_id: activityId,
        option_key: o.key,
        label: o.label,
        recovery_days: o.recoveryDays,
        effort: o.effort,
        risk_level: o.risk,
        projected_finish: projected,
      })
      .select()
      .single();
    if (error) throw error;
    results.push({ id: inserted.id, ...o, projectedFinish: projected });
  }

  return { currentForecast: forecastFinish, options: results };
}
