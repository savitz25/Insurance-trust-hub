/**
 * Phase 4 — load verified providers for Florida launch hubs (public read path).
 *
 * Matching strategy (prefer structured → precise promote tags):
 * 1. contact.launch_county_id / contact.county / contact.county_normalized
 * 2. short_description tags written at promote: "Duval County", "Dade County", …
 *
 * Totals use exact head count; cards use HUB_PAGE_SIZE with ?page= pagination.
 */

import type { Provider } from '@/types/provider';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import type { Provider as DbProvider } from '@/types/supabase';
import {
  canShowAsVerified,
  filterVerifiedProviders,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  flLaunchCountyNavRows,
  isFlLaunchHub,
  launchCountiesForHubSlug,
  matchLaunchCounty,
  normalizeCountyName,
  type FlLaunchCounty,
  type FlLaunchCountyId,
} from '@/lib/dfs/launch-counties';

export { countyMatchOrParts };

/** Cards rendered per hub page (explicit cap — not the market total). */
export const HUB_PAGE_SIZE = 100;

export type HubInventoryResult = {
  providers: Provider[];
  /** True verified match total for this hub. */
  total: number;
  /** Cards returned on this page */
  showing: number;
  /** Explicit page size cap */
  pageSize: number;
  /** 1-based page index */
  page: number;
  totalPages: number;
  hubSlug: string;
};

function hubMatchOrParts(counties: FlLaunchCounty[]): string {
  return counties.flatMap(countyMatchOrParts).join(',');
}

/** In-memory Phase 1 + geo confirmation (guards SQL overmatch). */
export function providerMatchesLaunchCounties(
  p: Provider,
  counties: FlLaunchCounty[]
): boolean {
  if (p.county || p.county_normalized) {
    const matched = matchLaunchCounty(p.county_normalized || p.county);
    if (matched && counties.some((c) => c.id === matched.id)) return true;
    const n = normalizeCountyName(p.county_normalized || p.county);
    if (
      n &&
      counties.some((c) =>
        c.aliases.some((a) => normalizeCountyName(a) === n)
      )
    ) {
      return true;
    }
  }

  const text = `${p.short_description ?? ''} ${p.description ?? ''}`.toLowerCase();
  const city = (p.city ?? '').toLowerCase().trim();

  for (const c of counties) {
    if (text.includes(`(${c.displayName.toLowerCase()} county)`)) return true;
    if (text.includes(`${c.displayName.toLowerCase()} county`)) return true;

    for (const a of c.aliases) {
      const alias = a.toLowerCase().replace(/\s+county$/, '').trim();
      if (alias.length < 3) continue;
      if (
        text.includes(`(${alias} county)`) ||
        text.includes(`${alias} county`)
      ) {
        return true;
      }
    }

    if (
      c.id === 'miami_dade' &&
      (city === 'miami' || city === 'miami beach') &&
      !/\((broward|palm beach|duval|hillsborough)\s*county\)/i.test(text)
    ) {
      return true;
    }
  }

  return false;
}

async function countVerifiedForCounties(
  counties: FlLaunchCounty[]
): Promise<number> {
  if (!counties.length || !isSupabaseConfigured()) return 0;
  const supabase = createPublicClient();
  if (!supabase) return 0;

  const or = hubMatchOrParts(counties);
  if (!or) return 0;

  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', ['FL'])
    .or(or);

  if (error) return 0;
  return count ?? 0;
}

function emptyInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): HubInventoryResult {
  return {
    providers: [],
    total: 0,
    showing: 0,
    pageSize,
    page,
    totalPages: 0,
    hubSlug,
  };
}

/**
 * Full hub inventory: total (exact) + one page of verified cards.
 */
export async function getHubInventory(
  hubSlug: string,
  opts?: { pageSize?: number; page?: number }
): Promise<HubInventoryResult> {
  const pageSize = opts?.pageSize ?? HUB_PAGE_SIZE;
  const page = Math.max(1, Math.floor(opts?.page ?? 1));

  if (!isFlLaunchHub(hubSlug) || !isSupabaseConfigured()) {
    return emptyInventory(hubSlug, pageSize, page);
  }

  const counties = launchCountiesForHubSlug(hubSlug);
  if (!counties.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const or = hubMatchOrParts(counties);
    if (!or) return emptyInventory(hubSlug, pageSize, page);

    const total = await countVerifiedForCounties(counties);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    // Slight over-fetch so Phase 1 filter still fills the page
    const overFetch = Math.min(pageSize + 40, 200);
    const to = from + overFetch - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return {
        ...emptyInventory(hubSlug, pageSize, safePage),
        total,
        totalPages,
      };
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => providerMatchesLaunchCounties(p, counties));

    const providers = verified.slice(0, pageSize);
    const safeTotal = Math.max(total, from + providers.length);

    return {
      providers,
      total: safeTotal,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages: Math.max(totalPages, safeTotal > 0 ? Math.ceil(safeTotal / pageSize) : 0),
      hubSlug,
    };
  } catch {
    return emptyInventory(hubSlug, pageSize, page);
  }
}

/**
 * Verified FL providers for a hub (one page).
 * Prefer getHubInventory when total / pagination is needed.
 */
export async function getVerifiedProvidersForHub(
  hubSlug: string,
  opts?: { limit?: number; page?: number }
): Promise<Provider[]> {
  const inv = await getHubInventory(hubSlug, {
    pageSize: opts?.limit ?? HUB_PAGE_SIZE,
    page: opts?.page,
  });
  return inv.providers;
}

export async function countVerifiedProvidersForHub(
  hubSlug: string
): Promise<number> {
  if (!isFlLaunchHub(hubSlug)) return 0;
  return countVerifiedForCounties(launchCountiesForHubSlug(hubSlug));
}

export type LaunchNavLiveRow = {
  key: string;
  displayName: string;
  hubSlug: string;
  hubHref: string;
  total: number;
  /** County-scoped vs multi-county aggregate */
  kind: 'county' | 'aggregate';
};

/** Live totals for Florida launch county nav (state hub + directory). */
export async function getLaunchCountyLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const rows = flLaunchCountyNavRows();
  const out: LaunchNavLiveRow[] = [];
  for (const row of rows) {
    const total = await countVerifiedProvidersForHub(row.hubSlug);
    out.push({
      key: row.id,
      displayName: row.displayName,
      hubSlug: row.hubSlug,
      hubHref: row.hubHref,
      total,
      kind: 'county',
    });
  }
  const sfl = await countVerifiedProvidersForHub('miami-fort-lauderdale');
  out.push({
    key: 'south-florida',
    displayName: 'South Florida (tri-county)',
    hubSlug: 'miami-fort-lauderdale',
    hubHref: '/hubs/south-florida',
    total: sfl,
    kind: 'aggregate',
  });
  return out;
}

/** Per-launch-county verified totals (health / QA). */
export async function countVerifiedByLaunchCounty(): Promise<
  Record<
    FlLaunchCountyId,
    { displayName: string; total: number; sampleNames: string[] }
  >
> {
  const out = {} as Record<
    FlLaunchCountyId,
    { displayName: string; total: number; sampleNames: string[] }
  >;

  for (const c of FL_LAUNCH_COUNTIES) {
    const total = await countVerifiedForCounties([c]);
    let sampleNames: string[] = [];
    try {
      const supabase = createPublicClient();
      if (supabase) {
        const { data } = await supabase
          .from('providers')
          .select('name')
          .eq('verified', true)
          .contains('states_licensed', ['FL'])
          .or(countyMatchOrParts(c).join(','))
          .order('name', { ascending: true })
          .limit(3);
        sampleNames = (data ?? []).map((r) => (r as { name: string }).name);
      }
    } catch {
      sampleNames = [];
    }
    out[c.id] = { displayName: c.displayName, total, sampleNames };
  }

  return out;
}

/** Total verified FL providers (homepage / directory honesty). */
export async function countVerifiedFloridaProviders(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = createPublicClient();
    if (!supabase) return 0;
    const { count, error } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['FL']);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
