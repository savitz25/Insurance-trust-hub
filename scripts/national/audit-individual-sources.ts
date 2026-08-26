/**
 * INS-NAT-010 — live staging inventory for individual producers.
 * Read-only. No writes.
 */
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

async function count(
  sb: SupabaseClient,
  table: string,
  eq?: [string, string]
): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  if (eq) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const out = {
    providers: await count(sb, 'providers'),
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    persons: await count(sb, 'national_entities', ['entity_kind', 'person']),
    credentials: await count(sb, 'license_credentials'),
    loa: await count(sb, 'loa_observations'),
    contacts: await count(sb, 'contact_observations'),
    dfs_business: await count(sb, 'dfs_producers', ['entity_type', 'business']),
    dfs_individual: await count(sb, 'dfs_producers', ['entity_type', 'individual']),
    vt_business: await count(sb, 'vt_producers', ['entity_type', 'business']),
    vt_individual: await count(sb, 'vt_producers', ['entity_type', 'individual']),
    tdi: await count(sb, 'tdi_producers'),
    odi: await count(sb, 'odi_producers'),
    nv: await count(sb, 'nv_producers'),
    ms: await count(sb, 'ms_producers'),
    dfs_appointments: await count(sb, 'dfs_appointments'),
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
