import type { ScheduleImpact } from '../types';
import { scheduleImpact } from '../mock-data/schedule-impact';

export async function getScheduleImpact(): Promise<ScheduleImpact> {
  return scheduleImpact;
}
