'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getMatch } from '@/lib/api/matches';
import { getExecutionEvents, getFieldUpdates } from '@/lib/api/updates';
import { getActivity } from '@/lib/api/activities';
import { EvidenceText } from '@/components/evidence/EvidenceText';
import { ReasonsBreakdown } from '@/components/evidence/ReasonsBreakdown';
import { ApprovalHistory } from '@/components/evidence/ApprovalHistory';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { approvalHistory } from '@/lib/mock-data/approval-history';
import type { MatchResult, ExecutionEvent, FieldUpdate, ScheduleActivity } from '@/lib/types';

export default function EvidenceView() {
  const params = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [event, setEvent] = useState<ExecutionEvent | null>(null);
  const [fieldUpdate, setFieldUpdate] = useState<FieldUpdate | null>(null);
  const [activity, setActivity] = useState<ScheduleActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const m = await getMatch(params.matchId);
      if (!m) {
        setError('Match not found.');
        setLoading(false);
        return;
      }
      const events = await getExecutionEvents();
      const ev = events.find((e) => e.id === m.executionEventId) ?? null;
      const updates = await getFieldUpdates();
      const fu = updates.find((u) => u.id === ev?.fieldUpdateId) ?? null;
      const act = m.matchedActivityId ? await getActivity(m.matchedActivityId) : null;

      setMatch(m);
      setEvent(ev);
      setFieldUpdate(fu);
      setActivity(act);
      setLoading(false);
    }
    load().catch(() => {
      setError('Failed to load evidence.');
      setLoading(false);
    });
  }, [params.matchId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-10">
        <ErrorState message={error} />
      </main>
    );
  }

  if (loading || !match) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-10">
        <Skeleton variant="card" count={3} />
      </main>
    );
  }

  const history = approvalHistory[match.id] ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-7 p-10">
      <h1 className="font-serif text-3xl font-light text-aged-sepia">Evidence</h1>

      <EvidenceText rawText={fieldUpdate?.rawText ?? ''} excerpt={fieldUpdate?.evidence.excerpt} />

      <div className="rounded-[12px] bg-pure-white p-6">
        <h2 className="font-serif text-xl text-aged-sepia">Matched activity</h2>
        {activity ? (
          <div className="mt-2 font-sans text-sm text-aged-sepia">
            <p className="font-mono text-xs text-moss-shadow">{activity.wbsCode}</p>
            <p>{activity.description}</p>
          </div>
        ) : (
          <p className="mt-2 font-sans text-sm text-moss-shadow">
            No activity matched — routed as unmatched.
          </p>
        )}
      </div>

      <ReasonsBreakdown reasons={match.reasons} />

      <ApprovalHistory entries={history} />
    </main>
  );
}
