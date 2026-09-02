import { describe, expect, it } from "vitest";
import { computeCpm, type CpmActivity } from "./cpm";

function act(p: Partial<CpmActivity> & { id: string }): CpmActivity {
  return {
    planned_start: "2026-01-01",
    planned_finish: "2026-01-11",
    actual_start: null,
    actual_finish: null,
    progress: 0,
    duration_days: 10,
    predecessor_id: null,
    status: "NOT_STARTED",
    ...p,
  };
}

describe("computeCpm", () => {
  it("returns an empty list for empty input", () => {
    expect(computeCpm([])).toEqual([]);
  });

  it("propagates predecessor slippage forward", () => {
    const res = computeCpm([
      act({ id: "a", actual_start: "2026-01-06", duration_days: 10 }),
      act({ id: "b", predecessor_id: "a", planned_start: "2026-01-11", planned_finish: "2026-01-16", duration_days: 5 }),
    ]);
    const b = res.find((r) => r.id === "b")!;
    expect(b.earliest_start).toBe("2026-01-16");
    expect(b.earliest_finish).toBe("2026-01-21");
    expect(b.variance_days).toBe(5);
  });

  it("gives leaves zero float and upstream fan-out non-negative float", () => {
    const res = computeCpm([
      act({ id: "root", duration_days: 4, planned_finish: "2026-01-05" }),
      act({ id: "long", predecessor_id: "root", duration_days: 10 }),
      act({ id: "short", predecessor_id: "root", duration_days: 2 }),
    ]);
    expect(res.find((r) => r.id === "long")!.float_days).toBe(0);
    expect(res.find((r) => r.id === "short")!.float_days).toBeGreaterThanOrEqual(0);
  });

  it("uses the real actual_finish for completed activities", () => {
    const res = computeCpm([
      act({
        id: "done",
        status: "COMPLETE",
        progress: 100,
        actual_start: "2026-01-01",
        actual_finish: "2026-01-20",
      }),
    ]);
    expect(res[0]!.earliest_finish).toBe("2026-01-20");
    expect(res[0]!.variance_days).toBe(9);
  });

  it("does not hang or crash on a predecessor cycle", () => {
    const res = computeCpm([
      act({ id: "a", predecessor_id: "b" }),
      act({ id: "b", predecessor_id: "a" }),
    ]);
    expect(res).toHaveLength(2);
    expect(res[0]!.earliest_finish).toBe("2026-01-11");
  });
});
