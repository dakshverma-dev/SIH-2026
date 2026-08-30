import { describe, it, expect } from 'vitest';
import { scheduleImpact } from './schedule-impact';
import { recoveryOptions } from './recovery-options';
import { scheduleActivities } from './activities';

describe('scheduleImpact fixture', () => {
  it('references real activity IDs', () => {
    const ids = new Set(scheduleActivities.map((a) => a.id));
    for (const id of scheduleImpact.affectedActivityIds) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('reports a positive delay consistent with criticalPathMoved', () => {
    expect(scheduleImpact.delayDays).toBeGreaterThan(0);
    expect(scheduleImpact.criticalPathMoved).toBe(true);
  });
});

describe('recoveryOptions fixture', () => {
  it('has at least 3 options', () => {
    expect(recoveryOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('every option has a non-empty description and tradeoff note', () => {
    for (const option of recoveryOptions) {
      expect(option.description.length).toBeGreaterThan(0);
      expect(option.tradeoffNote.length).toBeGreaterThan(0);
    }
  });
});
