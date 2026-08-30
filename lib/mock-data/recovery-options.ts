import type { RecoveryOption } from '../types';

export const recoveryOptions: RecoveryOption[] = [
  { id: 'rec-1', description: 'Add second shift on Line 24 piping erection (act-10)', projectedCompletionDate: '2026-09-20', tradeoffNote: 'Higher labor cost, requires night-shift supervision coverage.' },
  { id: 'rec-2', description: 'Resequence: start electrical cable tray (act-13) partially in parallel with piping tail end', projectedCompletionDate: '2026-09-22', tradeoffNote: 'Increases congestion risk in the work area; needs a safety review.' },
  { id: 'rec-3', description: 'Add manpower to pipe rack erection (act-8) to recover lost float', projectedCompletionDate: '2026-09-23', tradeoffNote: 'Additional crew mobilization lead time of 3-4 days.' },
];
