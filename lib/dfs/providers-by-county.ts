/**
 * Phase 4 — load verified providers for Florida launch hubs (public read path).
 *
 * Source of truth: providers table rows promoted from DFS with Phase 1 trust gates.
 * County match uses promotion-written short_description tags, e.g. "(Duval County)".
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
  isFlLaunchHub,
  launchCountiesForHubSlug,
  type FlLaunchCounty,
} from '@/lib/dfs/launch-counties';

/** Search needles for short_description / description county tags. */
function countySearchNeedles(counties: FlLaunchCounty[]): string[] {
  const needles = new Set<string>();
  for (const c of counties) {
    needles.add(`${c.displayName} County`);
    needles.add(c.displayName);
    for (const a of c.aliases) {
      const cleaned = a
        .replace(/COUNTY$/i, '')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) continue;
      // Title-case for human-written promote tags ("Duval County", "Dade County")
      const title = cleaned
        .toLowerCase()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
      needles.add(`${title} County`);
      needles.add(title);
    }
  }
  return [...needles].filter((n) => n.length >= 3);
}

function rowMatchesCounties(
  p: Provider,
  counties: FlLaunchCounty[]
): boolean {
  const text = `${p.short_description ?? ''} ${p.description ?? ''} ${p.city ?? ''}`.toLowerCase();
  return counties.some((c) => {
    const display = c.displayName.toLowerCase();
    if (text.includes(display)) return true;
    return c.aliases.some((a) => {
      const n = a.toLowerCase().replace(/\s+county$/, '').trim();
      return n.length >= 3 && text.includes(n);
    });
  });
}

/**
 * Verified FL providers for a hub, filtered by Phase 1 trust state.
 * Queries Supabase with county ilike filters (not "first N FL rows").
 */
export async function getVerifiedProvidersForHub(
  hubSlug: string,
  opts?: { limit?: number }
): Promise<Provider[]> {
  if (!isFlLaunchHub(hubSlug) || !isSupabaseConfigured()) {
    return [];
  }

  const counties = launchCountiesForHubSlug(hubSlug);
  if (!counties.length) return [];

  const limit = opts?.limit ?? 48;
  const fetchCap = Math.min(Math.max(limit * 4, 120), 400);
  const needles = countySearchNeedles(counties);
  if (!needles.length) return [];

  try {
    const supabase = createPublicClient();
    if (!supabase) return [];

    // PostgREST or() of ilike on short_description for each county tag
    const orParts = needles.flatMap((n) => {
      const escaped = n.replace(/[%_,.()]/g, ' ').replace(/\s+/g, ' ').trim();
      if (escaped.length < 3) return [];
      return [
        `short_description.ilike.%${escaped}%`,
        `description.ilike.%${escaped}%`,
      ];
    });

    if (!orParts.length) return [];

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .or(orParts.join(','))
      .order('name', { ascending: true })
      .limit(fetchCap);

    if (error || !data?.length) {
      return [];
    }

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped).filter((p) =>
      canShowAsVerified(resolveProviderTrustState(p))
    );

    const forHub = verified.filter((p) => rowMatchesCounties(p, counties));
    return forHub.slice(0, limit);
  } catch {
    return [];
  }
}

export async function countVerifiedProvidersForHub(
  hubSlug: string
): Promise<number> {
  const list = await getVerifiedProvidersForHub(hubSlug, { limit: 500 });
  return list.length;
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
