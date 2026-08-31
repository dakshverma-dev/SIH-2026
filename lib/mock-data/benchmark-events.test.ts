import { describe, it, expect } from 'vitest';
import { benchmarkEvents } from './benchmark-events';
import { scheduleActivities } from './activities';

// This is the "build benchmark test set from Benchmark_Events sheet" deliverable.
// It validates the fixture's OWN integrity (30-row gold-standard set), independent
// of whether Kartik's matcher exists yet. Once his module lands, run-benchmark.test.ts
// (separate file) will run these 30 cases through the real pipeline.
describe('benchmarkEvents fixture (Preethy Benchmark_Events gold standard)', () => {
  const activityIds = new Set(scheduleActivities.map((a) => a.id));

  it('has exactly 30 cases (B001-B030)', () => {
    expect(benchmarkEvents).toHaveLength(30);
  });

  it('has unique case IDs', () => {
    const ids = benchmarkEvents.map((c) => c.caseId);
    expect(new Set(ids).size).toBe(30);
  });

  it('every MATCH case has an expectedActivityId that exists in scheduleActivities', () => {
    for (const c of benchmarkEvents) {
      if (c.expectedDecision === 'MATCH') {
        expect(c.expectedActivityId).not.toBeNull();
        expect(activityIds.has(c.expectedActivityId as string)).toBe(true);
      }
    }
  });

  it('every UNMATCHED case has a null expectedActivityId', () => {
    for (const c of benchmarkEvents) {
      if (c.expectedDecision === 'UNMATCHED') {
        expect(c.expectedActivityId).toBeNull();
      }
    }
  });

  it('every case has a non-empty field report and domain rationale', () => {
    for (const c of benchmarkEvents) {
      expect(c.fieldReport.length).toBeGreaterThan(0);
      expect(c.domainRationale.length).toBeGreaterThan(0);
    }
  });

  it('difficulty is always Easy, Medium, or Hard', () => {
    const valid = new Set(['Easy', 'Medium', 'Hard']);
    for (const c of benchmarkEvents) {
      expect(valid.has(c.difficulty)).toBe(true);
    }
  });

  it('testSplit is always Train or Test', () => {
    const valid = new Set(['Train', 'Test']);
    for (const c of benchmarkEvents) {
      expect(valid.has(c.testSplit)).toBe(true);
    }
  });

  it('includes at least 5 UNMATCHED cases (negative examples matter)', () => {
    const unmatched = benchmarkEvents.filter((c) => c.expectedDecision === 'UNMATCHED');
    expect(unmatched.length).toBeGreaterThanOrEqual(5);
  });

  it('includes at least 3 REVIEW cases (ambiguous/missing-context examples)', () => {
    const review = benchmarkEvents.filter((c) => c.expectedDecision === 'REVIEW');
    expect(review.length).toBeGreaterThanOrEqual(3);
  });

  it('includes at least 5 Hard difficulty cases', () => {
    const hard = benchmarkEvents.filter((c) => c.difficulty === 'Hard');
    expect(hard.length).toBeGreaterThanOrEqual(5);
  });

  it('includes both Train and Test split cases', () => {
    const splits = new Set(benchmarkEvents.map((c) => c.testSplit));
    expect(splits.has('Train')).toBe(true);
    expect(splits.has('Test')).toBe(true);
  });

  it('covers near-duplicate disambiguation by location, asset, and activity type', () => {
    const caseTypes = benchmarkEvents.map((c) => c.caseType);
    expect(caseTypes).toContain('Location disambiguation');
    expect(caseTypes).toContain('Asset disambiguation');
    expect(caseTypes).toContain('Activity disambiguation');
  });
});
