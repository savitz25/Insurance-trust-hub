/**
 * Phase 4 — load verified providers for Florida launch hubs (public read path).
 */

import type { Provider } from '@/types/provider';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
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
} from '@/lib/dfs/launch-counties';

/**
 * Verified FL providers for a hub, filtered by Phase 1 trust state.
 * Uses launch-county → city/county heuristics via contact address + cities array.
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

  try {
    const supabase = await createClient();
    // Verified FL only — RLS already restricts to verified for anon
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .order('name', { ascending: true })
      .limit(200);

    if (error || !data?.length) return [];

    const aliasNeedles = counties.flatMap((c) =>
      c.aliases.map((a) => a.toLowerCase().replace(/\s+county$/, '').trim())
    );
    const displayNeedles = counties.map((c) => c.displayName.toLowerCase());

    const mapped = data.map((row) => mapRowToProvider(row as DbProvider));
    const verified = filterVerifiedProviders(mapped);

    const inCounty = verified.filter((p) => {
      const blob = [
        p.city,
        p.short_description,
        p.description,
        ...(p as Provider & { county?: string }).county
          ? [(p as Provider & { county?: string }).county]
          : [],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Prefer description / short_description county tags written at promotion
      for (const n of [...aliasNeedles, ...displayNeedles]) {
        if (n && blob.includes(n)) return true;
      }
      // City alone is weak; only match if city string appears in county display
      // (kept loose for first release)
      return false;
    });

    // If county filter yields nothing but we have FL verified, for multi-county hubs
    // (e.g. south florida tri-county) return FL verified subset tagged in short_description
    // as "County)" pattern
    const tagged = verified.filter((p) =>
      /\((miami-dade|broward|palm beach|duval|hillsborough)\s*county\)/i.test(
        `${p.short_description ?? ''} ${p.description ?? ''}`
      )
    );

    const pool = inCounty.length ? inCounty : tagged;
    const forHub = pool.filter((p) => {
      const text = `${p.short_description ?? ''} ${p.description ?? ''}`.toLowerCase();
      return counties.some((c) => {
        const d = c.displayName.toLowerCase();
        return text.includes(d) || c.aliases.some((a) => text.includes(a.toLowerCase()));
      });
    });

    return forHub
      .filter((p) => canShowAsVerified(resolveProviderTrustState(p)))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function countVerifiedProvidersForHub(hubSlug: string): Promise<number> {
  const list = await getVerifiedProvidersForHub(hubSlug, { limit: 500 });
  return list.length;
}
