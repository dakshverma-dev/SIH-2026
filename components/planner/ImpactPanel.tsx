import type { ScheduleImpact } from '@/lib/types';

export function ImpactPanel({ impact }: { impact: ScheduleImpact }) {
  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <h2 className="font-serif text-xl text-aged-sepia">Schedule impact</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 font-sans text-sm">
        <div>
          <p className="text-moss-shadow">Critical path moved</p>
          <p className="mt-1 text-aged-sepia">{impact.criticalPathMoved ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Revised completion</p>
          <p className="mt-1 text-aged-sepia">{impact.revisedCompletionDate}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Delay</p>
          <p className="mt-1 text-aged-sepia">{impact.delayDays} days</p>
        </div>
      </div>
      <p className="mt-4 font-mono text-xs text-moss-shadow">
        Affected activities: {impact.affectedActivityIds.join(', ')}
      </p>
    </div>
  );
}
