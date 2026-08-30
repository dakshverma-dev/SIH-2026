import type { MatchReasons } from '@/lib/types';

const CHECK_LABELS: Record<keyof MatchReasons['contextChecks'], string> = {
  wbs: 'WBS code',
  location: 'Location',
  discipline: 'Discipline',
  timing: 'Timing',
  dependencies: 'Dependencies',
};

export function ReasonsBreakdown({ reasons }: { reasons: MatchReasons }) {
  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <h2 className="font-serif text-xl text-aged-sepia">Why this match</h2>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase text-moss-shadow">Identifiers matched</p>
        {reasons.identifiersMatched.length === 0 ? (
          <p className="mt-1 font-sans text-sm text-moss-shadow">None — matched by semantics and schedule context alone.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {reasons.identifiersMatched.map((id) => (
              <span key={id} className="rounded-[4px] bg-fog/40 px-2 py-1 font-mono text-xs text-aged-sepia">
                {id}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase text-moss-shadow">Semantic similarity</p>
        <p className="mt-1 font-mono text-sm text-aged-sepia">
          {Math.round(reasons.semanticSimilarity * 100)}%
        </p>
      </div>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase text-moss-shadow">Schedule-context checks</p>
        <ul className="mt-2 flex flex-col gap-1">
          {(Object.keys(reasons.contextChecks) as Array<keyof MatchReasons['contextChecks']>).map((key) => (
            <li
              key={key}
              data-testid={`context-check-${key}`}
              data-passed={reasons.contextChecks[key]}
              className="flex items-center justify-between font-sans text-sm"
            >
              <span className="text-aged-sepia">{CHECK_LABELS[key]}</span>
              <span className={reasons.contextChecks[key] ? 'text-teal-accent' : 'text-moss-shadow'}>
                {reasons.contextChecks[key] ? 'Passed' : 'Failed'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {reasons.contradictions && reasons.contradictions.length > 0 && (
        <div className="mt-4 rounded-[4px] border border-fog bg-fog/20 p-4">
          <p className="font-mono text-xs uppercase text-moss-shadow">Contradictions flagged</p>
          <ul className="mt-2 flex flex-col gap-1">
            {reasons.contradictions.map((c, i) => (
              <li key={i} className="font-sans text-sm text-aged-sepia">{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
