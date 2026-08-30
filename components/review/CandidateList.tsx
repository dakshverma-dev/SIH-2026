import type { MatchCandidate } from '@/lib/types';

export function CandidateList({
  candidates,
  onSelect,
}: {
  candidates: MatchCandidate[] | undefined;
  onSelect: (activityId: string) => void;
}) {
  if (!candidates || candidates.length === 0) {
    return <p className="font-sans text-xs text-moss-shadow">No alternative matches found.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((c) => (
        <li key={c.activityId} className="flex items-center justify-between">
          <span className="font-mono text-xs text-aged-sepia">{c.activityId}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-moss-shadow">
              {Math.round(c.confidence * 100)}%
            </span>
            <button
              onClick={() => onSelect(c.activityId)}
              className="rounded-[4px] border border-fog px-2 py-1 font-sans text-xs text-aged-sepia hover:bg-fog/30"
            >
              Select
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
