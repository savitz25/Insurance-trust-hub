import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Phase 5/7 hub LOA specialty filters — query param `?loa=` */
export const HUB_LOA_FILTERS = [
  { id: 'all', label: 'All specialties' },
  { id: 'health', label: 'Health' },
  { id: 'life', label: 'Life' },
  { id: 'pc', label: 'Property & Casualty' },
  { id: 'personal', label: 'Personal Lines' },
  { id: 'agency', label: 'Agency' },
  { id: 'title', label: 'Title' },
  { id: 'adjuster', label: 'Public Adjuster' },
] as const;

export type HubLoaFilterId = (typeof HUB_LOA_FILTERS)[number]['id'];

export function parseHubLoaFilter(raw: string | string[] | undefined): HubLoaFilterId {
  const v = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase().trim();
  if (!v || v === 'all') return 'all';
  if (HUB_LOA_FILTERS.some((f) => f.id === v)) return v as HubLoaFilterId;
  return 'all';
}

export function specialtyMatchesLoaFilter(
  specialties: string[] | null | undefined,
  filter: HubLoaFilterId
): boolean {
  if (filter === 'all') return true;
  const set = new Set((specialties ?? []).map((s) => s.toLowerCase()));
  switch (filter) {
    case 'health':
      return set.has('health');
    case 'life':
      return set.has('life') || set.has('life & annuities');
    case 'pc':
      return set.has('property & casualty') || set.has('commercial lines');
    case 'personal':
      return set.has('personal lines');
    case 'agency':
      return set.has('agency') || set.has('independent agency');
    case 'title':
      return set.has('title');
    case 'adjuster':
      return set.has('public adjuster');
    default:
      return true;
  }
}

type HubSpecialtyFilterProps = {
  basePath: string;
  active: HubLoaFilterId;
  /** Preserve page when switching specialties (usually reset to page 1). */
  page?: number;
  className?: string;
  /** Optional note under chips */
  note?: string;
};

function hrefFor(basePath: string, id: HubLoaFilterId, page?: number): string {
  const params = new URLSearchParams();
  if (id !== 'all') params.set('loa', id);
  // Specialty change resets to page 1 unless page explicitly kept
  if (page && page > 1) params.set('page', String(page));
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

/**
 * Specialty chips for launch hubs. Shareable via ?loa=.
 * Filters the current verified page results (honest page-scoped filter).
 */
export function HubSpecialtyFilter({
  basePath,
  active,
  className,
  note,
}: HubSpecialtyFilterProps) {
  return (
    <div className={cn('mb-5 space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Filter by license specialty
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="navigation"
        aria-label="Filter by specialty"
      >
        {HUB_LOA_FILTERS.map((f) => {
          const isActive = active === f.id;
          return (
            <Link
              key={f.id}
              href={hrefFor(basePath, f.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {note ??
          'Specialty tags come from Florida DFS lines of authority on verified listings only. Shareable URL uses ?loa=. Medicare-certified is never inferred from DFS.'}
      </p>
    </div>
  );
}
