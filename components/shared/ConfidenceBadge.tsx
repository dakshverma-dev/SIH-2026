export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.85 ? 'text-aged-sepia bg-fog/40' :
    confidence >= 0.5 ? 'text-teal-accent bg-teal-accent/10' :
    'text-moss-shadow bg-fog/60';

  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-1 font-mono text-xs ${tone}`}
    >
      {pct}%
    </span>
  );
}
