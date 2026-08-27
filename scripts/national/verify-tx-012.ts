/** Post-execute counts for INS-NAT-012. */
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

loadLocalEnv(resolve(process.cwd()));
loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
const { url, serviceRoleKey } = requireSupabaseOpsEnv();
const sb = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function count(table: string, eqs?: Array<[string, string]>): Promise<number> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    last = error.message || '(empty)';
    console.log(`retry ${table} ${attempt + 1}: ${last}`);
    await sleep(2500 * (attempt + 1));
  }
  throw new Error(`${table}: ${last}`);
}

async function main() {
  const after = {
    agencies: await count('national_entities', [['entity_kind', 'agency']]),
    persons: await count('national_entities', [['entity_kind', 'person']]),
    credentials: await count('license_credentials'),
    personCredentials: await count('license_credentials', [['entity_kind', 'person']]),
    txPersonCredentials: await count('license_credentials', [
      ['entity_kind', 'person'],
      ['jurisdiction', 'TX'],
    ]),
    loa_observations: await count('loa_observations'),
    txPersonLoas: await count('loa_observations', [['source_dataset', 'texas_tdi_individual']]),
    relationships: await count('national_relationships'),
    txAssocRels: await count('national_relationships', [
      ['source_dataset', 'texas_tdi_associations'],
    ]),
    contacts: await count('contact_observations'),
    cms: await count('cms_marketplace_observations'),
    cmsAttached: await count('cms_marketplace_observations', [['identity_attachment', 'ATTACHED']]),
    cmsUnattached: await count('cms_marketplace_observations', [
      ['identity_attachment', 'UNATTACHED'],
    ]),
    cmsKindConflict: await count('cms_marketplace_observations', [
      ['identity_attachment', 'KIND_CONFLICT'],
    ]),
    providers: await count('providers'),
    carriers: await count('national_entities', [['entity_kind', 'carrier']]),
  };
  writeFileSync(
    'C:/Users/Michael.Savitsky/agent-tools/ins-nat-012-manifest/execution.json',
    JSON.stringify(after, null, 2)
  );
  console.log(JSON.stringify(after, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
