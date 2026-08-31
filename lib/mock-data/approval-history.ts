export interface ApprovalHistoryEntry {
  id: string;
  action: 'submitted' | 'auto_posted' | 'flagged_for_review' | 'accepted' | 'rejected';
  actor: string;
  timestamp: string;
  note?: string;
}

export const approvalHistory: Record<string, ApprovalHistoryEntry[]> = {
  'm-1': [
    { id: 'h-1', action: 'submitted', actor: 'System', timestamp: '2026-06-10T18:05:00Z' },
    { id: 'h-2', action: 'auto_posted', actor: 'Match & Trust engine', timestamp: '2026-06-10T18:05:02Z', note: 'Confidence 97% — above auto-post threshold.' },
  ],
  'm-6': [
    { id: 'h-3', action: 'submitted', actor: 'System', timestamp: '2026-06-12T14:05:00Z' },
    { id: 'h-4', action: 'flagged_for_review', actor: 'Match & Trust engine', timestamp: '2026-06-12T14:05:03Z', note: 'Contradiction detected against prior report m-5 (progress regression).' },
  ],
  'm-10': [
    { id: 'h-5', action: 'submitted', actor: 'System', timestamp: '2026-06-15T11:05:00Z' },
    { id: 'h-6', action: 'flagged_for_review', actor: 'Match & Trust engine', timestamp: '2026-06-15T11:05:02Z', note: 'No schedule activity found above minimum confidence.' },
  ],
};
