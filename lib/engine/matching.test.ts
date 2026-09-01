import { describe, it, expect } from "vitest";
import { scoreCandidate } from "./matching";
import type { ScheduleActivityRow } from "./matching";
import type { ExtractedEvent } from "./extraction";

function activity(overrides: Partial<ScheduleActivityRow>): ScheduleActivityRow {
  return {
    id: "act-1",
    project_id: "p1",
    activity_id: "PIP-R3-2401",
    wbs: "1.2.3.2",
    discipline: "Piping",
    description: "24-inch Header Spool Erection — Rack 3",
    location: "Rack 3",
    engineering_tag: "PIP-R3-2401",
    line_number: "24-inch header",
    contractor: "Larsen Mech Co.",
    planned_start: "2026-08-10",
    planned_finish: "2026-08-24",
    actual_start: "2026-08-10",
    actual_finish: null,
    progress: 40,
    duration_days: 14,
    predecessor_id: null,
    is_critical: true,
    status: "IN_PROGRESS",
    ...overrides,
  };
}

function event(overrides: Partial<ExtractedEvent>): ExtractedEvent {
  return {
    event_type: "PROGRESS_UPDATE",
    activity_description: "spool erection",
    engineering_tag: null,
    line_number: null,
    location: null,
    discipline: null,
    progress: null,
    actual_start: null,
    actual_finish: null,
    quantity: null,
    unit: null,
    delay_reason: null,
    evidence_span: "spool erection at Rack 3",
    extraction_mode: "DEMO_FALLBACK",
    ...overrides,
  };
}

describe("scoreCandidate — identifier signals", () => {
  it("gives the largest weight to an exact engineering tag match", () => {
    const s = scoreCandidate(event({ engineering_tag: "PIP-R3-2401" }), activity({}));
    const tagSignal = s.find((x) => x.signal === "IDENTIFIER_TAG");
    expect(tagSignal?.hit).toBe(true);
    expect(tagSignal?.weight).toBe(0.35);
  });

  it("gives a smaller, non-zero weight to a partial tag match", () => {
    const s = scoreCandidate(event({ engineering_tag: "PIP-R3" }), activity({ engineering_tag: "PIP-R3-2401" }));
    const tagSignal = s.find((x) => x.signal === "IDENTIFIER_TAG");
    expect(tagSignal?.weight).toBe(0.18);
    expect(tagSignal?.weight).toBeLessThan(0.35);
  });

  it("records zero weight (not silence) when tags are both present but differ", () => {
    const s = scoreCandidate(event({ engineering_tag: "ELE-U2-1201" }), activity({ engineering_tag: "PIP-R3-2401" }));
    const tagSignal = s.find((x) => x.signal === "IDENTIFIER_TAG");
    expect(tagSignal?.hit).toBe(false);
    expect(tagSignal?.weight).toBe(0);
  });
});

describe("scoreCandidate — schedule context signals", () => {
  it("rewards discipline alignment and penalizes mismatch", () => {
    const match = scoreCandidate(event({ discipline: "Piping" }), activity({ discipline: "Piping" }));
    expect(match.find((x) => x.signal === "DISCIPLINE")?.weight).toBe(0.15);

    const mismatch = scoreCandidate(event({ discipline: "Electrical" }), activity({ discipline: "Piping" }));
    expect(mismatch.find((x) => x.signal === "DISCIPLINE")?.weight).toBe(-0.1);
  });

  it("penalizes matching against an already-COMPLETE activity", () => {
    const s = scoreCandidate(event({}), activity({ status: "COMPLETE" }));
    const statusSignal = s.find((x) => x.signal === "SCHEDULE_STATUS");
    expect(statusSignal?.weight).toBe(-0.2);
  });

  it("rewards timing plausibility against an IN_PROGRESS activity", () => {
    const s = scoreCandidate(event({}), activity({ status: "IN_PROGRESS" }));
    expect(s.find((x) => x.signal === "SCHEDULE_STATUS")?.weight).toBe(0.05);
  });
});

describe("scoreCandidate — the sum of weights is the whole story", () => {
  it("a strong, unambiguous field report scores near the top of the scale", () => {
    const s = scoreCandidate(
      event({
        engineering_tag: "PIP-R3-2401",
        line_number: "24-inch header",
        discipline: "Piping",
        location: "Rack 3",
        activity_description: "24-inch header spool erection",
        event_type: "PROGRESS_COMPLETE",
      }),
      activity({})
    );
    const total = s.reduce((sum, x) => sum + x.weight, 0);
    expect(total).toBeGreaterThan(0.8);
  });

  it("a vague report with no identifiers scores low, and the breakdown says why", () => {
    const s = scoreCandidate(event({ activity_description: "work progressing" }), activity({}));
    const total = s.reduce((sum, x) => sum + x.weight, 0);
    expect(total).toBeLessThan(0.15);
    // The reasoning must be inspectable — no signal fired silently
    expect(s.every((x) => typeof x.label === "string" && x.label.length > 0)).toBe(true);
  });
});
