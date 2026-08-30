import type { ScheduleActivity } from '../types';

export const scheduleActivities: ScheduleActivity[] = [
  { id: 'act-1', wbsCode: 'L5.1.1', description: 'Site mobilization', plannedStart: '2026-06-01', plannedFinish: '2026-06-05', durationDays: 5, dependencies: [], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-2', wbsCode: 'L5.1.2', description: 'Foundation excavation - Area A', plannedStart: '2026-06-06', plannedFinish: '2026-06-15', durationDays: 10, dependencies: ['act-1'], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-3', wbsCode: 'L5.1.3', description: 'Foundation concrete pour - Area A', plannedStart: '2026-06-16', plannedFinish: '2026-06-25', durationDays: 10, dependencies: ['act-2'], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-4', wbsCode: 'L5.1.4', description: 'Foundation excavation - Area B', plannedStart: '2026-06-06', plannedFinish: '2026-06-13', durationDays: 8, dependencies: ['act-1'], currentProgressPercent: 100, isCriticalPath: false },
  { id: 'act-5', wbsCode: 'L5.1.5', description: 'Foundation concrete pour - Area B', plannedStart: '2026-06-14', plannedFinish: '2026-06-21', durationDays: 8, dependencies: ['act-4'], currentProgressPercent: 100, isCriticalPath: false },
  { id: 'act-6', wbsCode: 'L5.2.1', description: 'Structural steel erection - Bay 1', plannedStart: '2026-06-26', plannedFinish: '2026-07-10', durationDays: 15, dependencies: ['act-3'], currentProgressPercent: 90, isCriticalPath: true },
  { id: 'act-7', wbsCode: 'L5.2.2', description: 'Structural steel erection - Bay 2', plannedStart: '2026-06-22', plannedFinish: '2026-07-05', durationDays: 14, dependencies: ['act-5'], currentProgressPercent: 85, isCriticalPath: false },
  { id: 'act-8', wbsCode: 'L5.2.3', description: 'Pipe rack erection', plannedStart: '2026-07-11', plannedFinish: '2026-07-20', durationDays: 10, dependencies: ['act-6'], currentProgressPercent: 60, isCriticalPath: true },
  { id: 'act-9', wbsCode: 'L5.2.4', description: 'Vessel setting - Unit 100', plannedStart: '2026-07-06', plannedFinish: '2026-07-16', durationDays: 11, dependencies: ['act-7'], currentProgressPercent: 55, isCriticalPath: false },
  { id: 'act-10', wbsCode: 'L5.3.1', description: 'Line 24 piping erection', plannedStart: '2026-07-21', plannedFinish: '2026-08-04', durationDays: 15, dependencies: ['act-8'], currentProgressPercent: 45, isCriticalPath: true },
  { id: 'act-11', wbsCode: 'L5.3.2', description: 'Line 12 piping erection', plannedStart: '2026-07-17', plannedFinish: '2026-07-28', durationDays: 12, dependencies: ['act-9'], currentProgressPercent: 40, isCriticalPath: false },
  { id: 'act-12', wbsCode: 'L5.3.3', description: 'Instrumentation tubing - Unit 100', plannedStart: '2026-07-29', plannedFinish: '2026-08-10', durationDays: 13, dependencies: ['act-11'], currentProgressPercent: 20, isCriticalPath: false },
  { id: 'act-13', wbsCode: 'L5.4.1', description: 'Electrical cable tray installation', plannedStart: '2026-08-05', plannedFinish: '2026-08-15', durationDays: 11, dependencies: ['act-10'], currentProgressPercent: 10, isCriticalPath: true },
  { id: 'act-14', wbsCode: 'L5.4.2', description: 'Electrical cable pulling', plannedStart: '2026-08-16', plannedFinish: '2026-08-25', durationDays: 10, dependencies: ['act-13'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'act-15', wbsCode: 'L5.4.3', description: 'Motor termination - Unit 100', plannedStart: '2026-08-11', plannedFinish: '2026-08-18', durationDays: 8, dependencies: ['act-12'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'act-16', wbsCode: 'L5.5.1', description: 'Hydrotest - Line 24', plannedStart: '2026-08-26', plannedFinish: '2026-09-02', durationDays: 8, dependencies: ['act-14'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'act-17', wbsCode: 'L5.5.2', description: 'Hydrotest - Line 12', plannedStart: '2026-08-19', plannedFinish: '2026-08-26', durationDays: 8, dependencies: ['act-15'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'act-18', wbsCode: 'L5.6.1', description: 'Insulation - Line 24', plannedStart: '2026-09-03', plannedFinish: '2026-09-10', durationDays: 8, dependencies: ['act-16'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'act-19', wbsCode: 'L5.6.2', description: 'Painting - Bay 1 & 2', plannedStart: '2026-08-27', plannedFinish: '2026-09-05', durationDays: 10, dependencies: ['act-17'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'act-20', wbsCode: 'L5.7.1', description: 'Mechanical completion - Unit 100', plannedStart: '2026-09-11', plannedFinish: '2026-09-18', durationDays: 8, dependencies: ['act-18', 'act-19'], currentProgressPercent: 0, isCriticalPath: true },
];
