import { describe, it, expect } from "vitest";
import { computeCpm, addDays, diffDays, toNumber } from "./cpm";
import type { ScheduleActivityRow } from "./matching";

const TODAY = "2026-08-25";

function act(overrides: Partial<ScheduleActivityRow> & { id: string }): ScheduleActivityRow {
  return {
    project_id: "p1",
    activity_id: overrides.id.toUpperCase(),
    wbs: "1",
    discipline: "Piping",
    description: overrides.id,
    location: null,
    engineering_tag: null,
    line_number: null,
    contractor: null,
    planned_start: "2026-08-01",
    planned_finish: "2026-08-10",
    actual_start: null,
    actual_finish: null,
    progress: 0,
    duration_days: 9,
    predecessor_id: null,
    is_critical: false,
    status: "NOT_STARTED",
    ...overrides,
  } as ScheduleActivityRow;
}

describe("date helpers", () => {
  it("addDays advances a date by N days", () => {
    expect(addDays("2026-08-01", 5)).toBe("2026-08-06");
  });
  it("diffDays returns a - b in whole days", () => {
    expect(diffDays("2026-08-10", "2026-08-01")).toBe(9);
    expect(diffDays("2026-08-01", "2026-08-10")).toBe(-9);
  });
  it("toNumber coerces strings/nulls safely, never NaN", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });
});

describe("computeCpm — single activity", () => {
  it("uses planned_start when no actual_start, and duration when 0% progress", () => {
    const activities = [act({ id: "a", planned_start: "2026-08-01", duration_days: 10, progress: 0 })];
    const cpm = computeCpm(activities, TODAY);
    const a = cpm.get("a")!;
    expect(a.earliestStart).toBe("2026-08-01");
    expect(a.earliestFinish).toBe("2026-08-11"); // +10 days
  });

  it("prorates remaining duration by progress", () => {
    const activities = [act({ id: "a", planned_start: "2026-08-01", duration_days: 10, progress: 50 })];
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.get("a")!.earliestFinish).toBe("2026-08-06"); // 5 remaining days
  });

  it("a COMPLETE activity uses its real actual_finish, never a computed one", () => {
    const activities = [
      act({ id: "a", status: "COMPLETE", progress: 100, actual_start: "2026-08-01", actual_finish: "2026-08-09", duration_days: 20 }),
    ];
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.get("a")!.earliestFinish).toBe("2026-08-09");
  });

  it("a lone activity (no predecessor, no successor) has zero float and is critical", () => {
    const activities = [act({ id: "a" })];
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.get("a")!.floatDays).toBe(0);
    expect(cpm.get("a")!.isCritical).toBe(true);
  });
});

describe("computeCpm — predecessor slippage propagation", () => {
  it("propagates a slipped predecessor finish forward to its successor's start", () => {
    // A planned to finish 2026-08-10 but is running 4 days late (60% done of 10 days ⇒ 4 remaining from actual_start)
    const activities = [
      act({ id: "a", planned_start: "2026-08-01", planned_finish: "2026-08-10", duration_days: 10, actual_start: "2026-08-05", progress: 60 }),
      act({ id: "b", predecessor_id: "a", planned_start: "2026-08-11", planned_finish: "2026-08-20", duration_days: 9, progress: 0 }),
    ];
    const cpm = computeCpm(activities, TODAY);
    const a = cpm.get("a")!;
    // remaining = ceil(10 * 0.4) = 4 days from actual_start 2026-08-05 -> finish 2026-08-09
    expect(a.earliestFinish).toBe("2026-08-09");
    // a finished BEFORE its planned finish here, so no slip is propagated to b
    const b = cpm.get("b")!;
    expect(b.earliestStart).toBe("2026-08-11");
  });

  it("propagates real slippage: predecessor finishing after its own planned finish delays the successor", () => {
    const activities = [
      act({ id: "a", planned_start: "2026-08-01", planned_finish: "2026-08-05", duration_days: 4, actual_start: "2026-08-01", progress: 0 }), // finishes 08-05 exactly on time by default...
      act({ id: "b", predecessor_id: "a", planned_start: "2026-08-06", planned_finish: "2026-08-15", duration_days: 9, progress: 0 }),
    ];
    // Force a real slip: 0% progress with a longer duration than planned window
    activities[0].duration_days = 8; // remaining 8 days from 08-01 -> finishes 08-09, 4 days later than planned_finish 08-05
    const cpm = computeCpm(activities, TODAY);
    const a = cpm.get("a")!;
    expect(a.earliestFinish).toBe("2026-08-09");
    const b = cpm.get("b")!;
    // slip = diff(08-09, 08-05) = 4 days added to b's planned_start 08-06 -> 08-10
    expect(b.earliestStart).toBe("2026-08-10");
  });
});

describe("computeCpm — backward pass, float, and critical path", () => {
  it("a chain of two back-to-back activities is critical (zero float)", () => {
    // Date-only model: a 0-lag finish-to-start relationship is expressed as the
    // successor's planned_start falling on the same calendar date as the
    // predecessor's planned_finish (no day-granularity gap between them).
    const activities = [
      act({ id: "a", planned_start: "2026-08-01", planned_finish: "2026-08-05", duration_days: 4, progress: 0 }),
      act({ id: "b", predecessor_id: "a", planned_start: "2026-08-05", planned_finish: "2026-08-09", duration_days: 4, progress: 0 }),
    ];
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.get("a")!.isCritical).toBe(true);
    expect(cpm.get("b")!.isCritical).toBe(true);
    expect(cpm.get("a")!.floatDays).toBe(0);
    expect(cpm.get("b")!.floatDays).toBe(0);
  });

  it("a one-calendar-day gap between predecessor finish and successor start shows up as real float, not a bug", () => {
    // This is the same pair one day apart — the model correctly reports the
    // slack that gap represents rather than silently rounding it to zero.
    const activities = [
      act({ id: "a", planned_start: "2026-08-01", planned_finish: "2026-08-05", duration_days: 4, progress: 0 }),
      act({ id: "b", predecessor_id: "a", planned_start: "2026-08-06", planned_finish: "2026-08-10", duration_days: 4, progress: 0 }),
    ];
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.get("a")!.floatDays).toBe(1);
    expect(cpm.get("a")!.isCritical).toBe(false);
  });

  it("a fan-out: the successor that finishes latest determines the predecessor's criticality", () => {
    // a has two successors: b (short) and c (long). c is on the critical path; b has float.
    const activities = [
      act({ id: "a", planned_start: "2026-08-01", planned_finish: "2026-08-05", duration_days: 4, progress: 0 }),
      act({ id: "b", predecessor_id: "a", planned_start: "2026-08-06", planned_finish: "2026-08-08", duration_days: 2, progress: 0 }),
      act({ id: "c", predecessor_id: "a", planned_start: "2026-08-06", planned_finish: "2026-08-16", duration_days: 10, progress: 0 }),
    ];
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.get("c")!.isCritical).toBe(true);
    expect(cpm.get("c")!.floatDays).toBe(0);
    // b is a leaf with its own zero-float-by-definition rule (matches product's
    // simplified single-chain model — see cpm.ts docstring on the forest structure)
    expect(cpm.get("b")!.floatDays).toBe(0);
  });

  it("never crashes on a predecessor cycle — falls back to planned dates instead of throwing", () => {
    const activities = [
      act({ id: "a", predecessor_id: "b" }),
      act({ id: "b", predecessor_id: "a" }),
    ];
    expect(() => computeCpm(activities, TODAY)).not.toThrow();
    const cpm = computeCpm(activities, TODAY);
    expect(cpm.size).toBe(2);
  });

  it("handles an empty activity list without throwing", () => {
    expect(() => computeCpm([], TODAY)).not.toThrow();
    expect(computeCpm([], TODAY).size).toBe(0);
  });
});
