export function ProjectHeader({
  name,
  baselineCompletionDate,
  forecastCompletionDate,
  delayDays,
}: {
  name: string;
  baselineCompletionDate: string;
  forecastCompletionDate: string;
  delayDays: number;
}) {
  const isSlipping = delayDays > 0;

  return (
    <div className="rounded-[12px] bg-pure-white p-10">
      <h1 className="font-serif text-4xl font-light text-aged-sepia">{name}</h1>
      <div className="mt-4 flex flex-wrap gap-8 font-sans text-sm">
        <div>
          <p className="text-moss-shadow">Baseline completion</p>
          <p className="mt-1 text-aged-sepia">{baselineCompletionDate}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Forecast completion</p>
          <p className="mt-1 text-aged-sepia">{forecastCompletionDate}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Delay</p>
          <p
            className={
              isSlipping
                ? 'mt-1 font-mono text-teal-accent'
                : 'mt-1 font-mono text-aged-sepia'
            }
          >
            {delayDays} day{delayDays === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </div>
  );
}
