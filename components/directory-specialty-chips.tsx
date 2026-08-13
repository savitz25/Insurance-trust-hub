import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HUB_LOA_FILTERS, type HubLoaFilterId } from '@/components/hub-specialty-filter';
import { buildDirectoryHref } from '@/lib/directory/params';

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
  searchParams?: Record<string, string>;
  className?: string;
};

/**
 * Shareable specialty chips on /directory (maps to ?specialty=).
 * Labels are shared across FL / TX / OH — not Florida-only LOA framing.
 */
export function DirectorySpecialtyChips({
  activeSpecialty = '',
  searchParams = {},
  className,
}: Props) {
  function hrefFor(id: HubLoaFilterId): string {
    const specialty = id === 'all' ? null : LOA_TO_SPECIALTY[id] ?? null;
    return buildDirectoryHref(searchParams, { specialty, page: null });
  }

  const activeId: HubLoaFilterId =
    (Object.entries(LOA_TO_SPECIALTY).find(
      ([, v]) => v.toLowerCase() === activeSpecialty.toLowerCase()
    )?.[0] as HubLoaFilterId | undefined) ?? 'all';

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Specialty
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
        License capability tags when mapped from Florida DFS, Texas TDI, Ohio ODI, Nevada DOI, or Vermont DFR.
        Zero matches stay empty. Shareable via ?specialty=.
      </p>
    </div>
  );
}
