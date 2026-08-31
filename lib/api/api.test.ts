import { describe, it, expect } from 'vitest';
import { getFieldUpdates, getExecutionEvents } from './updates';
import { getActivities, getActivity } from './activities';
import { getMatches, getMatch } from './matches';
import { getScheduleImpact } from './impact';
import { getRecoveryOptions } from './recovery';

describe('data-access layer', () => {
  it('getFieldUpdates returns a promise resolving to an array', async () => {
    const result = getFieldUpdates();
    expect(result).toBeInstanceOf(Promise);
    const updates = await result;
    expect(updates.length).toBeGreaterThan(0);
  });

  it('getExecutionEvents resolves to an array', async () => {
    const events = await getExecutionEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it('getActivities resolves to exactly 20 activities', async () => {
    const activities = await getActivities();
    expect(activities).toHaveLength(20);
  });

  it('getActivity returns a matching activity for a real ID', async () => {
    const activity = await getActivity('PIP-321');
    expect(activity?.id).toBe('PIP-321');
  });

  it('getActivity returns null for an unknown ID', async () => {
    const activity = await getActivity('does-not-exist');
    expect(activity).toBeNull();
  });

  it('getMatches resolves to an array', async () => {
    const matches = await getMatches();
    expect(matches.length).toBeGreaterThan(0);
  });

  it('getMatch returns a matching result for a real ID', async () => {
    const match = await getMatch('m-1');
    expect(match?.id).toBe('m-1');
  });

  it('getMatch returns null for an unknown ID', async () => {
    const match = await getMatch('does-not-exist');
    expect(match).toBeNull();
  });

  it('getScheduleImpact resolves to a single ScheduleImpact object', async () => {
    const impact = await getScheduleImpact();
    expect(impact.delayDays).toBeGreaterThan(0);
  });

  it('getRecoveryOptions resolves to an array of at least 3', async () => {
    const options = await getRecoveryOptions();
    expect(options.length).toBeGreaterThanOrEqual(3);
  });
});
