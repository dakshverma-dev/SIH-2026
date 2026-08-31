import type { ScheduleActivity } from '../types';

// Source of truth: Preethy's "Schedule_Activities" sheet (Plan2Reality - Ontology and
// Benchmark.xlsx). That sheet's 15 IDs are extended here to 20 with additional
// realistic activities in the same style (asset/location/discipline conventions),
// since the frontend test suite requires exactly 20 activities.
// NOTE: Preethy's separate "Activity_Register" sheet reuses some of these IDs
// (e.g. PIP-325) for a different activity with its own duration/predecessor data —
// flagged to Preethy as an inconsistency. Schedule_Activities is treated as canonical.
export const scheduleActivities: ScheduleActivity[] = [
  { id: 'PIP-321', wbsCode: '1.3.2.4.3.1', description: 'Fabricate P104 piping spool', plannedStart: '2026-06-01', plannedFinish: '2026-06-05', durationDays: 4, dependencies: [], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'PIP-322', wbsCode: '1.3.2.4.3.2', description: 'Install P104 pipe supports', plannedStart: '2026-06-06', plannedFinish: '2026-06-08', durationDays: 3, dependencies: ['PIP-321'], currentProgressPercent: 60, isCriticalPath: true },
  { id: 'PIP-323', wbsCode: '1.3.2.4.3.3', description: 'Transport P104 spool to workfront', plannedStart: '2026-06-09', plannedFinish: '2026-06-09', durationDays: 1, dependencies: ['PIP-322'], currentProgressPercent: 45, isCriticalPath: true },
  { id: 'PIP-324', wbsCode: '1.3.2.4.3.3', description: 'Erect P104 piping spool - Rack 3', plannedStart: '2026-06-10', plannedFinish: '2026-06-12', durationDays: 3, dependencies: ['PIP-323'], currentProgressPercent: 45, isCriticalPath: true },
  { id: 'PIP-325', wbsCode: '1.3.2.4.4.3', description: 'Erect P104 piping spool - Rack 4', plannedStart: '2026-06-10', plannedFinish: '2026-06-12', durationDays: 3, dependencies: ['PIP-322'], currentProgressPercent: 30, isCriticalPath: false },
  { id: 'PIP-326', wbsCode: '1.3.2.4.3.5', description: 'Hydrotest P104 piping - Rack 3', plannedStart: '2026-06-13', plannedFinish: '2026-06-14', durationDays: 2, dependencies: ['PIP-324'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'PIP-327', wbsCode: '1.3.2.4.3.4', description: 'Inspect P104 weld joints - Rack 3', plannedStart: '2026-06-13', plannedFinish: '2026-06-13', durationDays: 1, dependencies: ['PIP-324'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'PIP-328', wbsCode: '1.3.2.4.5.3', description: 'Erect P105 piping spool - Rack 3', plannedStart: '2026-06-10', plannedFinish: '2026-06-12', durationDays: 3, dependencies: ['PIP-322'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'PIP-329', wbsCode: '1.3.2.4.5.5', description: 'Pneumatic test P105 piping - Rack 3', plannedStart: '2026-06-13', plannedFinish: '2026-06-14', durationDays: 2, dependencies: ['PIP-328'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'PIP-330', wbsCode: '1.3.2.4.3.6a', description: 'Complete P104 flange bolting - Rack 3', plannedStart: '2026-06-15', plannedFinish: '2026-06-15', durationDays: 1, dependencies: ['PIP-326', 'PIP-327'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'PIP-331', wbsCode: '1.3.2.4.3.6', description: 'Complete P104 punch items - Rack 3', plannedStart: '2026-06-16', plannedFinish: '2026-06-17', durationDays: 2, dependencies: ['PIP-330'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'CIV-112', wbsCode: '1.3.1.1.1.1', description: 'Excavate T201 tank foundation', plannedStart: '2026-06-01', plannedFinish: '2026-06-05', durationDays: 5, dependencies: [], currentProgressPercent: 65, isCriticalPath: false },
  { id: 'CIV-113', wbsCode: '1.3.1.1.1.2', description: 'Pour T201 foundation concrete', plannedStart: '2026-06-06', plannedFinish: '2026-06-09', durationDays: 4, dependencies: ['CIV-112'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'ELE-341', wbsCode: '1.3.2.5.1.1', description: 'Pull P104 power cable - Substation B', plannedStart: '2026-06-10', plannedFinish: '2026-06-12', durationDays: 3, dependencies: [], currentProgressPercent: 80, isCriticalPath: false },
  { id: 'ELE-342', wbsCode: '1.3.2.5.1.2', description: 'Terminate P104 power cable - Substation B', plannedStart: '2026-06-13', plannedFinish: '2026-06-14', durationDays: 2, dependencies: ['ELE-341'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'ELE-343', wbsCode: '1.3.2.5.1.3', description: 'Megger test P104 power cable - Substation B', plannedStart: '2026-06-15', plannedFinish: '2026-06-15', durationDays: 1, dependencies: ['ELE-342'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'MEC-201', wbsCode: '1.3.2.6.1.1', description: 'Set P104 pump baseplate - Rack 3', plannedStart: '2026-06-10', plannedFinish: '2026-06-11', durationDays: 2, dependencies: ['CIV-113'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'MEC-202', wbsCode: '1.3.2.6.1.2', description: 'Align P104 pump - Rack 3', plannedStart: '2026-06-12', plannedFinish: '2026-06-13', durationDays: 2, dependencies: ['MEC-201'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'QA-401', wbsCode: '1.3.2.4.3.7', description: 'Final walkdown - P104 piping system', plannedStart: '2026-06-18', plannedFinish: '2026-06-18', durationDays: 1, dependencies: ['PIP-331'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'QA-402', wbsCode: '1.3.2.4.3.8', description: 'Handover P104 system to commissioning', plannedStart: '2026-06-19', plannedFinish: '2026-06-19', durationDays: 1, dependencies: ['QA-401', 'PIP-329'], currentProgressPercent: 0, isCriticalPath: true },
];
