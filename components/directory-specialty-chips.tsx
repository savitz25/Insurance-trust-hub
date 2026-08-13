import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HUB_LOA_FILTERS, type HubLoaFilterId } from '@/components/hub-specialty-filter';

/** Map hub LOA ids → directory specialty query values */
const LOA_TO_SPECIALTY: Partial<Record<HubLoaFilterId, string>> = {
  health: 'Health',
  life: 'Life',
  pc: 'Property & Casualty',
  personal: 'Personal Lines',
  agency: 'Agency',
  title: 'Title',
  adjuster: 'Public Adjuster',
};

type Props = {
  activeSpecialty?: string;
  activeState?: string;
  className?: string;
};

/**
 * Phase 7 — shareable specialty chips on /directory (maps to ?specialty=).
 */
export function DirectorySpecialtyChips({
  activeSpecialty = '',
  activeState = '',
  className,
}: Props) {
  function hrefFor(id: HubLoaFilterId): string {
    const params = new URLSearchParams();
    if (activeState) params.set('state', activeState);
    if (id !== 'all') {
      const spec = LOA_TO_SPECIALTY[id];
      if (spec) params.set('specialty', spec);
    }
    params.set('verified', 'true');
    const q = params.toString();
    return q ? `/directory?${q}` : '/directory';
  }

  const activeId: HubLoaFilterId =
    (Object.entries(LOA_TO_SPECIALTY).find(
      ([, v]) => v.toLowerCase() === activeSpecialty.toLowerCase()
    )?.[0] as HubLoaFilterId | undefined) ?? 'all';

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Specialty (license capability tags)
      </p>
      <div className="flex flex-wrap gap-2" role="navigation" aria-label="Directory specialty">
        {HUB_LOA_FILTERS.map((f) => {
          const isActive = activeId === f.id;
          return (
            <Link
              key={f.id}
              href={hrefFor(f.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Counts include verified research listings only. Shareable via ?specialty=.
      </p>
    </div>
  );
}
