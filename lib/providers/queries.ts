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
import { FL_LAUNCH_COUNTIES } from '@/lib/dfs/launch-counties';
import { looksLikeZip } from '@/lib/tools/zip-resolve';
import { captureProviderStatementTimeout } from '@/lib/observability/sentry';
import { PROVIDERS_STATEMENT_ROUTE } from '@/lib/observability/sentry-policy';
import { applyDirectoryZipScope } from './directory-scope';
import { providerApiCountyFilter } from './provider-api-county-filter';

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
  // TH-DISCOVERY-002B: a pure county-grain lookup (no zip) is a new call shape -- the live
  // /directory page always supplies zip and launchCountyId together (both derived from the same
  // resolved zipGeo), so getProviders({launchCountyId}) alone was previously unreachable and its
  // error-swallowing behavior was never observed in practice. specialist-execution/v2's
  // OFFICE_LOCATION branch is the first caller to invoke it standalone, and a swallowed transient
  // backend error must not be reported as a confident "zero agencies here" for an established FL
  // launch county -- extend the existing zip fail-loud guarantee to cover it too.
  const failLoud = Boolean(filters.zip || filters.launchCountyId);
  if (!isSupabaseConfigured()) {
    if (failLoud) throw new Error('Directory source unavailable');
    // Prefer honest empty state over unpublished catalog rows on public surfaces
    return { providers: [], total: 0 };
  }

  try {
    const supabase = createPublicClient();
    if (!supabase) { if (failLoud) throw new Error('Directory source unavailable'); return { providers: [], total: 0 }; }

    const launchCounty = !filters.zip && filters.launchCountyId
      ? FL_LAUNCH_COUNTIES.find((c) => c.id === filters.launchCountyId)
      : undefined;

    // Public directory: verified research rows only.
    // Every directory read uses a planned count. An exact count of the ZIP jsonb
    // equality, a licensed-state scan, a name ILIKE, or a county predicate is the
    // statement that hits SQLSTATE 57014 and surfaces as a providers 5xx.
    let query = supabase
      .from('providers')
      .select('*', { count: 'planned' })
      .eq('verified', true);

    const stateCode = filters.state?.trim().toUpperCase();
    // Never treat a ZIP as a name/description ILIKE.
    const nameQuery =
      filters.query && !looksLikeZip(filters.query) ? filters.query.trim() : '';

    if (filters.zip) {
      query = applyDirectoryZipScope(query, filters.zip);
    }
    if (stateCode && !filters.zip) {
      query = query.contains('states_licensed', [stateCode]);
    }
    if (launchCounty) {
      query = query.or(providerApiCountyFilter(launchCounty));
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
      captureProviderStatementTimeout(error, {
        route: PROVIDERS_STATEMENT_ROUTE,
        queryKind: 'page',
      });
      if (failLoud) throw new Error('Directory source unavailable');
      return { providers: [], total: 0 };
    }

    let providers = onlyVerifiedResearch(
      data.map((row) => mapRowToProvider(row as DbProvider))
    );

    if (stateCode && !filters.zip) {
      providers = providers.filter((p) => {
        const licensed = (p.license_state || p.state || '').toUpperCase();
        return licensed === stateCode;
      });
    }

    providers = providers.slice(0, limit);

    return { providers, total: count ?? providers.length };
  } catch (caught) {
    captureProviderStatementTimeout(caught, {
      route: PROVIDERS_STATEMENT_ROUTE,
      queryKind: 'page',
    });
    if (failLoud) throw new Error('Directory source unavailable');
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
