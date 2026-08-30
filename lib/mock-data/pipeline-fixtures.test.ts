import { describe, it, expect } from 'vitest';
import { fieldUpdates } from './field-updates';
import { executionEvents } from './execution-events';
import { matchResults } from './match-results';
import { scheduleActivities } from './activities';

describe('pipeline fixtures referential integrity', () => {
  const fieldUpdateIds = new Set(fieldUpdates.map((f) => f.id));
  const executionEventIds = new Set(executionEvents.map((e) => e.id));
  const activityIds = new Set(scheduleActivities.map((a) => a.id));

  it('every ExecutionEvent references a real FieldUpdate', () => {
    for (const event of executionEvents) {
      expect(fieldUpdateIds.has(event.fieldUpdateId)).toBe(true);
    }
  });

  it('every MatchResult references a real ExecutionEvent', () => {
    for (const match of matchResults) {
      expect(executionEventIds.has(match.executionEventId)).toBe(true);
    }
  });

  it('every non-null matchedActivityId references a real ScheduleActivity', () => {
    for (const match of matchResults) {
      if (match.matchedActivityId !== null) {
        expect(activityIds.has(match.matchedActivityId)).toBe(true);
      }
    }
  });

  it('unmatched routes always have a null matchedActivityId', () => {
    for (const match of matchResults) {
      if (match.route === 'unmatched') {
        expect(match.matchedActivityId).toBeNull();
      }
    }
  });

  it('includes a contradiction case (progress went backwards)', () => {
    const hasContradiction = matchResults.some(
      (m) => m.reasons.contradictions && m.reasons.contradictions.length > 0
    );
    expect(hasContradiction).toBe(true);
  });

  it('includes an update with no matched identifiers (semantic+context only)', () => {
    const semanticOnly = matchResults.some(
      (m) => m.reasons.identifiersMatched.length === 0 && m.route !== 'unmatched'
    );
    expect(semanticOnly).toBe(true);
  });

  it('includes a genuinely unmatched activity', () => {
    const unmatched = matchResults.filter((m) => m.route === 'unmatched');
    expect(unmatched.length).toBeGreaterThanOrEqual(1);
  });

  it('includes multiple clean high-confidence auto_post cases', () => {
    const autoPosted = matchResults.filter(
      (m) => m.route === 'auto_post' && m.confidence >= 0.85
    );
    expect(autoPosted.length).toBeGreaterThanOrEqual(3);
  });

  it('includes two updates describing the same work differently, both matching the same activity', () => {
    const byActivity = new Map<string, number>();
    for (const match of matchResults) {
      if (match.matchedActivityId) {
        byActivity.set(
          match.matchedActivityId,
          (byActivity.get(match.matchedActivityId) ?? 0) + 1
        );
      }
    }
    const hasDuplicateMatch = [...byActivity.values()].some((count) => count >= 2);
    expect(hasDuplicateMatch).toBe(true);
  });

  it('includes a date-inconsistency case flagged in contextChecks.timing', () => {
    const timingFailure = matchResults.some((m) => m.reasons.contextChecks.timing === false);
    expect(timingFailure).toBe(true);
  });
});
