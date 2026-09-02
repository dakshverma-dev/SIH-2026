/**
 * Deterministic critical path method.
 *
 * Pure functions, no I/O, no LLM. Dates in, dates out. Every number this
 * module produces is reproducible from its inputs.
 */

export interface CpmActivity {
  id: string;
  planned_start: string;
  planned_finish: string;
  actual_start: string | null;
  actual_finish: string | null;
  progress: number;
  duration_days: number;
  predecessor_id: string | null;
  status: string;
}

export interface CpmResult {
  id: string;
  earliest_start: string;
  earliest_finish: string;
  latest_start: string;
  latest_finish: string;
  float_days: number;
  is_critical: boolean;
  variance_days: number;
}

const DAY = 86_400_000;

export function toDay(value: string): number {
  return Math.floor(new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime() / DAY);
}

export function fromDay(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return toDay(a) - toDay(b);
}

/** Detects whether following predecessor links from `id` re-enters a visited node. */
function hasCycle(map: Map<string, CpmActivity>): boolean {
  const state = new Map<string, 0 | 1 | 2>();
  const walk = (id: string): boolean => {
    const mark = state.get(id);
    if (mark === 1) return true;
    if (mark === 2) return false;
    state.set(id, 1);
    const pred = map.get(id)?.predecessor_id;
    if (pred && map.has(pred) && walk(pred)) return true;
    state.set(id, 2);
    return false;
  };
  for (const id of map.keys()) if (walk(id)) return true;
  return false;
}

function remainingDuration(a: CpmActivity): number {
  const total = Math.max(a.duration_days, 0);
  const pct = Math.min(Math.max(a.progress ?? 0, 0), 100);
  return Math.max(Math.round(total * (1 - pct / 100)), 0);
}

/** Topological order by predecessor chain. Assumes no cycles. */
function order(map: Map<string, CpmActivity>): CpmActivity[] {
  const out: CpmActivity[] = [];
  const seen = new Set<string>();
  const visit = (a: CpmActivity) => {
    if (seen.has(a.id)) return;
    seen.add(a.id);
    const pred = a.predecessor_id ? map.get(a.predecessor_id) : undefined;
    if (pred) visit(pred);
    out.push(a);
  };
  for (const a of map.values()) visit(a);
  return out;
}

export function computeCpm(activities: CpmActivity[]): CpmResult[] {
  if (!activities || activities.length === 0) return [];

  const map = new Map(activities.map((a) => [a.id, a]));
  const planned = (a: CpmActivity): CpmResult => ({
    id: a.id,
    earliest_start: a.planned_start,
    earliest_finish: a.planned_finish,
    latest_start: a.planned_start,
    latest_finish: a.planned_finish,
    float_days: 0,
    is_critical: false,
    variance_days: 0,
  });

  // Cycle safety: fall back to planned dates rather than crashing or looping.
  if (hasCycle(map)) return activities.map(planned);

  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  // Forward pass.
  for (const a of order(map)) {
    if (a.status === "COMPLETE" && a.actual_finish) {
      const start = toDay(a.actual_start ?? a.planned_start);
      es.set(a.id, start);
      ef.set(a.id, toDay(a.actual_finish));
      continue;
    }
    const ownStart = toDay(a.actual_start ?? a.planned_start);
    const predFinish = a.predecessor_id ? ef.get(a.predecessor_id) : undefined;
    const start = predFinish === undefined ? ownStart : Math.max(ownStart, predFinish);
    es.set(a.id, start);
    ef.set(a.id, start + remainingDuration(a));
  }

  // Backward pass. Successors index.
  const successors = new Map<string, string[]>();
  for (const a of activities) {
    if (a.predecessor_id && map.has(a.predecessor_id)) {
      const list = successors.get(a.predecessor_id) ?? [];
      list.push(a.id);
      successors.set(a.predecessor_id, list);
    }
  }

  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  const reverse = order(map).slice().reverse();
  for (const a of reverse) {
    const succ = successors.get(a.id) ?? [];
    if (succ.length === 0) {
      // Leaves carry zero float by definition.
      lf.set(a.id, ef.get(a.id)!);
    } else {
      lf.set(a.id, Math.min(...succ.map((s) => ls.get(s) ?? ef.get(s)!)));
    }
    ls.set(a.id, lf.get(a.id)! - (ef.get(a.id)! - es.get(a.id)!));
  }

  return activities.map((a) => {
    const floatDays = (ls.get(a.id) ?? 0) - (es.get(a.id) ?? 0);
    return {
      id: a.id,
      earliest_start: fromDay(es.get(a.id)!),
      earliest_finish: fromDay(ef.get(a.id)!),
      latest_start: fromDay(ls.get(a.id)!),
      latest_finish: fromDay(lf.get(a.id)!),
      float_days: floatDays,
      is_critical: floatDays <= 0,
      variance_days: ef.get(a.id)! - toDay(a.planned_finish),
    };
  });
}
