import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Phase 5 hub LOA specialty filters — query param `?loa=` */
export const HUB_LOA_FILTERS = [
  { id: 'all', label: 'All specialties' },
  { id: 'health', label: 'Health' },
  { id: 'life', label: 'Life' },
  { id: 'pc', label: 'Property & Casualty' },
  { id: 'personal', label: 'Personal Lines' },
  { id: 'agency', label: 'Agency' },
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
    default:
      return true;
  }
}

type HubSpecialtyFilterProps = {
  basePath: string;
  active: HubLoaFilterId;
  page?: number;
  className?: string;
};

function hrefFor(basePath: string, id: HubLoaFilterId, page?: number): string {
  const params = new URLSearchParams();
  if (id !== 'all') params.set('loa', id);
  if (page && page > 1) params.set('page', String(page));
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

/**
 * Soft specialty chips for launch hubs. Filters client-side page results;
 * does not invent tags beyond DFS LOA specialties on listings.
 */
export function HubSpecialtyFilter({
  basePath,
  active,
  className,
}: HubSpecialtyFilterProps) {
  return (
    <div
      className={cn('mb-5 flex flex-wrap gap-2', className)}
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
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}
