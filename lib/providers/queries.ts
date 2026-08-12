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

/**
 * Phase 1 — public directory returns verified TrustState only.
 * Seed catalog remains available only via getAllFallbackProviders (admin tooling).
 */
function onlyVerifiedResearch(providers: Provider[]): Provider[] {
  return filterVerifiedProviders(providers);
}

/** Prefer FL launch-county rows when browsing without a state filter. */
function prioritizeLaunchFlorida(providers: Provider[]): Provider[] {
  const launchNeedles = FL_LAUNCH_COUNTIES.flatMap((c) => [
    c.displayName.toLowerCase(),
    ...c.aliases.map((a) => a.toLowerCase().replace(/\s+county$/, '').trim()),
  ]);
  const score = (p: Provider) => {
    const blob = `${p.short_description ?? ''} ${p.state ?? ''}`.toLowerCase();
    if (p.state?.toUpperCase() !== 'FL' && !blob.includes('florida')) return 0;
    if (launchNeedles.some((n) => n && blob.includes(n))) return 2;
    if (p.state?.toUpperCase() === 'FL') return 1;
    return 0;
  };
  return [...providers].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

export async function getProviders(
  filters: ProviderFilters = {}
): Promise<{ providers: Provider[]; total: number }> {
  if (!isSupabaseConfigured()) {
    // Prefer honest empty state over seed listings on public surfaces
    return { providers: [], total: 0 };
  }

  try {
    const supabase = createPublicClient();
    if (!supabase) return { providers: [], total: 0 };

    // Public directory: verified research rows only (no seed cards)
    let query = supabase
      .from('providers')
      .select('*', { count: 'exact' })
      .eq('verified', true);

    if (filters.state) {
      query = query.contains('states_licensed', [filters.state.toUpperCase()]);
    } else {
      // Default browse: launch FL inventory first (still filterable by state)
      query = query.contains('states_licensed', ['FL']);
    }
    if (filters.city) {
      query = query.contains('cities', [filters.city]);
    }
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
    // Research convenience only — not a quality rank
    if (filters.hasAppointmentSnapshot) {
      query = query.not('contact->appointment_snapshot', 'is', null);
    }

    query = query.order('name', { ascending: true });
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 24;
    // Over-fetch slightly so Phase 1 trust filter still fills the page
    query = query.range(offset, offset + Math.max(limit * 2, limit) - 1);

    const { data, error, count } = await query;

    if (error || !data) {
      return { providers: [], total: 0 };
    }

    let providers = onlyVerifiedResearch(
      data.map((row) => mapRowToProvider(row as DbProvider))
    );
    if (!filters.state) {
      providers = prioritizeLaunchFlorida(providers);
    }
    providers = providers.slice(0, limit);

    return { providers, total: count ?? providers.length };
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
