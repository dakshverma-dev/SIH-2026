import type { ScheduleActivityRow } from "./matching";

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

export function toNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

export interface CpmNode {
  id: string;
  activityId: string;
  earliestStart: string;
  earliestFinish: string;
  latestStart: string;
  latestFinish: string;
  floatDays: number;
  isCritical: boolean;
}

/**
 * Deterministic CPM over the schema's single-predecessor / multi-successor
 * activity graph (a forest, not a general DAG — matches what
 * schedule_activities.predecessor_id actually models today).
 *
 * Forward pass: earliest start = max(predecessor earliest finish, planned/actual
 * start). Remaining duration is prorated by progress; completed activities use
 * their real actual_finish, never a computed one.
 *
 * Backward pass: leaf activities (no successors) are assumed zero-float —
 * their latest finish equals their own earliest finish. Every other
 * activity's latest finish is the minimum of its successors' latest starts.
 * Float = latest start − earliest start; critical when float <= 0.
 *
 * No LLM involved anywhere in this file — this is the part of the product
 * that must never guess.
 */
export function computeCpm(activities: ScheduleActivityRow[], today = new Date().toISOString().slice(0, 10)): Map<string, CpmNode> {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const successorsOf = new Map<string, string[]>();
  for (const a of activities) {
    if (a.predecessor_id) {
      const list = successorsOf.get(a.predecessor_id) || [];
      list.push(a.id);
      successorsOf.set(a.predecessor_id, list);
    }
  }

  // Forward pass — process in an order where every predecessor is resolved
  // before its successors. A simple repeat-until-stable pass handles the
  // forest correctly without requiring the caller to pre-sort.
  const earliestStart = new Map<string, string>();
  const earliestFinish = new Map<string, string>();
  const pending = new Set(activities.map((a) => a.id));
  let guard = 0;
  while (pending.size > 0 && guard < activities.length + 5) {
    guard++;
    for (const id of Array.from(pending)) {
      const act = byId.get(id)!;
      if (act.predecessor_id && pending.has(act.predecessor_id)) continue; // predecessor not resolved yet

      let start = act.actual_start || act.planned_start || today;
      if (act.predecessor_id) {
        const predFinish = earliestFinish.get(act.predecessor_id);
        const pred = byId.get(act.predecessor_id);
        if (predFinish && pred) {
          const predPlannedFinish = pred.planned_finish || predFinish;
          const slip = diffDays(predFinish, predPlannedFinish);
          if (slip > 0) start = addDays(act.planned_start || start, slip);
        }
      }

      let finish: string;
      if (act.status === "COMPLETE" && act.actual_finish) {
        finish = act.actual_finish;
      } else {
        const remaining = Math.ceil(toNumber(act.duration_days) * (1 - toNumber(act.progress) / 100));
        finish = addDays(start, Math.max(remaining, 0));
      }
      earliestStart.set(id, start);
      earliestFinish.set(id, finish);
      pending.delete(id);
    }
  }

  // Backward pass — process leaves first, then their predecessors, using the
  // same repeat-until-stable strategy in reverse.
  const latestStart = new Map<string, string>();
  const latestFinish = new Map<string, string>();
  const pendingBack = new Set(activities.map((a) => a.id));
  guard = 0;
  while (pendingBack.size > 0 && guard < activities.length + 5) {
    guard++;
    for (const id of Array.from(pendingBack)) {
      const successors = successorsOf.get(id) || [];
      const unresolved = successors.some((sid) => pendingBack.has(sid));
      if (unresolved) continue;

      const remaining = (() => {
        const act = byId.get(id)!;
        if (act.status === "COMPLETE") return 0;
        return Math.ceil(toNumber(act.duration_days) * (1 - toNumber(act.progress) / 100));
      })();

      let lf: string;
      if (successors.length === 0) {
        lf = earliestFinish.get(id)!; // leaf: zero float by definition
      } else {
        lf = successors.map((sid) => latestStart.get(sid)!).reduce((min, s) => (s < min ? s : min));
      }
      const ls = addDays(lf, -remaining);
      latestFinish.set(id, lf);
      latestStart.set(id, ls);
      pendingBack.delete(id);
    }
  }

  const out = new Map<string, CpmNode>();
  for (const a of activities) {
    // Defensive fallback: only reachable if predecessor_id data forms a cycle,
    // which the schema does not intend but nothing enforces at the DB level.
    // Never crash the schedule view over bad data — fall back to the
    // activity's own planned dates and report zero float rather than throwing.
    const es = earliestStart.get(a.id) ?? a.planned_start ?? today;
    const ef = earliestFinish.get(a.id) ?? a.planned_finish ?? today;
    const ls = latestStart.get(a.id) ?? es;
    const lf = latestFinish.get(a.id) ?? ef;
    const floatDays = diffDays(ls, es);
    out.set(a.id, {
      id: a.id,
      activityId: a.activity_id,
      earliestStart: es,
      earliestFinish: ef,
      latestStart: ls,
      latestFinish: lf,
      floatDays,
      isCritical: floatDays <= 0,
    });
  }
  return out;
}

/** Back-compat shape used by the pre-refactor call sites: activity id -> forecast finish. */
export function forecastFinishMap(activities: ScheduleActivityRow[], today?: string): Map<string, string> {
  const cpm = computeCpm(activities, today);
  const out = new Map<string, string>();
  for (const [id, node] of cpm) out.set(id, node.earliestFinish);
  return out;
}
