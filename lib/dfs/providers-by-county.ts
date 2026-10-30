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
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import {
  applyFloridaHubOrder,
  assertCompleteFloridaHubPage,
  FLORIDA_HUB_CHUNK,
  mergeFloridaHubPage,
} from '@/lib/dfs/florida-hub-merge';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  floridaHubIdPredicate,
  flLaunchCountyNavRows,
  isFlLaunchHub,
  launchCountiesForHubSlug,
  matchLaunchCounty,
  normalizeCountyName,
  sumFloridaCountyCounts,
  uniqueProvidersById,
  type FlLaunchCounty,
  type FlLaunchCountyId,
} from '@/lib/dfs/launch-counties';
import {
  mapWithConcurrency,
  PUBLICATION_DB_CONCURRENCY,
} from '@/lib/map-with-concurrency';
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
  /**
   * False when the count or row read failed. A successful read of zero
   * verified listings keeps this true so callers can tell empty from failure.
   */
  lookupSucceeded: boolean;
};

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
 * One exact count for one launch_county_id.
 * Membership is verified = true, states_licensed contains FL, and that id.
 * Provenance, freshness, and bail-bond exclusion are the promotion gates.
 * A JSON predicate for those gates on this count returned HTTP 500 at the
 * statement timeout, so the count does not repeat them. A fetched page throws
 * if any row fails canShowAsVerified. It does not drop the row or shorten the
 * page. A failed count throws when required and returns null otherwise.
 * It does not return a successful zero.
 */
export async function countVerifiedFloridaCounty(
  countyId: string,
  requireSuccessfulLookup = true
): Promise<number | null> {
  if (!countyId) {
    if (requireSuccessfulLookup) throw new Error('Florida hub inventory count unavailable');
    return null;
  }
  if (!isSupabaseConfigured()) {
    if (requireSuccessfulLookup) throw new Error('Florida hub inventory count unavailable');
    return null;
  }
  const supabase = createPublicClient();
  if (!supabase) {
    if (requireSuccessfulLookup) throw new Error('Florida hub inventory client unavailable');
    return null;
  }

  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', ['FL'])
    .or(floridaHubIdPredicate(countyId));

  if (error || count == null) {
    if (requireSuccessfulLookup) throw new Error('Florida hub inventory count unavailable');
    return null;
  }
  return count;
}

async function countVerifiedForCounties(
  counties: FlLaunchCounty[],
  requireSuccessfulLookup = false
): Promise<number> {
  if (!counties.length) return 0;
  const counts = await mapWithConcurrency(
    counties,
    PUBLICATION_DB_CONCURRENCY,
    (county) => countVerifiedFloridaCounty(county.id, requireSuccessfulLookup)
  );
  return sumFloridaCountyCounts(counts, requireSuccessfulLookup);
}

function emptyInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  lookupSucceeded = false
): HubInventoryResult {
  return {
    providers: [],
    total: 0,
    showing: 0,
    pageSize,
    page,
    totalPages: 0,
    hubSlug,
    lookupSucceeded,
  };
}

function pageOfEligibleProviders(
  mapped: Provider[],
  total: number,
  from: number,
  pageSize: number
): Provider[] {
  if (mapped.some((provider) => !canShowAsVerified(resolveProviderTrustState(provider)))) {
    throw new Error('Hub inventory unavailable');
  }
  const expected = from >= total ? 0 : Math.min(pageSize, Math.max(0, total - from));
  if (mapped.length !== expected) throw new Error('Hub inventory unavailable');
  return mapped;
}

async function getTxHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    // Prefer structured contact.launch_market_id (Phase 8 promote)
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['TX'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['TX'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getNjHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const regions = launchRegionsForHubSlug(hubSlug);
  if (!regions.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const regionIds = regions.map((r) => r.id);
    const orParts = regionIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(regionIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['NJ'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['NJ'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getOhHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchOhMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['OH'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['OH'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getNcHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchNcMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['NC'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['NC'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getNvHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchNvMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['NV'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['NV'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getMsHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchMsMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['MS'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['MS'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getMaHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchMaMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['MA'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['MA'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
  }
}

async function getVtHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number,
  countOnly = false
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Hub inventory unavailable');
  const markets = launchVtMarketsForHubSlug(hubSlug);
  if (!markets.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Hub inventory unavailable');

    const marketIds = markets.map((m) => m.id);
    const orParts = marketIds
      .map((id) => `contact->>launch_market_id.eq.${id}`)
      .concat(marketIds.map((id) => `contact->>launch_county_id.eq.${id}`));
    const or = orParts.join(',');

    const { count, error: cErr } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['VT'])
      .or(or);

    if (cErr || count == null) throw new Error('Hub inventory unavailable');
    const total = count;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    if (countOnly) {
      return {
        ...emptyInventory(hubSlug, pageSize, 1, true),
        total,
        totalPages,
      };
    }
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['VT'])
      .or(or)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw new Error('Hub inventory unavailable');
    if (!data?.length) {
      if (total > from) throw new Error('Hub inventory unavailable');
      return {
        ...emptyInventory(hubSlug, pageSize, safePage, true),
        total,
        totalPages,
      };
    }

    const providers = pageOfEligibleProviders(
      data.map((row) => mapRowToProvider(row as DbProvider)),
      total,
      from,
      pageSize
    );

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Hub inventory unavailable') throw err;
    throw new Error('Hub inventory unavailable');
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
    return emptyInventory(hubSlug, pageSize, page, true);
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

function floridaLaunchCountyId(row: { contact?: unknown }): string {
  const contact = row.contact;
  if (!contact || typeof contact !== 'object') return '';
  const id = (contact as { launch_county_id?: unknown }).launch_county_id;
  return typeof id === 'string' ? id.trim() : '';
}

async function readFloridaCountyChunk(
  supabase: NonNullable<ReturnType<typeof createPublicClient>>,
  countyId: string,
  offset: number,
  limit: number
): Promise<{ rows: DbProvider[]; fetched: number }> {
  const { data, error } = await applyFloridaHubOrder(
    supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .or(floridaHubIdPredicate(countyId))
  ).range(offset, offset + limit - 1);

  if (error || data == null) throw new Error('Florida hub inventory rows unavailable');
  if (data.some((row) => !row.id || floridaLaunchCountyId(row) !== countyId)) {
    throw new Error('Florida hub inventory rows unavailable');
  }
  return { rows: uniqueProvidersById(data), fetched: data.length };
}

async function readFloridaCountyPrefix(
  supabase: NonNullable<ReturnType<typeof createPublicClient>>,
  countyId: string,
  need: number
): Promise<DbProvider[]> {
  const rows: DbProvider[] = [];
  let offset = 0;
  while (rows.length < need) {
    const chunk = await readFloridaCountyChunk(
      supabase,
      countyId,
      offset,
      FLORIDA_HUB_CHUNK
    );
    rows.push(...chunk.rows);
    offset += chunk.fetched;
    if (chunk.fetched < FLORIDA_HUB_CHUNK) break;
  }
  return rows;
}

async function readFloridaHubInventory(
  hubSlug: string,
  pageSize: number,
  page: number
): Promise<HubInventoryResult> {
  if (!isSupabaseConfigured()) throw new Error('Florida hub inventory unavailable');

  const counties = launchCountiesForHubSlug(hubSlug);
  if (!counties.length) return emptyInventory(hubSlug, pageSize, page, true);

  try {
    const supabase = createPublicClient();
    if (!supabase) throw new Error('Florida hub inventory client unavailable');

    const total = await countVerifiedForCounties(counties, true);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const from = (safePage - 1) * pageSize;

    let pageRows: DbProvider[] = [];
    if (total > 0) {
      if (counties.length === 1) {
        pageRows = (await readFloridaCountyChunk(supabase, counties[0].id, from, pageSize)).rows;
      } else {
        const need = from + pageSize;
        const streams: DbProvider[][] = [];
        for (const county of counties) {
          streams.push(await readFloridaCountyPrefix(supabase, county.id, need));
        }
        pageRows = mergeFloridaHubPage(streams, from, pageSize);
      }
    }

    const providers = pageRows.map((row) => mapRowToProvider(row));
    if (providers.some((provider) => !canShowAsVerified(resolveProviderTrustState(provider)))) {
      throw new Error('Florida hub inventory eligibility unavailable');
    }
    assertCompleteFloridaHubPage({
      total,
      from,
      pageSize,
      rowCount: providers.length,
    });

    return {
      providers,
      total,
      showing: providers.length,
      pageSize,
      page: safePage,
      totalPages,
      hubSlug,
      lookupSucceeded: true,
    };
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

export async function countVerifiedProvidersForHub(
  hubSlug: string,
  opts?: { requireSuccessfulLookup?: boolean }
): Promise<number> {
  const strict = opts?.requireSuccessfulLookup === true;
  const fromInventory = (inventory: HubInventoryResult): number => {
    if (strict && inventory.lookupSucceeded !== true) {
      throw new Error(`Hub inventory unavailable: ${hubSlug}`);
    }
    return inventory.total;
  };
  if (isTxLaunchHub(hubSlug)) {
    return fromInventory(await getTxHubInventory(hubSlug, 1, 1, true));
  }
  if (isNjLaunchHub(hubSlug)) {
    return fromInventory(await getNjHubInventory(hubSlug, 1, 1, true));
  }
  if (isOhLaunchHub(hubSlug)) {
    return fromInventory(await getOhHubInventory(hubSlug, 1, 1, true));
  }
  if (isNcLaunchHub(hubSlug)) {
    return fromInventory(await getNcHubInventory(hubSlug, 1, 1, true));
  }
  if (isNvLaunchHub(hubSlug)) {
    return fromInventory(await getNvHubInventory(hubSlug, 1, 1, true));
  }
  if (isVtLaunchHub(hubSlug)) {
    return fromInventory(await getVtHubInventory(hubSlug, 1, 1, true));
  }
  if (isMaLaunchHub(hubSlug)) {
    return fromInventory(await getMaHubInventory(hubSlug, 1, 1, true));
  }
  if (isMsLaunchHub(hubSlug)) {
    return fromInventory(await getMsHubInventory(hubSlug, 1, 1, true));
  }
  if (!isFlLaunchHub(hubSlug)) return 0;
  return countVerifiedForCounties(launchCountiesForHubSlug(hubSlug), strict);
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
export async function getLaunchCountyLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
  const strict = opts?.requireSuccessfulLookup === true;
  const counts = await mapWithConcurrency(
    FL_LAUNCH_COUNTIES,
    PUBLICATION_DB_CONCURRENCY,
    (county) => countVerifiedFloridaCounty(county.id, strict)
  );
  const byId = new Map(FL_LAUNCH_COUNTIES.map((county, index) => [county.id, counts[index]]));
  const out: LaunchNavLiveRow[] = flLaunchCountyNavRows().map((row) => {
    const total = byId.get(row.id);
    if (total == null || !Number.isFinite(total)) {
      throw new Error('Florida hub inventory count unavailable');
    }
    return {
      key: row.id,
      displayName: row.displayName,
      hubSlug: row.hubSlug,
      hubHref: row.hubHref,
      total,
      kind: 'county' as const,
    };
  });
  const southIds = launchCountiesForHubSlug('miami-fort-lauderdale').map((county) => county.id);
  out.push({
    key: 'south-florida',
    displayName: 'South Florida (tri-county)',
    hubSlug: 'miami-fort-lauderdale',
    hubHref: '/hubs/south-florida',
    total: sumFloridaCountyCounts(
      southIds.map((id) => byId.get(id) ?? null),
      strict
    ),
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
    const total = await countVerifiedForCounties([c], true);
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

function unavailableStateCount(stateCode: string): never {
  throw new Error(`${stateCode} verified count unavailable`);
}

async function countVerifiedProvidersForState(
  stateCode: string,
  requireSuccessfulLookup = true
): Promise<number> {
  void requireSuccessfulLookup;
  if (!isSupabaseConfigured()) unavailableStateCount(stateCode);
  const supabase = createPublicClient();
  if (!supabase) unavailableStateCount(stateCode);
  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', [stateCode]);
  if (error || count == null) unavailableStateCount(stateCode);
  return count;
}

/** Total verified FL providers (homepage / directory honesty). */
export async function countVerifiedFloridaProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('FL', opts?.requireSuccessfulLookup === true);
}

/** Total verified TX providers (directory honesty). */
export async function countVerifiedTexasProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('TX', opts?.requireSuccessfulLookup === true);
}

/** Total verified OH providers (directory honesty). */
export async function countVerifiedOhioProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('OH', opts?.requireSuccessfulLookup === true);
}

/** Live totals for Ohio Wave-1 hub nav (directory). */
export async function getOhLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Total verified NC providers (directory honesty). */
export async function countVerifiedNorthCarolinaProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('NC', opts?.requireSuccessfulLookup === true);
}

/** Live totals for North Carolina Wave-1 hub nav (directory). */
export async function getNcLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Total verified NV providers (directory honesty). */
export async function countVerifiedNevadaProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('NV', opts?.requireSuccessfulLookup === true);
}

/** Live totals for Nevada Wave-1 hub nav (directory). */
export async function getNvLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Total verified VT providers (directory honesty). */
export async function countVerifiedVermontProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('VT', opts?.requireSuccessfulLookup === true);
}

/** Total verified MA providers (directory honesty). */
export async function countVerifiedMassachusettsProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('MA', opts?.requireSuccessfulLookup === true);
}

/** Live totals for Massachusetts Wave-1 hub nav (directory). */
export async function getMaLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Total verified MS providers (directory honesty). */
export async function countVerifiedMississippiProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('MS', opts?.requireSuccessfulLookup === true);
}

/** Live totals for Mississippi Wave-1 hub nav (directory). */
export async function getMsLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Live totals for Vermont Wave-1 hub nav (directory). */
export async function getVtLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Total verified NJ providers (directory honesty). */
export async function countVerifiedNewJerseyProviders(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<number> {
  return countVerifiedProvidersForState('NJ', opts?.requireSuccessfulLookup === true);
}

/** Live totals for New Jersey Wave-1 hub nav (directory). */
export async function getNjLaunchRegionLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}

/** Live totals for Texas Wave-1 hub nav (directory). */
export async function getTxLaunchMarketLiveTotals(opts?: {
  requireSuccessfulLookup?: boolean;
}): Promise<LaunchNavLiveRow[]> {
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
  const totals = await mapWithConcurrency(hubs, PUBLICATION_DB_CONCURRENCY, (hub) =>
    countVerifiedProvidersForHub(hub.hubSlug, opts)
  );
  return hubs.map((hub, index) => ({ ...hub, total: totals[index] }));
}
