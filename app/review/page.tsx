'use client';

import { useEffect, useState } from 'react';
import { useReviewStore } from '@/lib/store/review-store';
import { getExecutionEvents } from '@/lib/api/updates';
import { getFieldUpdates } from '@/lib/api/updates';
import { ReviewRow } from '@/components/review/ReviewRow';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import type { ExecutionEvent, FieldUpdate } from '@/lib/types';

export default function ReviewQueue() {
  const { matches, loading, error, accept, reject, reassign } = useReviewStore();
  const [events, setEvents] = useState<ExecutionEvent[] | null>(null);
  const [updates, setUpdates] = useState<FieldUpdate[] | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getExecutionEvents(), getFieldUpdates()])
      .then(([e, u]) => {
        setEvents(e);
        setUpdates(u);
      })
      .catch(() => setJoinError('Failed to load field data.'));
  }, []);

  if (error || joinError) {
    return (
      <main className="mx-auto max-w-4xl p-10">
        <ErrorState message={error ?? joinError ?? 'Unknown error'} />
      </main>
    );
  }

  if (loading || !events || !updates) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-10">
        <Skeleton variant="row" count={5} />
      </main>
    );
  }

  const queue = matches
    .filter((m) => m.route === 'review' || m.route === 'unmatched')
    .sort((a, b) => a.confidence - b.confidence);

  return (
    <main className="mx-auto max-w-4xl space-y-7 p-10">
      <h1 className="font-serif text-3xl font-light text-aged-sepia">Review queue</h1>
      <div className="flex flex-col gap-4">
        {queue.map((match) => {
          const event = events.find((e) => e.id === match.executionEventId);
          const fieldUpdate = updates.find((u) => u.id === event?.fieldUpdateId);
          return (
            <ReviewRow
              key={match.id}
              match={match}
              event={event}
              fieldUpdate={fieldUpdate}
              onAccept={accept}
              onReject={reject}
              onReassign={reassign}
            />
          );
        })}
      </div>
    </main>
  );
}
