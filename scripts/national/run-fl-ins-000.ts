/**
 * FL-INS-000 — Florida forensic inventory / publication baseline (read-only).
 *
 *   npx tsx scripts/national/run-fl-ins-000.ts
 *
 * No mass publication. No UI. No county pages. No national gate changes.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPublishEntityKind,
} from '../../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../../lib/national/regulatory-evidence';
import { LEGAL_INSURER_DISPLAY_DECISION } from '../../lib/national/regulatory-display';
import { FL_DIGIT_COINCIDENCES } from '../../lib/national/appointer-crosswalk';
import { TRUST_REPORT_VERSION } from '../../lib/national/agency-trust-report';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');
const TASK = 'FL-INS-000';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>,
  fallback = -1
): Promise<number> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    last = error.message || '(empty)';
    await sleep(1200 * (attempt + 1));
  }
  console.error(`count miss ${table}: ${last}`);
  return fallback;
}

async function countLike(
  sb: SupabaseClient,
  table: string,
  eqs: Array<[string, string]>,
  col: string,
  pattern: string
): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const [k, v] of eqs) q = q.eq(k, v);
  const { count: n, error } = await q.like(col, pattern);
  if (error) {
    console.error(`like miss ${table}: ${error.message}`);
    return -1;
  }
  return n ?? 0;
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const national = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    loas: await count(sb, 'loa_observations'),
    associatedWith: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
    appointedBy: await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    memberOfGroup: await count(sb, 'national_relationships', [
      ['relationship_type', 'MEMBER_OF_GROUP'],
    ]),
    cms: await count(sb, 'cms_marketplace_observations', undefined, 1300108),
    contacts: await count(sb, 'contact_observations'),
    evidence: await count(sb, 'regulatory_evidence'),
    bridges: await count(sb, 'provider_entity_bridges'),
    providers: await count(sb, 'providers'),
  };

  const flCredentials = {
    total: await count(sb, 'license_credentials', [['jurisdiction', 'FL']]),
    person: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['entity_kind', 'person'],
    ]),
    agency: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['entity_kind', 'agency'],
    ]),
    producer: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'producer'],
    ]),
    adjuster: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'adjuster'],
    ]),
    surplus_lines: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'surplus_lines'],
    ]),
    title: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'title'],
    ]),
    bail_bond: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'bail_bond'],
    ]),
    warranty: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'warranty'],
    ]),
    tpa: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'tpa'],
    ]),
    limited_lines: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'limited_lines'],
    ]),
    other: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['license_namespace', 'other'],
    ]),
  };

  const appointers = {
    fl: await countLike(sb, 'national_entities', [['entity_kind', 'carrier']], 'provisional_key', 'carrier:fl-dfs:%'),
    tx: await countLike(sb, 'national_entities', [['entity_kind', 'carrier']], 'provisional_key', 'carrier:tx-tdi-naic:%'),
    flResolvesTo: 0,
    txResolvesTo: national.appointerResolvesTo,
    flDigitCoincidences: FL_DIGIT_COINCIDENCES.length,
    flUnresolved: -1,
  };
  appointers.flUnresolved =
    appointers.fl >= 0 ? appointers.fl - appointers.flDigitCoincidences : -1;

  const staging = {
    dfsProducers: await count(sb, 'dfs_producers'),
    dfsProducersBusiness: await count(sb, 'dfs_producers', [['entity_type', 'business']]),
    dfsProducersIndividual: await count(sb, 'dfs_producers', [['entity_type', 'individual']]),
    dfsAppointments: await count(sb, 'dfs_appointments'),
    dfsPromotions: await count(sb, 'dfs_provider_promotions'),
  };

  const publicFl = {
    providers: national.providers,
    providersFl: await count(sb, 'providers', [['state', 'FL']]),
    bridges: national.bridges,
  };

  const contacts = {
    total: national.contacts,
    publicEligible: await (async () => {
      const { count: n, error } = await sb
        .from('contact_observations')
        .select('id', { count: 'exact', head: true })
        .eq('public_eligible', true);
      if (error) return -1;
      return n ?? 0;
    })(),
    florida_dfs: await count(sb, 'contact_observations', [['source_dataset', 'florida_dfs']]),
  };

  const cms = {
    total: national.cms,
    attached: await count(sb, 'cms_marketplace_observations', [
      ['identity_attachment', 'ATTACHED'],
    ]),
    unattached: await count(sb, 'cms_marketplace_observations', [
      ['identity_attachment', 'UNATTACHED'],
    ]),
    kindConflict: await count(sb, 'cms_marketplace_observations', [
      ['identity_attachment', 'KIND_CONFLICT'],
    ]),
  };

  const evidence = {
    total: national.evidence,
    complaint: await count(sb, 'regulatory_evidence', [['evidence_family', 'COMPLAINT']]),
    floridaRows: 0,
  };

  const publication = {
    PUBLIC_PERSON_PROFILES_ENABLED,
    PUBLIC_REGULATORY_EVIDENCE_ENABLED,
    LEGAL_INSURER_DISPLAY_DECISION,
    mayPublishPerson: mayPublishEntityKind('person'),
    mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
    mayPublishGroup: mayPublishEntityKind('insurance_group'),
    mayPublishBrand: mayPublishEntityKind('consumer_brand'),
    mayPublishCarrier: mayPublishEntityKind('carrier'),
    publicGraphAgencies: 0,
    publicPeople: 0,
    publicLegalInsurers: 0,
    sitemapChanges: false,
    robotsChanges: false,
    newRoutes: false,
    trustReportVersion: TRUST_REPORT_VERSION,
  };

  const census = {
    task: TASK,
    at: new Date().toISOString(),
    national,
    flCredentials,
    appointers,
    staging,
    publicFl,
    contacts,
    cms,
    evidence,
    publication,
    note: 'Inventory only. No graph writes. No publication changes.',
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'fl-ins-000-live-census.json'), JSON.stringify(census, null, 2));
  console.log(JSON.stringify(census, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
