import type { RecoveryOption } from '@/lib/types';

export function RecoveryOptions({ options }: { options: RecoveryOption[] }) {
  return (
    <div>
      <h2 className="font-serif text-xl text-aged-sepia">Recovery options</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {options.map((option) => (
          <div key={option.id} className="rounded-[12px] bg-pure-white p-6">
            <p className="font-sans text-sm text-aged-sepia">{option.description}</p>
            <p className="mt-3 font-mono text-xs text-teal-accent">
              Projected: {option.projectedCompletionDate}
            </p>
            <p className="mt-2 font-sans text-xs text-moss-shadow">{option.tradeoffNote}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
