import { describe, it, expect } from 'vitest';
import type {
  FieldUpdate,
  ExecutionEvent,
  MatchResult,
  ScheduleActivity,
  ScheduleImpact,
  RecoveryOption,
} from './types';

describe('type contract shapes', () => {
  it('accepts a minimal valid FieldUpdate', () => {
    const update: FieldUpdate = {
      id: 'fu-1',
      projectId: 'proj-1',
      rawText: 'Line 24 erection complete',
      sourceFormat: 'text',
      timestamp: '2026-08-01T10:00:00Z',
      evidence: { sourceId: 'doc-1', sourceType: 'text' },
    };
    expect(update.id).toBe('fu-1');
  });

  it('accepts an ExecutionEvent with optional fields omitted', () => {
    const event: ExecutionEvent = {
      id: 'ev-1',
      fieldUpdateId: 'fu-1',
      activityDescription: 'Spool erected',
      progressPercent: 45,
      reportedDate: '2026-08-01',
      evidence: { sourceId: 'doc-1', sourceType: 'text' },
    };
    expect(event.location).toBeUndefined();
  });

  it('accepts a MatchResult with null matchedActivityId (unmatched)', () => {
    const match: MatchResult = {
      id: 'm-1',
      executionEventId: 'ev-1',
      matchedActivityId: null,
      confidence: 0.12,
      route: 'unmatched',
      reasons: {
        identifiersMatched: [],
        semanticSimilarity: 0.2,
        contextChecks: {
          wbs: false,
          location: false,
          discipline: false,
          timing: false,
          dependencies: false,
        },
      },
    };
    expect(match.candidates).toBeUndefined();
  });

  it('accepts a ScheduleActivity', () => {
    const activity: ScheduleActivity = {
      id: 'act-1',
      wbsCode: 'L5.1.2',
      description: 'Pipe rack erection',
      plannedStart: '2026-07-01',
      plannedFinish: '2026-07-15',
      durationDays: 14,
      dependencies: [],
      currentProgressPercent: 60,
      isCriticalPath: true,
    };
    expect(activity.isCriticalPath).toBe(true);
  });

  it('accepts a ScheduleImpact', () => {
    const impact: ScheduleImpact = {
      affectedActivityIds: ['act-1'],
      criticalPathMoved: true,
      revisedCompletionDate: '2026-09-01',
      delayDays: 5,
    };
    expect(impact.delayDays).toBe(5);
  });

  it('accepts a RecoveryOption', () => {
    const option: RecoveryOption = {
      id: 'rec-1',
      description: 'Add second shift',
      projectedCompletionDate: '2026-08-28',
      tradeoffNote: 'Higher labor cost',
    };
    expect(option.id).toBe('rec-1');
  });
});
