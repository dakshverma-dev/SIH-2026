import type { ScheduleActivity } from '../types';
import { scheduleActivities } from '../mock-data/activities';

export async function getActivities(): Promise<ScheduleActivity[]> {
  return scheduleActivities;
}

export async function getActivity(id: string): Promise<ScheduleActivity | null> {
  return scheduleActivities.find((a) => a.id === id) ?? null;
}
