import type { Provider } from '@/types/provider';
import type { ProviderFilters } from '@/types/provider';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import {
  FALLBACK_PROVIDERS,
  getFallbackProviderBySlug,
} from '@/lib/providers/fallback-data';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import type { Provider as DbProvider } from '@/types/supabase';
import {
  canShowAsVerified,
  filterVerifiedProviders,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { countyMatchOrParts, FL_LAUNCH_COUNTIES } from '@/lib/dfs/launch-counties';
import { providerMatchesLaunchCounties } from '@/lib/dfs/providers-by-county';
import { looksLikeZip } from '@/lib/tools/zip-resolve';
import { evaluateDiscoveryLegitimacy } from '@/lib/network-discovery/legitimacy';
import { physicalCityMatches } from '@/lib/ask-handoff/city-match';
/**
 * Phase 1 — public directory returns verified TrustState only.
 * Seed catalog remains available only via getAllFallbackProviders (admin tooling).
 */
function onlyVerifiedResearch(providers: Provider[]): Provider[] {
  return filterVerifiedProviders(providers);
}

export async function getProviders(
  filters: ProviderFilters = {}
): Promise<{ providers: Provider[]; total: number }> {
  if (!isSupabaseConfigured()) {
    // Prefer honest empty state over unpublished catalog rows on public surfaces
    return { providers: [], total: 0 };
  }

  try {
    const supabase = createPublicClient();
    if (!supabase) return { providers: [], total: 0 };

    // Public directory: verified research rows only
    let query = supabase
      .from('providers')
      .select('*', { count: 'exact' })
      .eq('verified', true);

    const stateCode = filters.state?.trim().toUpperCase();
    const launchCounty = filters.launchCountyId
      ? FL_LAUNCH_COUNTIES.find((c) => c.id === filters.launchCountyId)
      : undefined;
    // Never treat a ZIP as a name/description ILIKE.
    const nameQuery =
      filters.query && !looksLikeZip(filters.query) ? filters.query.trim() : '';

    if (stateCode) {
      query = query.contains('states_licensed', [stateCode]);
    }
    if (launchCounty) {
      const or = countyMatchOrParts(launchCounty).join(',');
      if (or) query = query.or(or);
    }
    // Phase 11A: no-state browse is all verified research (FL/TX/OH first-class).
    if (filters.city) {
      query = query.contains('cities', [filters.city]);
    }
    if (filters.minRating) query = query.gte('rating', filters.minRating);
    if (filters.insuranceType && !filters.insuranceType.includes(',')) {
      query = query.contains('categories', [filters.insuranceType]);
    }
    if (filters.specialty) {
      query = query.contains('specialties', [filters.specialty]);
    }
    if (nameQuery) {
      query = query.or(`name.ilike.%${nameQuery}%,description.ilike.%${nameQuery}%`);
    }
    // Research convenience only — not a quality rank
    if (filters.hasAppointmentSnapshot) {
      query = query.not('contact->appointment_snapshot', 'is', null);
    }

    if (filters.sort === 'rating') {
      query = query
        .order('rating', { ascending: false })
        .order('name', { ascending: true });
    } else if (filters.sort === 'reviews') {
      query = query
        .order('review_count', { ascending: false })
        .order('name', { ascending: true });
    } else {
      query = query.order('name', { ascending: true });
    }
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 24;
    // Exact page range — over-fetch would skip/duplicate rows across pages
    query = query.range(offset, offset + Math.max(limit, 1) - 1);

    const { data, error, count } = await query;

    if (error || !data) {
      return { providers: [], total: 0 };
    }

    // ASK-SEARCH-INSURANCE-001.1 — fail closed on incidental license holders
    // (e.g. AUTOMOBILE WARRANTY dealerships) before public directory mapping.
    const legitimateRows = (data as DbProvider[]).filter(
      (row) => evaluateDiscoveryLegitimacy(row).ok
    );

    let providers = onlyVerifiedResearch(
      legitimateRows.map((row) => mapRowToProvider(row))
    );

    if (stateCode) {
      providers = providers.filter((p) => {
        const licensed = (p.license_state || p.state || '').toUpperCase();
        return licensed === stateCode;
      });
    }
    if (launchCounty) {
      providers = providers.filter((p) => providerMatchesLaunchCounties(p, [launchCounty]));
    }
    // Exact physical city (Ask handoff / optional directory city=).
    // Does not treat licensed/service state as city presence.
    if (filters.city?.trim()) {
      providers = providers.filter((p) => physicalCityMatches(p.city, filters.city));
    }

    providers = providers.slice(0, limit);

    // After legitimacy + city post-filters, prefer filtered length over raw count
    // when we dropped rows (avoids overstating totals that include incidental holders).
    const adjustedTotal =
      legitimateRows.length < (data as DbProvider[]).length || filters.city
        ? Math.max(providers.length, legitimateRows.length)
        : (count ?? providers.length);

    return { providers, total: adjustedTotal };
  } catch {
    return { providers: [], total: 0 };
  }
}

/**
 * Public provider profile loader.
 * Phase 1: verified TrustState only — pending/unavailable fail closed to null → not-found.
 * Never hydrate hub seed catalogs (OOM + not consumer inventory).
 */
export async function getProviderBySlug(slug: string): Promise<Provider | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = createPublicClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const provider = mapRowToProvider(data as DbProvider);
    if (!canShowAsVerified(resolveProviderTrustState(provider))) {
      return null;
    }
    return provider;
  } catch {
    // Fail closed — never 500 a consumer profile for bad/incomplete records
    return null;
  }
}

export async function searchProviders(
  filters: ProviderFilters
): Promise<{ providers: Provider[]; total: number }> {
  return getProviders(filters);
}

/** Staging/admin only — never call from public directory UIs */
export function getAllFallbackProviders(): Provider[] {
  return FALLBACK_PROVIDERS;
}

/** @deprecated Prefer getFallbackProviderBySlug only in admin tooling */
export function getSeedProviderBySlug(slug: string): Provider | undefined {
  return getFallbackProviderBySlug(slug);
}
