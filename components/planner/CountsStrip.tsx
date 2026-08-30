import type { MatchResult } from '@/lib/types';

export function CountsStrip({ matches }: { matches: MatchResult[] }) {
  const autoPosted = matches.filter((m) => m.route === 'auto_post').length;
  const review = matches.filter((m) => m.route === 'review').length;
  const unmatched = matches.filter((m) => m.route === 'unmatched').length;

  const items = [
    { label: 'Auto-posted', value: autoPosted },
    { label: 'Awaiting review', value: review },
    { label: 'Unmatched', value: unmatched },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[12px] bg-pure-white p-6">
          <p className="font-mono text-3xl text-aged-sepia">{item.value}</p>
          <p className="mt-1 font-sans text-sm text-moss-shadow">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
