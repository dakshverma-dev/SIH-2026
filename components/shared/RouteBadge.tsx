import type { MatchRoute } from '@/lib/types';

const LABELS: Record<MatchRoute, string> = {
  auto_post: 'Auto-posted',
  review: 'Needs review',
  unmatched: 'Unmatched',
};

const TONES: Record<MatchRoute, string> = {
  auto_post: 'text-aged-sepia bg-fog/40',
  review: 'text-teal-accent bg-teal-accent/10',
  unmatched: 'text-moss-shadow bg-fog/60',
};

export function RouteBadge({ route }: { route: MatchRoute }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-1 font-mono text-xs uppercase tracking-wide ${TONES[route]}`}
    >
      {LABELS[route]}
    </span>
  );
}
