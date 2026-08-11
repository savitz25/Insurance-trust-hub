import type { Provider } from '@/types/provider';
import type { ProviderFilters } from '@/types/provider';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
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
    // Prefer honest empty state over seed listings on public surfaces
    return { providers: [], total: 0 };
  }

  try {
    const supabase = await createClient();
    let query = supabase.from('providers').select('*', { count: 'exact' });

    if (filters.state) {
      query = query.contains('states_licensed', [filters.state.toUpperCase()]);
    }
    if (filters.city) {
      query = query.contains('cities', [filters.city]);
    }
    if (filters.verifiedOnly) query = query.eq('verified', true);
    if (filters.minRating) query = query.gte('rating', filters.minRating);
    if (filters.insuranceType) {
      query = query.contains('categories', [filters.insuranceType]);
    }
    if (filters.specialty) {
      query = query.contains('specialties', [filters.specialty]);
    }
    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    query = query.order('rating', { ascending: false });
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 24;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error || !data) {
      return { providers: [], total: 0 };
    }

    const providers = onlyVerifiedResearch(
      data.map((row) => mapRowToProvider(row as DbProvider))
    );

    return { providers, total: providers.length };
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

    const supabase = await createClient();
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
