import { describe, it, expect } from 'vitest';
import { scheduleActivities } from './activities';

describe('scheduleActivities fixture', () => {
  it('has exactly 20 activities', () => {
    expect(scheduleActivities).toHaveLength(20);
  });

  it('has unique IDs', () => {
    const ids = scheduleActivities.map((a) => a.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('every dependency references a real activity ID', () => {
    const ids = new Set(scheduleActivities.map((a) => a.id));
    for (const activity of scheduleActivities) {
      for (const dep of activity.dependencies) {
        expect(ids.has(dep)).toBe(true);
      }
    }
  });

  it('has at least one critical-path chain of 4+ activities', () => {
    const critical = scheduleActivities.filter((a) => a.isCriticalPath);
    expect(critical.length).toBeGreaterThanOrEqual(4);
  });

  it('has at least one non-critical activity with dependencies (parallel branch)', () => {
    const nonCriticalWithDeps = scheduleActivities.filter(
      (a) => !a.isCriticalPath && a.dependencies.length > 0
    );
    expect(nonCriticalWithDeps.length).toBeGreaterThan(0);
  });

  it('every activity has a WBS code and positive duration', () => {
    for (const activity of scheduleActivities) {
      expect(activity.wbsCode.length).toBeGreaterThan(0);
      expect(activity.durationDays).toBeGreaterThan(0);
    }
  });
});
