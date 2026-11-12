/**
 * Phase 4 — load verified providers for Florida launch hubs (public read path).
 *
 * Matching strategy (prefer structured → precise promote tags):
 * 1. contact.launch_county_id / contact.county / contact.county_normalized
 * 2. short_description tags written at promote: "Duval County", "Dade County", …
 *
 * Totals are exact head counts on one structured id key. Cards still use the
 * wider matcher and HUB_PAGE_SIZE with ?page= pagination.
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
import {
  isTxLaunchHub,
  launchMarketsForHubSlug,
} from '@/lib/tdi/launch-markets';
import {
  isOhLaunchHub,
  launchMarketsForHubSlug as launchOhMarketsForHubSlug,
} from '@/lib/odi/launch-markets';
import {
  isNjLaunchHub,
  launchRegionsForHubSlug,
} from '@/lib/nj/launch-regions';
import {
  isNcLaunchHub,
  launchMarketsForHubSlug as launchNcMarketsForHubSlug,
} from '@/lib/nc/launch-markets';
import {
  isNvLaunchHub,
  launchMarketsForHubSlug as launchNvMarketsForHubSlug,
} from '@/lib/nv/launch-markets';
import {
  isVtLaunchHub,
  launchMarketsForHubSlug as launchVtMarketsForHubSlug,
} from '@/lib/vt/launch-markets';
import {
  isMaLaunchHub,
  launchMarketsForHubSlug as launchMaMarketsForHubSlug,
} from '@/lib/ma/launch-markets';
import {
  isMsLaunchHub,
  launchMarketsForHubSlug as launchMsMarketsForHubSlug,
} from '@/lib/ms/launch-markets';
import {
  countVerifiedProvidersInState,
  exactStructuredProviderCount,
} from '@/lib/dfs/provider-head-count';
import {
  combineHeadCounts,
  isReadyCount,
  planHubRange,
  settleHubPage,
  type HeadCount,
  unavailableCount,
} from '@/lib/dfs/provider-count';

export { countyMatchOrParts };

/** Cards rendered per hub page (explicit cap — not the market total). */
export const HUB_PAGE_SIZE = 100;

export type HubInventoryResult = {
  providers: Provider[];
  /** Exact total when the head count is usable. Null when the count is unavailable. */
  total: number | null;
  /** Freshness of the head count. Unavailable is never a zero. */
  count: HeadCount;
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

/**
 * Planner estimate by one `launch_county_id` per county.
 * An exact county HEAD count still returns SQLSTATE 57014. Page reads still
 * use the wide county OR, ordered by name then id. A failed count is not a
 * partial sum and is not stored as zero when the caller requires a
 * successful lookup.
 */
async function countVerifiedForCounties(
  counties: FlLaunchCounty[],
  requireSuccessfulLookup = false
): Promise<HeadCount> {
  if (!counties.length) return { value: 0, asOf: Date.now(), stale: false };
  if (!isSupabaseConfigured()) return unavailableCount();
  try {
    const parts = await Promise.all(
      counties.map((county) =>
        exactStructuredProviderCount('FL', 'launch_county_id', [county.id])
      )
    );
    const combined = combineHeadCounts(parts);
    if (!isReadyCount(combined) && requireSuccessfulLookup) {
      throw new Error('Florida hub inventory count unavailable');
    }
    return combined;
  } catch (error) {
    if (!requireSuccessfulLookup) return unavailableCount();
    const message = error instanceof Error ? error.message : '';
    throw new Error(
      message.includes('client')
        ? 'Florida hub inventory client unavailable'
        : 'Florida hub inventory count unavailable'
    );
  }
}

/** Market head count on one id key. Row reads keep the two-key OR. */
async function exactMarketHeadCount(state: string, ids: string[]): Promise<HeadCount> {
  try {
    return await exactStructuredProviderCount(state, 'launch_market_id', ids);
  } catch {
    return unavailableCount();
  }
}

function emptyInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): HubInventoryResult {
  return {
    providers: [],
    total: 0,
    count: { value: 0, asOf: Date.now(), stale: false },
    showing: 0,
    pageSize,
    page,
    totalPages: 0,
    hubSlug,
  };
}

function unavailableInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): HubInventoryResult {
  return {
    providers: [],
    total: null,
    count: unavailableCount(),
    showing: 0,
    pageSize,
    page,
    totalPages: 0,
    hubSlug,
  };
}

function listedPage(verified: Provider[], pageSize: number): {
  providers: Provider[];
  hasMore: boolean;
} {
  return {
    providers: verified.slice(0, pageSize),
    hasMore: verified.length > pageSize,
  };
}

function inventoryFromCount(
  count: HeadCount,
  providers: Provider[],
  pageSize: number,
  page: number,
  hubSlug: string,
  hasMore = false
): HubInventoryResult {
  const settled = settleHubPage({
    count,
    pageSize,
    page,
    rowCount: providers.length,
    hasMore,
  });
  return {
    providers,
    total: settled.total,
    count: settled.count,
    showing: providers.length,
    pageSize,
    page,
    totalPages: settled.totalPages,
    hubSlug,
  };
}

async function getTxHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    // Prefer structured contact.launch_market_id (Phase 8 promote)
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('TX', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['TX'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'TX');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getNjHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const regions = launchRegionsForHubSlug(hubSlug);
  if (!regions.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const regionIds = regions.map((r) => r.id);
    const orParts = regionIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(regionIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('NJ', regionIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['NJ'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'NJ');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getOhHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchOhMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('OH', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['OH'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'OH');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getNcHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchNcMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('NC', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['NC'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'NC');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getNvHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchNvMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('NV', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['NV'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'NV');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getMsHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchMsMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('MS', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['MS'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'MS');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getMaHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchMaMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('MA', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['MA'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'MA');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
}

async function getVtHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) return emptyInventory(hubSlug, pageSize, page);
  const markets = launchVtMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) return emptyInventory(hubSlug, pageSize, page);

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const count = await exactMarketHeadCount('VT', marketIds);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['VT'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || !data?.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => p.state?.toUpperCase() === 'VT');

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    return unavailableInventory(hubSlug, pageSize, page);
  }
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

  if (isTxLaunchHub(hubSlug)) {
    return getTxHubInventory(hubSlug, pageSize, page);
  }
  if (isNjLaunchHub(hubSlug)) {
    return getNjHubInventory(hubSlug, pageSize, page);
  }
  if (isOhLaunchHub(hubSlug)) {
    return getOhHubInventory(hubSlug, pageSize, page);
  }
  if (isNcLaunchHub(hubSlug)) {
    return getNcHubInventory(hubSlug, pageSize, page);
  }
  if (isNvLaunchHub(hubSlug)) {
    return getNvHubInventory(hubSlug, pageSize, page);
  }
  if (isVtLaunchHub(hubSlug)) {
    return getVtHubInventory(hubSlug, pageSize, page);
  }
  if (isMaLaunchHub(hubSlug)) {
    return getMaHubInventory(hubSlug, pageSize, page);
  }
  if (isMsLaunchHub(hubSlug)) {
    return getMsHubInventory(hubSlug, pageSize, page);
  }

  if (!isFlLaunchHub(hubSlug)) {
    return emptyInventory(hubSlug, pageSize, page);
  }
  return joinFloridaHubInventory(hubSlug, pageSize, page);
}

/**
 * Page and metadata each call this for the same slug. Join only the in-flight
 * read so one request does not run two identical count and row statements.
 * The shared promise is dropped when it settles. A failure is never stored
 * as an empty market, and a later request always reads again.
 */
const floridaHubInventoryInFlight = new Map<string, Promise<HubInventoryResult>>();

function joinFloridaHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  const key = `${hubSlug}:${pageSize}:${page}`;
  const current = floridaHubInventoryInFlight.get(key);
  if (current) return current;
  const pending = readFloridaHubInventory(hubSlug, pageSize, page);
  floridaHubInventoryInFlight.set(key, pending);
  // Cleanup is a separate chain. Catching here does not swallow the rejection
  // returned to page and metadata; it only keeps finally() from emitting
  // unhandledRejection after those callers have already observed the failure.
  void pending.catch(() => {}).finally(() => {
    if (floridaHubInventoryInFlight.get(key) === pending) {
      floridaHubInventoryInFlight.delete(key);
    }
  });
  return pending;
}

async function readFloridaHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Florida hub inventory unavailable');

  const counties = launchCountiesForHubSlug(hubSlug);
  if (!counties.length) return emptyInventory(hubSlug, pageSize, page);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Florida hub inventory client unavailable');

    const or = hubMatchOrParts(counties);
    if (!or) return emptyInventory(hubSlug, pageSize, page);

    const count = await countVerifiedForCounties(counties);
    const range = planHubRange(count, pageSize, page);
    const safePage = range.page;
    const from = range.from;
    const to = range.to;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .or(or)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error || data == null) throw new Error('Florida hub inventory rows unavailable');
    if (!data.length) {
      return inventoryFromCount(count, [], pageSize, safePage, hubSlug);
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped)
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .filter((p) => providerMatchesLaunchCounties(p, counties));

    const listed = listedPage(verified, pageSize);
    return inventoryFromCount(count, listed.providers, pageSize, safePage, hubSlug, listed.hasMore);
  } catch {
    // Lookup/transport/mapping failures are not evidence of an empty market.
    // Let the route error boundary handle them; never generate empty-market SEO.
    throw new Error('Florida hub inventory unavailable');
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

export async function countVerifiedProvidersForHub(hubSlug: string): Promise<HeadCount> {
  if (isTxLaunchHub(hubSlug)) {
    const inv = await getTxHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isNjLaunchHub(hubSlug)) {
    const inv = await getNjHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isOhLaunchHub(hubSlug)) {
    const inv = await getOhHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isNcLaunchHub(hubSlug)) {
    const inv = await getNcHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isNvLaunchHub(hubSlug)) {
    const inv = await getNvHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isVtLaunchHub(hubSlug)) {
    const inv = await getVtHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isMaLaunchHub(hubSlug)) {
    const inv = await getMaHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (isMsLaunchHub(hubSlug)) {
    const inv = await getMsHubInventory(hubSlug, 1, 1);
    return inv.count;
  }
  if (!isFlLaunchHub(hubSlug)) return unavailableCount();
  return countVerifiedForCounties(launchCountiesForHubSlug(hubSlug));
}

export type LaunchNavLiveRow = {
  key: string;
  displayName: string;
  hubSlug: string;
  hubHref: string;
  total: HeadCount;
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
    { displayName: string; total: HeadCount; sampleNames: string[] }
  >
> {
  const out = {} as Record<
    FlLaunchCountyId,
    { displayName: string; total: HeadCount; sampleNames: string[] }
  >;

  for (const c of FL_LAUNCH_COUNTIES) {
    const total = await countVerifiedForCounties([c]);
    let sampleNames: string[] = [];
    try {
      const supabase = createPublicClient();
      if (supabase) {
        const { data } = await supabase
          .from('providers')
          .select('name,id')
          .eq('verified', true)
          .contains('states_licensed', ['FL'])
          .or(countyMatchOrParts(c).join(','))
          .order('name', { ascending: true })
          .order('id', { ascending: true })
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
export async function countVerifiedFloridaProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('FL');
}

/** Total verified TX providers (directory honesty). */
export async function countVerifiedTexasProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('TX');
}

/** Total verified OH providers (directory honesty). */
export async function countVerifiedOhioProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('OH');
}

/** Live totals for Ohio Wave-1 hub nav (directory). */
export async function getOhLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'columbus',
      displayName: 'Columbus',
      hubSlug: 'columbus',
      hubHref: '/hubs/ohio/columbus',
      kind: 'county',
    },
    {
      key: 'cleveland',
      displayName: 'Cleveland',
      hubSlug: 'cleveland',
      hubHref: '/hubs/ohio/cleveland',
      kind: 'county',
    },
    {
      key: 'cincinnati',
      displayName: 'Cincinnati',
      hubSlug: 'cincinnati',
      hubHref: '/hubs/ohio/cincinnati',
      kind: 'county',
    },
    {
      key: 'toledo',
      displayName: 'Toledo',
      hubSlug: 'toledo',
      hubHref: '/hubs/ohio/toledo',
      kind: 'county',
    },
    {
      key: 'akron',
      displayName: 'Akron',
      hubSlug: 'akron',
      hubHref: '/hubs/ohio/akron',
      kind: 'county',
    },
    {
      key: 'dayton',
      displayName: 'Dayton',
      hubSlug: 'dayton',
      hubHref: '/hubs/ohio/dayton',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Total verified NC providers (directory honesty). */
export async function countVerifiedNorthCarolinaProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('NC');
}

/** Live totals for North Carolina Wave-1 hub nav (directory). */
export async function getNcLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'charlotte',
      displayName: 'Charlotte',
      hubSlug: 'charlotte',
      hubHref: '/hubs/north-carolina/charlotte',
      kind: 'county',
    },
    {
      key: 'raleigh',
      displayName: 'Research Triangle',
      hubSlug: 'raleigh',
      hubHref: '/hubs/north-carolina/raleigh',
      kind: 'county',
    },
    {
      key: 'greensboro',
      displayName: 'Greensboro',
      hubSlug: 'greensboro',
      hubHref: '/hubs/north-carolina/greensboro',
      kind: 'county',
    },
    {
      key: 'wilmington',
      displayName: 'Wilmington',
      hubSlug: 'wilmington',
      hubHref: '/hubs/north-carolina/wilmington',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Total verified NV providers (directory honesty). */
export async function countVerifiedNevadaProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('NV');
}

/** Live totals for Nevada Wave-1 hub nav (directory). */
export async function getNvLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'las-vegas',
      displayName: 'Las Vegas',
      hubSlug: 'las-vegas',
      hubHref: '/hubs/nevada/las-vegas',
      kind: 'county',
    },
    {
      key: 'reno',
      displayName: 'Reno',
      hubSlug: 'reno',
      hubHref: '/hubs/nevada/reno',
      kind: 'county',
    },
    {
      key: 'carson-city',
      displayName: 'Carson City',
      hubSlug: 'carson-city',
      hubHref: '/hubs/nevada/carson-city',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Total verified VT providers (directory honesty). */
export async function countVerifiedVermontProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('VT');
}

/** Total verified MA providers (directory honesty). */
export async function countVerifiedMassachusettsProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('MA');
}

/** Live totals for Massachusetts Wave-1 hub nav (directory). */
export async function getMaLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'boston',
      displayName: 'Greater Boston',
      hubSlug: 'boston',
      hubHref: '/hubs/massachusetts/boston',
      kind: 'county',
    },
    {
      key: 'worcester',
      displayName: 'Worcester',
      hubSlug: 'worcester',
      hubHref: '/hubs/massachusetts/worcester',
      kind: 'county',
    },
    {
      key: 'springfield',
      displayName: 'Springfield',
      hubSlug: 'springfield',
      hubHref: '/hubs/massachusetts/springfield',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Total verified MS providers (directory honesty). */
export async function countVerifiedMississippiProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('MS');
}

/** Live totals for Mississippi Wave-1 hub nav (directory). */
export async function getMsLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'jackson',
      displayName: 'Jackson metro',
      hubSlug: 'jackson',
      hubHref: '/hubs/mississippi/jackson',
      kind: 'county',
    },
    {
      key: 'gulfport-biloxi',
      displayName: 'Gulfport–Biloxi',
      hubSlug: 'gulfport-biloxi',
      hubHref: '/hubs/mississippi/gulfport-biloxi',
      kind: 'county',
    },
    {
      key: 'hattiesburg',
      displayName: 'Hattiesburg',
      hubSlug: 'hattiesburg',
      hubHref: '/hubs/mississippi/hattiesburg',
      kind: 'county',
    },
    {
      key: 'southaven',
      displayName: 'Southaven / DeSoto',
      hubSlug: 'southaven',
      hubHref: '/hubs/mississippi/southaven',
      kind: 'county',
    },
    {
      key: 'tupelo',
      displayName: 'Tupelo',
      hubSlug: 'tupelo',
      hubHref: '/hubs/mississippi/tupelo',
      kind: 'county',
    },
    {
      key: 'meridian',
      displayName: 'Meridian',
      hubSlug: 'meridian',
      hubHref: '/hubs/mississippi/meridian',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Live totals for Vermont Wave-1 hub nav (directory). */
export async function getVtLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'burlington',
      displayName: 'Burlington',
      hubSlug: 'burlington',
      hubHref: '/hubs/vermont/burlington',
      kind: 'county',
    },
    {
      key: 'montpelier',
      displayName: 'Montpelier',
      hubSlug: 'montpelier',
      hubHref: '/hubs/vermont/montpelier',
      kind: 'county',
    },
    {
      key: 'rutland',
      displayName: 'Rutland',
      hubSlug: 'rutland',
      hubHref: '/hubs/vermont/rutland',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Total verified NJ providers (directory honesty). */
export async function countVerifiedNewJerseyProviders(): Promise<HeadCount> {
  return countVerifiedProvidersInState('NJ');
}

/** Live totals for New Jersey Wave-1 hub nav (directory). */
export async function getNjLaunchRegionLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'north-new-jersey',
      displayName: 'North Jersey',
      hubSlug: 'north-new-jersey',
      hubHref: '/hubs/new-jersey/north-new-jersey',
      kind: 'county',
    },
    {
      key: 'central-new-jersey',
      displayName: 'Central Jersey',
      hubSlug: 'central-new-jersey',
      hubHref: '/hubs/new-jersey/central-new-jersey',
      kind: 'county',
    },
    {
      key: 'south-new-jersey',
      displayName: 'South Jersey',
      hubSlug: 'south-new-jersey',
      hubHref: '/hubs/new-jersey/south-new-jersey',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}

/** Live totals for Texas Wave-1 hub nav (directory). */
export async function getTxLaunchMarketLiveTotals(): Promise<LaunchNavLiveRow[]> {
  const hubs: Array<{
    key: string;
    displayName: string;
    hubSlug: string;
    hubHref: string;
    kind: 'county' | 'aggregate';
  }> = [
    {
      key: 'houston',
      displayName: 'Houston',
      hubSlug: 'houston',
      hubHref: '/hubs/texas/houston',
      kind: 'county',
    },
    {
      key: 'dallas-fort-worth',
      displayName: 'Dallas–Fort Worth',
      hubSlug: 'dallas-fort-worth',
      hubHref: '/hubs/texas/dallas-fort-worth',
      kind: 'aggregate',
    },
    {
      key: 'austin',
      displayName: 'Austin',
      hubSlug: 'austin',
      hubHref: '/hubs/texas/austin',
      kind: 'county',
    },
    {
      key: 'san-antonio',
      displayName: 'San Antonio',
      hubSlug: 'san-antonio',
      hubHref: '/hubs/texas/san-antonio',
      kind: 'county',
    },
  ];
  const out: LaunchNavLiveRow[] = [];
  for (const h of hubs) {
    const total = await countVerifiedProvidersForHub(h.hubSlug);
    out.push({ ...h, total });
  }
  return out;
}
