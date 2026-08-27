/**
 * INS-NAT-FINAL-001 — national completion production census (read-only).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    console.log(`  retry ${table} ${attempt + 1}: ${error.message || '(empty)'}`);
    await sleep(2500 * (attempt + 1));
  }
  return null;
}

async function countIn(
  sb: SupabaseClient,
  table: string,
  col: string,
  values: string[]
): Promise<number | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { count: n, error } = await sb
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in(col, values);
    if (!error) return n ?? 0;
    await sleep(2000 * (attempt + 1));
  }
  return null;
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const census = {
    task: 'INS-NAT-FINAL-001',
    at: new Date().toISOString(),
    publication: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishPerson: mayPublishEntityKind('person'),
      mayPublishCarrier: mayPublishEntityKind('carrier'),
      mayPublishAgency: mayPublishEntityKind('agency'),
    },
    entities: {
      agency: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
      person: await count(sb, 'national_entities', [['entity_kind', 'person']]),
      carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    },
    credentials: {
      total: await count(sb, 'license_credentials'),
      person: await count(sb, 'license_credentials', [['entity_kind', 'person']]),
      agency: await count(sb, 'license_credentials', [['entity_kind', 'agency']]),
      fl: await count(sb, 'license_credentials', [['jurisdiction', 'FL']]),
      tx: await count(sb, 'license_credentials', [['jurisdiction', 'TX']]),
      vt: await count(sb, 'license_credentials', [['jurisdiction', 'VT']]),
      oh: await count(sb, 'license_credentials', [['jurisdiction', 'OH']]),
      nv: await count(sb, 'license_credentials', [['jurisdiction', 'NV']]),
      nj: await count(sb, 'license_credentials', [['jurisdiction', 'NJ']]),
      nc: await count(sb, 'license_credentials', [['jurisdiction', 'NC']]),
      ma: await count(sb, 'license_credentials', [['jurisdiction', 'MA']]),
      ms: await count(sb, 'license_credentials', [['jurisdiction', 'MS']]),
    },
    loas: {
      total: await count(sb, 'loa_observations'),
      txTdi: await count(sb, 'loa_observations', [['source_dataset', 'texas_tdi']]),
      txTdiIndividual: await count(sb, 'loa_observations', [
        ['source_dataset', 'texas_tdi_individual'],
      ]),
      vt: await count(sb, 'loa_observations', [['source_dataset', 'vermont_dfr']]),
      ma: await count(sb, 'loa_observations', [
        ['source_dataset', 'massachusetts_doi_regulatory'],
      ]),
    },
    relationships: {
      associatedWith: await count(sb, 'national_relationships', [
        ['relationship_type', 'ASSOCIATED_WITH'],
      ]),
      appointedBy: await count(sb, 'national_relationships', [
        ['relationship_type', 'appointed_by'],
      ]),
      flAppointedTo: await count(sb, 'national_relationships', [
        ['relationship_type', 'APPOINTED_TO'],
        ['source_dataset', 'florida_dfs_individual_appointments'],
      ]),
    },
    contacts: {
      total: await count(sb, 'contact_observations'),
      email: await count(sb, 'contact_observations', [['contact_kind', 'email']]),
      phone: await count(sb, 'contact_observations', [['contact_kind', 'phone']]),
      physical: await count(sb, 'contact_observations', [['contact_kind', 'physical_address']]),
      mailing: await count(sb, 'contact_observations', [['contact_kind', 'mailing_address']]),
      website: await count(sb, 'contact_observations', [['contact_kind', 'website']]),
      ma: await count(sb, 'contact_observations', [
        ['source_dataset', 'massachusetts_doi_regulatory'],
      ]),
    },
    cms: {
      total: await count(sb, 'cms_marketplace_observations'),
      attached: await count(sb, 'cms_marketplace_observations', [
        ['identity_attachment', 'ATTACHED'],
      ]),
      unattached: await count(sb, 'cms_marketplace_observations', [
        ['identity_attachment', 'UNATTACHED'],
      ]),
      kindConflict: await count(sb, 'cms_marketplace_observations', [
        ['identity_attachment', 'KIND_CONFLICT'],
      ]),
    },
    evidence: {
      regulatory: await count(sb, 'regulatory_evidence'),
      certification: await count(sb, 'certification_observations'),
      conflicts: await count(sb, 'national_identity_conflicts'),
      bridges: await count(sb, 'provider_entity_bridges'),
    },
    public: {
      providers: await count(sb, 'providers'),
    },
    staging: {
      dfsProducers: await count(sb, 'dfs_producers'),
      tdiProducers: await count(sb, 'tdi_producers'),
      vtProducers: await count(sb, 'vt_producers'),
      odiProducers: await count(sb, 'odi_producers'),
      nvProducers: await count(sb, 'nv_producers'),
      njProducers: await count(sb, 'nj_producers'),
      ncProducers: await count(sb, 'nc_producers'),
      msProducers: await count(sb, 'ms_producers'),
      maProducers: await count(sb, 'ma_producers'),
    },
  };

  const txAppointedTo = await count(sb, 'national_relationships', [
    ['relationship_type', 'APPOINTED_TO'],
    ['source_dataset', 'texas_tdi_individual_appointments'],
  ]);
  (census.relationships as Record<string, number | null>).txAppointedTo = txAppointedTo;

  mkdirSync(resolve('data/reports'), { recursive: true });
  writeFileSync(
    resolve('data/reports/ins-nat-final-001-census.json'),
    JSON.stringify(census, null, 2)
  );
  console.log(JSON.stringify(census, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
