import type { Provider } from '@/types/provider';
import type { ProviderFilters } from '@/types/provider';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import {
  FALLBACK_PROVIDERS,
  getFallbackProviderBySlug,
} from '@/lib/providers/fallback-data';
import { getHubAgentBySlug } from '@/lib/hubs/agent-lookup';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import type { Provider as DbProvider } from '@/types/supabase';
import { isIndexableListing, toPublicProviderView } from '@/lib/provenance/public-listing';

/**
 * Stage 0 — public directory never returns seed / illustrative inventory.
 * Seed catalog remains available only via getAllFallbackProviders (admin/staging tooling).
 */
function onlyIndexableResearch(providers: Provider[]): Provider[] {
  return providers.filter((p) => isIndexableListing(toPublicProviderView(p).listingClass));
}

export async function getProviders(
  filters: ProviderFilters = {}
): Promise<{ providers: Provider[]; total: number }> {
  if (!isSupabaseConfigured()) {
    // Prefer honest empty state over seed listings on public surfaces
    return { providers: [], total: 0 };
  }

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

  const providers = onlyIndexableResearch(
    data.map((row) => mapRowToProvider(row as DbProvider))
  );

  return { providers, total: providers.length };
}

export async function getProviderBySlug(slug: string): Promise<Provider | null> {
  try {
    // Hub catalog rows: only serve when they meet indexable research gates.
    // Incomplete / seed / pending hub agents fail closed (null → not-found).
    const hubAgent = getHubAgentBySlug(slug);
    if (hubAgent) {
      if (
        hubAgent.id.startsWith('fallback-') ||
        hubAgent.id.includes('-agent-') ||
        !isIndexableListing(toPublicProviderView(hubAgent).listingClass)
      ) {
        return null;
      }
      return hubAgent;
    }

    if (!isSupabaseConfigured()) {
      // Do not serve seed fallback profiles on public site
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
    if (!isIndexableListing(toPublicProviderView(provider).listingClass)) {
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
