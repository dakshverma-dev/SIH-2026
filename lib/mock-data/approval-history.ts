export interface ApprovalHistoryEntry {
  id: string;
  action: 'submitted' | 'auto_posted' | 'flagged_for_review' | 'accepted' | 'rejected';
  actor: string;
  timestamp: string;
  note?: string;
}

export const approvalHistory: Record<string, ApprovalHistoryEntry[]> = {
  'm-1': [
    { id: 'h-1', action: 'submitted', actor: 'System', timestamp: '2026-07-08T18:05:00Z' },
    { id: 'h-2', action: 'auto_posted', actor: 'Match & Trust engine', timestamp: '2026-07-08T18:05:02Z', note: 'Confidence 96% — above auto-post threshold.' },
  ],
  'm-8': [
    { id: 'h-3', action: 'submitted', actor: 'System', timestamp: '2026-08-04T14:05:00Z' },
    { id: 'h-4', action: 'flagged_for_review', actor: 'Match & Trust engine', timestamp: '2026-08-04T14:05:03Z', note: 'Contradiction detected against prior report m-7.' },
  ],
  'm-9': [
    { id: 'h-5', action: 'submitted', actor: 'System', timestamp: '2026-08-05T11:05:00Z' },
    { id: 'h-6', action: 'flagged_for_review', actor: 'Match & Trust engine', timestamp: '2026-08-05T11:05:02Z', note: 'No schedule activity found above minimum confidence.' },
  ],
};
