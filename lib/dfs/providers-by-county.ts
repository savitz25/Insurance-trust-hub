/**
 * Phase 4 — load verified providers for Florida launch hubs (public read path).
 *
 * Matching strategy (prefer structured → precise promote tags):
 * 1. contact.launch_county_id / contact.county / contact.county_normalized
 * 2. short_description tags written at promote: "(Duval County)", "(Dade County)", …
 *
 * Diagnosis (why Jacksonville showed ~48):
 * Default page limit was 48 and hub UI treated providers.length as the market total.
 * Matching already hit ~2,000 Duval rows; count was the silent cap, not missing inventory.
 *
 * Totals now use an exact head count with the same filters; cards use HUB_PAGE_SIZE.
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
  isFlLaunchHub,
  launchCountiesForHubSlug,
  matchLaunchCounty,
  normalizeCountyName,
  type FlLaunchCounty,
  type FlLaunchCountyId,
} from '@/lib/dfs/launch-counties';

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
  hubSlug: string;
};

/**
 * Precise PostgREST or() fragments for a launch county.
 * Prefer "X County" tags — avoid bare city names that overmatch.
 */
export function countyMatchOrParts(county: FlLaunchCounty): string[] {
  const parts: string[] = [];
  const display = county.displayName;

  // Structured contact (new promotes)
  parts.push(`contact->>launch_county_id.eq.${county.id}`);
  parts.push(`contact->>county.eq.${display}`);
  parts.push(
    `contact->>county_normalized.eq.${county.id.replace(/_/g, '-').toUpperCase()}`
  );

  // Promote short_description: "(Duval County)" / "Duval County"
  parts.push(`short_description.ilike.%(${display} County)%`);
  parts.push(`short_description.ilike.%${display} County%`);

  for (const a of county.aliases) {
    const cleaned = a
      .replace(/COUNTY$/i, '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 3) continue;
    const title = cleaned
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
    if (title.toLowerCase() === display.toLowerCase()) continue;
    parts.push(`short_description.ilike.%(${title} County)%`);
    parts.push(`short_description.ilike.%${title} County%`);
  }

  return [...new Set(parts)];
}

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

    // Miami-Dade only: city Miami when county tag present path already covered;
    // allow city Miami as soft match only if description mentions Florida DFS + not other counties
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

/**
 * Full hub inventory: total (exact) + first page of verified cards.
 */
export async function getHubInventory(
  hubSlug: string,
  opts?: { pageSize?: number }
): Promise<HubInventoryResult> {
  const pageSize = opts?.pageSize ?? HUB_PAGE_SIZE;
  const empty: HubInventoryResult = {
    providers: [],
    total: 0,
    showing: 0,
    pageSize,
    hubSlug,
  };

  if (!isFlLaunchHub(hubSlug) || !isSupabaseConfigured()) {
    return empty;
  }

  const counties = launchCountiesForHubSlug(hubSlug);
  if (!counties.length) return empty;

  try {
    const supabase = createPublicClient();
    if (!supabase) return empty;

    const or = hubMatchOrParts(counties);
    if (!or) return empty;

    const total = await countVerifiedForCounties(counties);

    const fetchCap = Math.min(Math.max(pageSize * 2, pageSize), 250);
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .or(or)
      .order('name', { ascending: true })
      .limit(fetchCap);

    if (error || !data?.length) {
      return { ...empty, total };
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => providerMatchesLaunchCounties(p, counties));

    const providers = verified.slice(0, pageSize);
    const safeTotal = Math.max(total, providers.length);

    return {
      providers,
      total: safeTotal,
      showing: providers.length,
      pageSize,
      hubSlug,
    };
  } catch {
    return empty;
  }
}

/**
 * Verified FL providers for a hub (first page only).
 * Prefer getHubInventory when total is needed for SEO / "showing X of Y".
 */
export async function getVerifiedProvidersForHub(
  hubSlug: string,
  opts?: { limit?: number }
): Promise<Provider[]> {
  const inv = await getHubInventory(hubSlug, {
    pageSize: opts?.limit ?? HUB_PAGE_SIZE,
  });
  return inv.providers;
}

export async function countVerifiedProvidersForHub(
  hubSlug: string
): Promise<number> {
  if (!isFlLaunchHub(hubSlug)) return 0;
  return countVerifiedForCounties(launchCountiesForHubSlug(hubSlug));
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
