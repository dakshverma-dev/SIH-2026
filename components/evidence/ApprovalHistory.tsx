import type { ApprovalHistoryEntry } from '@/lib/mock-data/approval-history';

const ACTION_LABELS: Record<ApprovalHistoryEntry['action'], string> = {
  submitted: 'Submitted',
  auto_posted: 'Auto-posted',
  flagged_for_review: 'Flagged for review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export function ApprovalHistory({ entries }: { entries: ApprovalHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[12px] bg-pure-white p-6">
        <h2 className="font-serif text-xl text-aged-sepia">Validation history</h2>
        <p className="mt-2 font-sans text-sm text-moss-shadow">No history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <h2 className="font-serif text-xl text-aged-sepia">Validation history</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="border-l-2 border-fog pl-4">
            <p className="font-sans text-sm text-aged-sepia">
              {ACTION_LABELS[entry.action]} <span className="text-moss-shadow">by {entry.actor}</span>
            </p>
            <p className="font-mono text-xs text-moss-shadow">{entry.timestamp}</p>
            {entry.note && <p className="mt-1 font-sans text-xs text-aged-sepia">{entry.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
