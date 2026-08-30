import type { MatchResult } from '../types';

export const matchResults: MatchResult[] = [
  // Clean high-confidence auto_post cases
  {
    id: 'm-1', executionEventId: 'ev-1', matchedActivityId: 'act-6', confidence: 0.96, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.2.1', 'Bay 1'], semanticSimilarity: 0.94, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-2', executionEventId: 'ev-7', matchedActivityId: 'act-3', confidence: 0.98, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.1.3', 'Area A'], semanticSimilarity: 0.97, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-3', executionEventId: 'ev-8', matchedActivityId: 'act-4', confidence: 0.95, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.1.4', 'Area B'], semanticSimilarity: 0.93, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-4', executionEventId: 'ev-9', matchedActivityId: 'act-9', confidence: 0.91, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.2.4', 'Unit 100'], semanticSimilarity: 0.89, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Same work, described two different ways, both matching act-10 (Line 24 piping erection)
  {
    id: 'm-5', executionEventId: 'ev-3', matchedActivityId: 'act-10', confidence: 0.9, route: 'auto_post',
    reasons: { identifiersMatched: ['Line 24'], semanticSimilarity: 0.88, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-6', executionEventId: 'ev-4', matchedActivityId: 'act-10', confidence: 0.78, route: 'review',
    reasons: { identifiersMatched: ['Line 24'], semanticSimilarity: 0.72, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true } },
    candidates: [ { activityId: 'act-10', confidence: 0.78 }, { activityId: 'act-11', confidence: 0.31 } ],
  },
  // Contradiction: pipe rack reported 60% (ev-2, m-7) then a later report effectively regresses via ev-5's ambiguous match
  {
    id: 'm-7', executionEventId: 'ev-2', matchedActivityId: 'act-8', confidence: 0.93, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.2.3', 'pipe rack'], semanticSimilarity: 0.9, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-8', executionEventId: 'ev-5', matchedActivityId: 'act-8', confidence: 0.55, route: 'review',
    reasons: {
      identifiersMatched: [], semanticSimilarity: 0.61,
      contextChecks: { wbs: false, location: false, discipline: true, timing: true, dependencies: true },
      contradictions: ['Progress reported at 60% on 2026-07-18 (m-7), but a later report near the same area implies a lower completed state — needs planner review.'],
    },
    candidates: [ { activityId: 'act-8', confidence: 0.55 }, { activityId: 'act-9', confidence: 0.4 } ],
  },
  // Missing identifier, matched only via semantics + context
  {
    id: 'm-9', executionEventId: 'ev-6', matchedActivityId: null, confidence: 0.22, route: 'unmatched',
    reasons: { identifiersMatched: [], semanticSimilarity: 0.18, contextChecks: { wbs: false, location: false, discipline: false, timing: false, dependencies: false } },
  },
  // Date inconsistency: cable tray reported complete before dependent activity's planned window even opens relative to predecessor
  {
    id: 'm-10', executionEventId: 'ev-10', matchedActivityId: 'act-13', confidence: 0.62, route: 'review',
    reasons: {
      identifiersMatched: ['WBS L5.4.1'], semanticSimilarity: 0.8,
      contextChecks: { wbs: true, location: true, discipline: true, timing: false, dependencies: true },
      contradictions: ['Reported date 2026-09-20 falls before predecessor activity act-10 (Line 24 piping erection) planned finish of 2026-08-04 was confirmed complete — timing check failed.'],
    },
    candidates: [ { activityId: 'act-13', confidence: 0.62 } ],
  },
];
