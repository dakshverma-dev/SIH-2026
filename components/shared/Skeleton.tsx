export function Skeleton({
  variant,
  count = 1,
}: {
  variant: 'row' | 'card';
  count?: number;
}) {
  const items = Array.from({ length: count });
  const base = 'animate-pulse bg-fog/50 rounded-[4px]';

  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {items.map((_, i) => (
        <div
          key={i}
          data-skeleton-item
          className={
            variant === 'row'
              ? `${base} h-12 w-full`
              : `${base} h-40 w-full rounded-[12px]`
          }
        />
      ))}
    </div>
  );
}
