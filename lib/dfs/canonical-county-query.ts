/**
 * Future query contract ONLY. Deliberately not imported by the live loader.
 * Wiring requires a fresh county-set parity certificate, approved DB/index
 * work and anon-role performance validation; see docs/dfs/canonical-county-prep.md.
 * Keep the existing row mapping, trust/geo checks, fail-closed behavior and
 * in-flight joining when integrating. This helper is not an inventory loader.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { launchCountiesForHubSlug } from '@/lib/dfs/launch-counties';

function countyIds(hubSlug: string) {
  const ids = launchCountiesForHubSlug(hubSlug).map((county) => county.id);
  if (!ids.length) throw new Error('Canonical query requires a Florida launch hub');
  return ids;
}

/** HEAD count remains exact, including a genuine successful zero count. */
export function canonicalFloridaCountQuery(client: SupabaseClient<Database>, hubSlug: string) {
  const ids = countyIds(hubSlug);
  const query = client.from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', ['FL']);
  return ids.length === 1
    ? query.eq('contact->>launch_county_id', ids[0])
    : query.in('contact->>launch_county_id', ids);
}

/** Inclusive range; caller retains existing safe-page and over-fetch policy. */
export function canonicalFloridaRowsQuery(
  client: SupabaseClient<Database>, hubSlug: string, from: number, to: number,
) {
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) {
    throw new Error('Canonical query requires a valid inclusive range');
  }
  const ids = countyIds(hubSlug);
  const query = client.from('providers').select('*')
    .eq('verified', true)
    .contains('states_licensed', ['FL']);
  const filtered = ids.length === 1
    ? query.eq('contact->>launch_county_id', ids[0])
    : query.in('contact->>launch_county_id', ids);
  return filtered.order('name', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true }).range(from, to);
}
