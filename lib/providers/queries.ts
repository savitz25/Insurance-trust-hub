import type { Provider } from '@/types/provider';
import type { ProviderFilters } from '@/types/provider';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import {
  FALLBACK_PROVIDERS,
  getFallbackProviderBySlug,
  searchFallbackProviders,
} from '@/lib/providers/fallback-data';
import { getHubAgentBySlug } from '@/lib/hubs/agent-lookup';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import type { Provider as DbProvider } from '@/types/supabase';

export async function getProviders(
  filters: ProviderFilters = {}
): Promise<{ providers: Provider[]; total: number }> {
  if (!isSupabaseConfigured()) {
    return searchFallbackProviders(filters);
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

  const { data, count, error } = await query;

  if (error || !data) {
    return searchFallbackProviders(filters);
  }

  const providers = data.map((row) => mapRowToProvider(row as DbProvider));

  return { providers, total: count ?? providers.length };
}

export async function getProviderBySlug(slug: string): Promise<Provider | null> {
  const hubAgent = getHubAgentBySlug(slug);
  if (hubAgent) return hubAgent;

  if (!isSupabaseConfigured()) {
    return getFallbackProviderBySlug(slug) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return getFallbackProviderBySlug(slug) ?? null;
  }

  return mapRowToProvider(data as DbProvider);
}

export async function searchProviders(
  filters: ProviderFilters
): Promise<{ providers: Provider[]; total: number }> {
  return getProviders(filters);
}

export function getAllFallbackProviders(): Provider[] {
  return FALLBACK_PROVIDERS;
}