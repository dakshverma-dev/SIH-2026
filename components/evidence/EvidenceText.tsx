export function EvidenceText({
  rawText,
  excerpt,
}: {
  rawText: string;
  excerpt: string | undefined;
}) {
  if (!excerpt) {
    return (
      <div className="rounded-[12px] bg-pure-white p-6">
        <p className="font-sans text-sm text-aged-sepia">{rawText}</p>
        <p className="mt-2 font-mono text-xs text-moss-shadow">Excerpt not available.</p>
      </div>
    );
  }

  const index = rawText.indexOf(excerpt);
  if (index === -1) {
    return (
      <div className="rounded-[12px] bg-pure-white p-6">
        <p className="font-sans text-sm text-aged-sepia">{rawText}</p>
        <p className="mt-2 font-mono text-xs text-moss-shadow">Excerpt not available.</p>
      </div>
    );
  }

  const before = rawText.slice(0, index);
  const after = rawText.slice(index + excerpt.length);

  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <p className="font-sans text-sm text-aged-sepia">
        {before}
        <mark className="rounded-[4px] bg-teal-accent/20 px-1 text-aged-sepia">{excerpt}</mark>
        {after}
      </p>
    </div>
  );
}
