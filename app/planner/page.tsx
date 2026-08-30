'use client';

import { useEffect, useState } from 'react';
import { getActivities } from '@/lib/api/activities';
import { getMatches } from '@/lib/api/matches';
import { getScheduleImpact } from '@/lib/api/impact';
import { getRecoveryOptions } from '@/lib/api/recovery';
import { ProjectHeader } from '@/components/planner/ProjectHeader';
import { ActivitiesTable } from '@/components/planner/ActivitiesTable';
import { CountsStrip } from '@/components/planner/CountsStrip';
import { ImpactPanel } from '@/components/planner/ImpactPanel';
import { RecoveryOptions } from '@/components/planner/RecoveryOptions';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import type { ScheduleActivity, MatchResult, ScheduleImpact, RecoveryOption } from '@/lib/types';

export default function PlannerConsole() {
  const [activities, setActivities] = useState<ScheduleActivity[] | null>(null);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [impact, setImpact] = useState<ScheduleImpact | null>(null);
  const [recovery, setRecovery] = useState<RecoveryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getActivities(), getMatches(), getScheduleImpact(), getRecoveryOptions()])
      .then(([a, m, i, r]) => {
        setActivities(a);
        setMatches(m);
        setImpact(i);
        setRecovery(r);
      })
      .catch(() => setError('Failed to load project data.'));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-10">
        <ErrorState message={error} />
      </main>
    );
  }

  if (!activities || !matches || !impact || !recovery) {
    return (
      <main className="mx-auto max-w-6xl space-y-7 p-10">
        <Skeleton variant="card" count={1} />
        <Skeleton variant="row" count={5} />
      </main>
    );
  }

  const delayDays = impact.delayDays;
  const baseline = activities.reduce(
    (latest, a) => (a.plannedFinish > latest ? a.plannedFinish : latest),
    activities[0]?.plannedFinish ?? ''
  );

  return (
    <main className="mx-auto max-w-6xl space-y-7 p-10">
      <ProjectHeader
        name="Unit 100 Piping & Electrical Package"
        baselineCompletionDate={baseline}
        forecastCompletionDate={impact.revisedCompletionDate}
        delayDays={delayDays}
      />
      <CountsStrip matches={matches} />
      <ActivitiesTable activities={activities} />
      <ImpactPanel impact={impact} />
      <RecoveryOptions options={recovery} />
    </main>
  );
}
