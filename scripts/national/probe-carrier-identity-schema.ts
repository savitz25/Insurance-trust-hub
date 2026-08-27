/**
 * Read-only probe of carrier-identity schema + production baseline.
 */
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

async function count(
  sb: ReturnType<typeof createClient>,
  table: string,
  eqs?: Array<[string, string]>
) {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  return { n: error ? null : n ?? 0, error: error?.message ?? null, code: error?.code ?? null };
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const kinds = ['person', 'agency', 'carrier', 'legal_insurer', 'insurance_group', 'consumer_brand'];
  const entities: Record<string, unknown> = {};
  for (const k of kinds) {
    const r = await sb
      .from('national_entities')
      .select('id', { count: 'exact', head: true })
      .eq('entity_kind', k);
    entities[k] = {
      n: r.error ? null : r.count ?? 0,
      error: r.error,
    };
  }
  const identSample = await sb.from('national_entity_identifiers').select('id,scheme').limit(1);
  const aliasSample = await sb.from('national_entity_aliases').select('id').limit(1);
  const dummy = await sb
    .from('national_entities')
    .insert({
      entity_kind: 'legal_insurer',
      identity_kind: 'provisional',
      provisional_key: 'legal-insurer:naic:probe',
      legal_name: 'PROBE DO NOT KEEP',
      display_name: 'PROBE DO NOT KEEP',
      identity_confidence: 'UNRESOLVED',
      identity_notes: 'schema probe — delete',
    })
    .select('id')
    .single();
  if (dummy.data?.id) {
    await sb.from('national_entities').delete().eq('id', dummy.data.id);
  }
  const out = {
    host: new URL(url).host,
    entities,
    identifiers: await count(sb, 'national_entity_identifiers'),
    identifierSample: { data: identSample.data, error: identSample.error },
    aliases: await count(sb, 'national_entity_aliases'),
    aliasSample: { data: aliasSample.data, error: aliasSample.error },
    legalInsurerInsertProbe: {
      id: dummy.data?.id ?? null,
      error: dummy.error,
    },
    memberOfGroup: await count(sb, 'national_relationships', [
      ['relationship_type', 'MEMBER_OF_GROUP'],
    ]),
    usesBrand: await count(sb, 'national_relationships', [['relationship_type', 'USES_BRAND']]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    appointedBy: await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]),
    credentials: await count(sb, 'license_credentials'),
    loas: await count(sb, 'loa_observations'),
    providers: await count(sb, 'providers'),
    dbUrlPresent: Boolean(
      process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DIRECT_URL
    ),
    rpcs: Object.fromEntries(
      await Promise.all(
        ['exec_sql', 'sql', 'query', 'execute', 'execute_sql'].map(async (name) => {
          const r = await sb.rpc(name, { query: 'select 1' });
          return [name, r.error ? { message: r.error.message, code: r.error.code } : { ok: true }];
        })
      )
    ),
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
