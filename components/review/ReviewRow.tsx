'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MatchResult, ExecutionEvent, FieldUpdate } from '@/lib/types';
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge';
import { RouteBadge } from '@/components/shared/RouteBadge';
import { CandidateList } from './CandidateList';

export function ReviewRow({
  match,
  event,
  fieldUpdate,
  onAccept,
  onReject,
  onReassign,
  expanded: expandedProp,
}: {
  match: MatchResult;
  event: ExecutionEvent | undefined;
  fieldUpdate: FieldUpdate | undefined;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
  onReassign: (matchId: string, newActivityId: string) => void;
  expanded?: boolean;
}) {
  const [expandedState, setExpandedState] = useState(expandedProp ?? false);
  const isUnmatched = match.route === 'unmatched';

  return (
    <div
      className={
        isUnmatched
          ? 'rounded-[12px] bg-pure-white p-6 border border-fog'
          : 'rounded-[12px] bg-pure-white p-6'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-sans text-sm text-aged-sepia">
            {fieldUpdate?.rawText ?? 'Field text unavailable'}
          </p>
          <p className="mt-1 font-mono text-xs text-moss-shadow">
            {isUnmatched
              ? 'No matching schedule activity found — this is a valid outcome, not an error.'
              : `Suggested match: ${match.matchedActivityId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={match.confidence} />
          <RouteBadge route={match.route} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onAccept(match.id)}
          className="rounded-[4px] bg-teal-accent px-3 py-1.5 font-sans text-xs text-pure-white hover:opacity-90"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(match.id)}
          className="rounded-[4px] border border-fog px-3 py-1.5 font-sans text-xs text-aged-sepia hover:bg-fog/30"
        >
          Reject
        </button>
        <button
          onClick={() => setExpandedState((e) => !e)}
          className="rounded-[4px] border border-fog px-3 py-1.5 font-sans text-xs text-aged-sepia hover:bg-fog/30"
        >
          {expandedState ? 'Hide candidates' : 'Show candidates'}
        </button>
        <Link
          href={`/evidence/${match.id}`}
          className="ml-auto font-mono text-xs text-teal-accent underline"
        >
          Why this match?
        </Link>
      </div>

      {expandedState && (
        <div className="mt-4 border-t border-fog pt-4">
          <CandidateList
            candidates={match.candidates}
            onSelect={(activityId) => onReassign(match.id, activityId)}
          />
        </div>
      )}
    </div>
  );
}
