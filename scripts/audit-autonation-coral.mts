import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { evaluateProviderEligibility } from '../lib/network-discovery/eligibility';
import { evaluateDiscoveryLegitimacy } from '../lib/network-discovery/legitimacy';
import { loadLocalEnv, requireSupabaseOpsEnv } from './lib/load-local-env';

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from('providers')
    .select('*')
    .or('name.ilike.%CORAL GABLES%,name.ilike.%A000425%,slug.ilike.%a000425%')
    .limit(30);
  if (error) throw error;
  for (const row of data || []) {
    const d = evaluateDiscoveryLegitimacy(row);
    const e = evaluateProviderEligibility(row);
    console.log(
      JSON.stringify(
        {
          id: row.id,
          name: row.name,
          slug: row.slug,
          categories: row.categories,
          specialties: row.specialties,
          license: row.license_info?.licenses?.[0] ?? null,
          legitimacy: d,
          eligible: e.eligible,
          reasons: e.reasons,
        },
        null,
        2
      )
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
