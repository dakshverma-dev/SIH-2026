import type { ExtractedEvent } from "./extraction";
import type { ScheduleActivity, ScoreSignal, TrustLevel } from "./types";

export interface MatchCandidate {
  activity: ScheduleActivity;
  score: number;
  breakdown: ScoreSignal[];
  trust_level: TrustLevel;
}

const STOP = new Set([
  "the", "and", "for", "with", "of", "on", "at", "to", "in", "a", "is", "was",
  "has", "been", "from", "by", "work", "site", "today", "shift",
]);

function tokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function norm(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[\s"]/g, "");
}

function partial(a: string, b: string): boolean {
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= 3 && longer.includes(shorter);
}

function signal(
  key: ScoreSignal["signal"],
  label: string,
  weight: number,
  hit: boolean,
): ScoreSignal {
  return { signal: key, label, weight: hit ? weight : 0, hit };
}

export function scoreCandidate(
  event: ExtractedEvent,
  activity: ScheduleActivity,
): { score: number; breakdown: ScoreSignal[] } {
  const breakdown: ScoreSignal[] = [];

  // Engineering tag.
  const evTag = norm(event.engineering_tag);
  const acTag = norm(activity.engineering_tag);
  if (evTag && acTag && evTag === acTag) {
    breakdown.push(signal("IDENTIFIER_TAG", "Engineering tag exact match", 0.35, true));
  } else if (evTag && acTag && partial(evTag, acTag)) {
    breakdown.push(signal("IDENTIFIER_TAG", "Engineering tag partial match", 0.18, true));
  } else {
    breakdown.push(signal("IDENTIFIER_TAG", "Engineering tag match", 0.35, false));
  }

  // Line / size identifier.
  const evLine = norm(event.line_number);
  const acLine = norm(activity.line_number);
  if (evLine && acLine && evLine === acLine) {
    breakdown.push(signal("IDENTIFIER_LINE", "Line identifier exact match", 0.15, true));
  } else if (evLine && acLine && partial(evLine, acLine)) {
    breakdown.push(signal("IDENTIFIER_LINE", "Line identifier partial match", 0.08, true));
  } else {
    breakdown.push(signal("IDENTIFIER_LINE", "Line identifier match", 0.15, false));
  }

  // Discipline.
  if (event.discipline && activity.discipline) {
    if (event.discipline.toUpperCase() === activity.discipline.toUpperCase()) {
      breakdown.push(signal("DISCIPLINE", "Discipline match", 0.15, true));
    } else {
      breakdown.push({
        signal: "DISCIPLINE",
        label: "Discipline mismatch",
        weight: -0.1,
        hit: true,
      });
    }
  } else {
    breakdown.push(signal("DISCIPLINE", "Discipline match", 0.15, false));
  }

  // Location.
  const locHit =
    !!event.location &&
    !!activity.location &&
    norm(event.location) === norm(activity.location);
  breakdown.push(signal("LOCATION", "Location match", 0.1, locHit));

  // Lexical description overlap.
  const evTokens = tokens(event.activity_description);
  const acTokens = new Set(tokens(activity.description));
  const overlap = evTokens.filter((t) => acTokens.has(t)).length;
  const ratio = evTokens.length === 0 ? 0 : overlap / evTokens.length;
  const semanticWeight = Math.round(ratio * 0.25 * 100) / 100;
  breakdown.push({
    signal: "SEMANTIC",
    label: `Description overlap (${overlap}/${evTokens.length} terms)`,
    weight: semanticWeight,
    hit: semanticWeight > 0,
  });

  // Schedule-status plausibility.
  if (activity.status === "COMPLETE") {
    breakdown.push({
      signal: "SCHEDULE_STATUS",
      label: "Activity already complete",
      weight: -0.2,
      hit: true,
    });
  } else if (activity.status === "IN_PROGRESS") {
    breakdown.push(signal("SCHEDULE_STATUS", "Activity in progress", 0.05, true));
  } else if (event.event_type === "COMPLETION" && activity.status === "NOT_STARTED") {
    breakdown.push({
      signal: "SCHEDULE_STATUS",
      label: "Reported complete but not started",
      weight: -0.05,
      hit: true,
    });
  } else {
    breakdown.push(signal("SCHEDULE_STATUS", "Schedule status plausibility", 0.05, false));
  }

  const raw = breakdown.reduce((sum, s) => sum + s.weight, 0);
  const score = Math.round(Math.min(Math.max(raw, 0), 1) * 100) / 100;
  return { score, breakdown };
}

export function trustLevelFor(score: number): TrustLevel {
  if (score <= 0) return "UNMATCHED";
  if (score >= 0.75) return "HIGH";
  if (score >= 0.45) return "MEDIUM";
  return "LOW";
}

export function rankCandidates(
  event: ExtractedEvent,
  activities: ScheduleActivity[],
): MatchCandidate[] {
  return activities
    .map((activity) => {
      const { score, breakdown } = scoreCandidate(event, activity);
      return { activity, score, breakdown, trust_level: trustLevelFor(score) };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Routing decision. HIGH is auto-post eligible, MEDIUM and LOW require review,
 * a zero or negative total is never forced onto an activity.
 */
export function routeMatch(candidates: MatchCandidate[]) {
  const best = candidates[0];
  if (!best || best.score <= 0) {
    return {
      best_activity_id: null,
      confidence: 0,
      trust_level: "UNMATCHED" as TrustLevel,
      status: "PENDING" as const,
      score_breakdown: best?.breakdown ?? [],
    };
  }
  return {
    best_activity_id: best.activity.id,
    confidence: best.score,
    trust_level: best.trust_level,
    status: (best.trust_level === "HIGH" ? "APPROVED" : "PENDING") as "APPROVED" | "PENDING",
    score_breakdown: best.breakdown,
  };
}
