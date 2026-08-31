import type { MatchResult } from '../types';

export const matchResults: MatchResult[] = [
  // Clean high-confidence auto_post cases (Benchmark_Events B001, B008, B012, B009)
  {
    id: 'm-1', executionEventId: 'ev-1', matchedActivityId: 'PIP-324', confidence: 0.97, route: 'auto_post',
    reasons: { identifiersMatched: ['P104', 'Rack 3', '24 in'], semanticSimilarity: 0.95, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-2', executionEventId: 'ev-2', matchedActivityId: 'PIP-322', confidence: 0.94, route: 'auto_post',
    reasons: { identifiersMatched: ['P104', 'Rack 3', 'supports installed'], semanticSimilarity: 0.92, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-3', executionEventId: 'ev-7', matchedActivityId: 'CIV-113', confidence: 0.93, route: 'auto_post',
    reasons: { identifiersMatched: ['T201', 'foundation casting'], semanticSimilarity: 0.9, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-4', executionEventId: 'ev-8', matchedActivityId: 'CIV-112', confidence: 0.9, route: 'auto_post',
    reasons: { identifiersMatched: ['T-201', 'excavation'], semanticSimilarity: 0.88, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Same physical work (P104 erection at Rack 3), described two different ways,
  // both matching PIP-324 — mirrors Terminology_Variants V001-V010
  {
    id: 'm-5', executionEventId: 'ev-4', matchedActivityId: 'PIP-324', confidence: 0.88, route: 'auto_post',
    reasons: { identifiersMatched: ['P104', 'Rack 3'], semanticSimilarity: 0.86, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Contradiction: ev-4 reported 60% (m-5), ev-5 reports 45% on the same activity —
  // Conflict_Cases C001 PROGRESS_REGRESSION
  {
    id: 'm-6', executionEventId: 'ev-5', matchedActivityId: 'PIP-324', confidence: 0.55, route: 'review',
    reasons: {
      identifiersMatched: ['P104', 'Rack 3'], semanticSimilarity: 0.83,
      contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true },
      contradictions: ['Progress reported at 60% on 2026-06-11 (m-5), but this report claims 45% on 2026-06-12 — progress regression needs planner review.'],
    },
    candidates: [ { activityId: 'PIP-324', confidence: 0.55 } ],
  },
  // Near-duplicate distinguished only by location (Rack 3 vs Rack 4) — Benchmark B002
  {
    id: 'm-7', executionEventId: 'ev-3', matchedActivityId: 'PIP-325', confidence: 0.81, route: 'review',
    reasons: {
      identifiersMatched: ['P104'], semanticSimilarity: 0.79,
      contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true },
    },
    candidates: [ { activityId: 'PIP-325', confidence: 0.81 }, { activityId: 'PIP-324', confidence: 0.42 } ],
  },
  // Near-duplicate distinguished only by asset tag (P104 vs P105) — Benchmark B004
  {
    id: 'm-8', executionEventId: 'ev-9', matchedActivityId: 'PIP-328', confidence: 0.89, route: 'auto_post',
    reasons: { identifiersMatched: ['P105', 'Rack 3'], semanticSimilarity: 0.87, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Missing identifier, matched only via semantics + context — Benchmark B016/B018 style
  {
    id: 'm-9', executionEventId: 'ev-11', matchedActivityId: null, confidence: 0.38, route: 'review',
    reasons: {
      identifiersMatched: [], semanticSimilarity: 0.41,
      contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: false },
    },
    candidates: [ { activityId: 'PIP-324', confidence: 0.38 }, { activityId: 'PIP-325', confidence: 0.35 }, { activityId: 'PIP-328', confidence: 0.22 } ],
  },
  // Genuinely unmatched: no painting activity or P208 asset in baseline — Benchmark B021
  {
    id: 'm-10', executionEventId: 'ev-12', matchedActivityId: null, confidence: 0.12, route: 'unmatched',
    reasons: { identifiersMatched: [], semanticSimilarity: 0.15, contextChecks: { wbs: false, location: false, discipline: false, timing: false, dependencies: false } },
  },
  // Timing/date inconsistency: cable install event reported far outside its
  // predecessor's planned window
  {
    id: 'm-11', executionEventId: 'ev-10', matchedActivityId: 'ELE-341', confidence: 0.62, route: 'review',
    reasons: {
      identifiersMatched: ['Substation B'], semanticSimilarity: 0.75,
      contextChecks: { wbs: true, location: true, discipline: true, timing: false, dependencies: true },
      contradictions: ['Reported completion date 2026-06-14 falls before the activity\'s planned start window confirmed in the schedule — timing check failed.'],
    },
    candidates: [ { activityId: 'ELE-341', confidence: 0.62 } ],
  },
  // Typo/abbreviation robustness — Benchmark B005 (V007 "erctn")
  {
    id: 'm-13', executionEventId: 'ev-14', matchedActivityId: 'PIP-324', confidence: 0.79, route: 'review',
    reasons: { identifiersMatched: ['P104', 'Rack 3'], semanticSimilarity: 0.7, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true } },
    candidates: [ { activityId: 'PIP-324', confidence: 0.79 } ],
  },
  // Natural language, no activity ID, relies on size+location context — Benchmark B006 (V008)
  {
    id: 'm-14', executionEventId: 'ev-15', matchedActivityId: 'PIP-324', confidence: 0.74, route: 'review',
    reasons: { identifiersMatched: ['24 in', 'Rack 3'], semanticSimilarity: 0.68, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true } },
    candidates: [ { activityId: 'PIP-324', confidence: 0.74 }, { activityId: 'PIP-325', confidence: 0.3 } ],
  },
  // Granularity — vague enough it may aggregate multiple spools (V009, Low reliability)
  {
    id: 'm-15', executionEventId: 'ev-16', matchedActivityId: null, confidence: 0.35, route: 'review',
    reasons: { identifiersMatched: [], semanticSimilarity: 0.4, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: false } },
    candidates: [ { activityId: 'PIP-324', confidence: 0.35 }, { activityId: 'PIP-325', confidence: 0.28 }, { activityId: 'PIP-328', confidence: 0.2 } ],
  },
  // Status language implying ACTUAL_START, not completion — Benchmark B020 (V010)
  {
    id: 'm-16', executionEventId: 'ev-17', matchedActivityId: 'PIP-324', confidence: 0.86, route: 'auto_post',
    reasons: { identifiersMatched: ['P104', 'Rack 3'], semanticSimilarity: 0.84, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Trade shorthand for flange bolting — Benchmark B010 (V028)
  {
    id: 'm-17', executionEventId: 'ev-18', matchedActivityId: 'PIP-330', confidence: 0.91, route: 'auto_post',
    reasons: { identifiersMatched: ['P104', 'Rack 3', 'bolt-up'], semanticSimilarity: 0.89, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Punch clearance completion synonym — Benchmark B011 (V031)
  {
    id: 'm-18', executionEventId: 'ev-19', matchedActivityId: 'PIP-331', confidence: 0.93, route: 'auto_post',
    reasons: { identifiersMatched: ['P104', 'Rack 3', 'punch points'], semanticSimilarity: 0.91, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Mixed update containing two events (supports complete + erection started) —
  // Benchmark B030, extractor should ideally split; shown here as a review case
  {
    id: 'm-12', executionEventId: 'ev-13', matchedActivityId: null, confidence: 0.5, route: 'review',
    reasons: {
      identifiersMatched: ['P104', 'Rack 3'], semanticSimilarity: 0.6,
      contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true },
      contradictions: ['Report contains two distinct events (supports complete -> PIP-322, erection started -> PIP-324); extractor should split before matching.'],
    },
    candidates: [ { activityId: 'PIP-322', confidence: 0.5 }, { activityId: 'PIP-324', confidence: 0.48 } ],
  },
];
