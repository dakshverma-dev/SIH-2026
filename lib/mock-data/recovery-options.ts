import type { RecoveryOption } from '../types';

export const recoveryOptions: RecoveryOption[] = [
  { id: 'rec-1', description: 'Add second shift on P104 piping erection (PIP-324)', projectedCompletionDate: '2026-06-20', tradeoffNote: 'Higher labor cost, requires night-shift supervision coverage.' },
  { id: 'rec-2', description: 'Resequence: start hydrotest prep (PIP-326) partially in parallel with weld inspection (PIP-327)', projectedCompletionDate: '2026-06-21', tradeoffNote: 'Increases congestion risk in the work area; needs a safety review.' },
  { id: 'rec-3', description: 'Add manpower to punch clearance (PIP-331) to recover lost float before handover', projectedCompletionDate: '2026-06-22', tradeoffNote: 'Additional crew mobilization lead time of 2-3 days.' },
];
