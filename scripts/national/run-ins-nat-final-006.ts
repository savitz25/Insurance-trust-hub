/**
 * INS-NAT-FINAL-006 — national completion gate (read-only except report files).
 *
 *   npx tsx scripts/national/run-ins-nat-final-006.ts
 *
 * Does not start Florida. Does not write graph tables.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPublishEntityKind,
} from '../../lib/national/publication';
import {
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  affiliationInheritsAdverse,
  agencyActionDisciplinesPerson,
  brandInheritsAdverse,
  complaintIsEnforcementFinding,
  complaintIsFinalOrder,
  groupInheritsMemberAdverse,
  personActionDisciplinesAgency,
} from '../../lib/national/regulatory-evidence';
import {
  LEGAL_INSURER_DISPLAY_DECISION,
  complaintZeroIsCleanRecord,
  legalInsurerEvidenceAppearsOnAgencyReport,
} from '../../lib/national/regulatory-display';
import {
  TRUST_REPORT_MODULES,
  TRUST_REPORT_VERSION,
  cmsRegistrationIsNotLicense,
} from '../../lib/national/agency-trust-report';
import {
  FL_DIGIT_COINCIDENCES,
  TX_UNRESOLVED_IDS,
  flDfsNumberIsNaic,
} from '../../lib/national/appointer-crosswalk';
import {
  BRIDGE_MATCH_METHOD,
  buildExpectedConfirmedBridges,
  extractProviderNpn,
  nameOnlyProviderBridges,
  reconcileProviderBridges,
  type ExistingBridgeRow,
} from '../../lib/national/provider-graph-bridge';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');
const TASK = 'INS-NAT-FINAL-006';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>,
  fallback?: number
): Promise<number> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    last = error.message || '(empty)';
    await sleep(1500 * (attempt + 1));
  }
  if (typeof fallback === 'number') return fallback;
  console.error(`count miss ${table} ${eqs?.map((e) => e.join('=')).join(',') || ''}: ${last}`);
  return -1;
}

async function countIs(
  sb: SupabaseClient,
  table: string,
  col: string,
  value: null
): Promise<number> {
  void value;
  const { count: n, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .is(col, null);
  if (error) throw new Error(`${table}.${col} null: ${error.message}`);
  return n ?? 0;
}

async function countNotNull(
  sb: SupabaseClient,
  table: string,
  col: string
): Promise<number> {
  const { count: n, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .not(col, 'is', null);
  if (error) throw new Error(`${table}.${col} notnull: ${error.message}`);
  return n ?? 0;
}

async function countEqIs(
  sb: SupabaseClient,
  table: string,
  eqCol: string,
  eqVal: string,
  isCol: string
): Promise<number> {
  const { count: n, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(eqCol, eqVal)
    .is(isCol, null);
  if (error) throw new Error(`${table} eq+is: ${error.message}`);
  return n ?? 0;
}

async function countEqNotNull(
  sb: SupabaseClient,
  table: string,
  eqCol: string,
  eqVal: string,
  nnCol: string
): Promise<number> {
  const { count: n, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(eqCol, eqVal)
    .not(nnCol, 'is', null);
  if (error) throw new Error(`${table} eq+nn: ${error.message}`);
  return n ?? 0;
}

async function countLike(
  sb: SupabaseClient,
  table: string,
  eqKind: string,
  col: string,
  pattern: string
): Promise<number> {
  const { count: n, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('entity_kind', eqKind)
    .like(col, pattern);
  if (error) throw new Error(`${table} like: ${error.message}`);
  return n ?? 0;
}

async function pageProviders(sb: SupabaseClient) {
  const out: Array<{ id: string; npn: string | null }> = [];
  const page = 500;
  let lastId: string | null = null;
  for (;;) {
    let rows: Array<Record<string, unknown>> = [];
    let last = 'unknown';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let q = sb
        .from('providers')
        .select('id,license_info')
        .order('id', { ascending: true })
        .limit(page);
      if (lastId) q = q.gt('id', lastId);
      const { data, error } = await q;
      if (!error) {
        rows = (data ?? []) as Array<Record<string, unknown>>;
        last = '';
        break;
      }
      last = error.message || '(empty)';
      await sleep(1500 * (attempt + 1));
    }
    if (last) throw new Error(`providers: ${last}`);
    if (!rows.length) break;
    for (const r of rows) {
      out.push({ id: String(r.id), npn: extractProviderNpn({ licenseInfo: r.license_info }) });
    }
    lastId = String(rows[rows.length - 1]!.id);
    if (out.length % 40000 === 0) console.error(`providers ${out.length}`);
    if (rows.length < page) break;
  }
  return out;
}

async function pageAgencies(sb: SupabaseClient) {
  const out: Array<{ id: string; npn: string | null; identity_confidence: string }> = [];
  const page = 500;
  let lastNpn: string | null = null;
  for (;;) {
    let rows: Array<Record<string, unknown>> = [];
    let last = 'unknown';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let q = sb
        .from('national_entities')
        .select('id,npn,identity_confidence')
        .eq('entity_kind', 'agency')
        .not('npn', 'is', null)
        .order('npn', { ascending: true })
        .limit(page);
      if (lastNpn) q = q.gt('npn', lastNpn);
      const { data, error } = await q;
      if (!error) {
        rows = (data ?? []) as Array<Record<string, unknown>>;
        last = '';
        break;
      }
      last = error.message || '(empty)';
      await sleep(1500 * (attempt + 1));
    }
    if (last) throw new Error(`agencies: ${last}`);
    if (!rows.length) break;
    for (const r of rows) {
      out.push({
        id: String(r.id),
        npn: normalizeNpn(r.npn as string | null),
        identity_confidence: String(r.identity_confidence),
      });
    }
    lastNpn = String(rows[rows.length - 1]!.npn);
    if (rows.length < page) break;
  }
  return out;
}

async function pageBridges(sb: SupabaseClient): Promise<ExistingBridgeRow[]> {
  const out: ExistingBridgeRow[] = [];
  const page = 1000;
  let lastId: string | null = null;
  for (;;) {
    let q = sb
      .from('provider_entity_bridges')
      .select('id,provider_id,entity_id,match_method,confidence,source,notes,matched_at')
      .order('id', { ascending: true })
      .limit(page);
    if (lastId) q = q.gt('id', lastId);
    const { data, error } = await q;
    if (error) throw new Error(`bridges: ${error.message}`);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      out.push({
        id: String(r.id),
        providerId: String(r.provider_id),
        entityId: r.entity_id ? String(r.entity_id) : null,
        matchMethod: r.match_method ? String(r.match_method) : null,
        confidence: r.confidence ? String(r.confidence) : null,
        source: r.source ? String(r.source) : null,
        notes: r.notes ? String(r.notes) : null,
        matchedAt: r.matched_at ? String(r.matched_at) : null,
      });
    }
    lastId = String(rows[rows.length - 1]!.id);
    if (rows.length < page) break;
  }
  return out;
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.error('Counting core tables…');
  const entities = {
    agency: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    person: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    flAppointing: await countLike(sb, 'national_entities', 'carrier', 'provisional_key', 'carrier:fl-dfs:%'),
    txAppointing: await countLike(sb, 'national_entities', 'carrier', 'provisional_key', 'carrier:tx-tdi-naic:%'),
    agencyConfirmed: await count(sb, 'national_entities', [
      ['entity_kind', 'agency'],
      ['identity_confidence', 'CONFIRMED'],
    ]),
    personConfirmed: await count(sb, 'national_entities', [
      ['entity_kind', 'person'],
      ['identity_confidence', 'CONFIRMED'],
    ]),
  };

  const credentials = {
    total: await count(sb, 'license_credentials'),
    person: await count(sb, 'license_credentials', [['entity_kind', 'person']]),
    agency: await count(sb, 'license_credentials', [['entity_kind', 'agency']]),
    FL: await count(sb, 'license_credentials', [['jurisdiction', 'FL']]),
    TX: await count(sb, 'license_credentials', [['jurisdiction', 'TX']]),
    VT: await count(sb, 'license_credentials', [['jurisdiction', 'VT']]),
    OH: await count(sb, 'license_credentials', [['jurisdiction', 'OH']]),
    MA: await count(sb, 'license_credentials', [['jurisdiction', 'MA']]),
    NV: await count(sb, 'license_credentials', [['jurisdiction', 'NV']]),
    NJ: await count(sb, 'license_credentials', [['jurisdiction', 'NJ']]),
    NC: await count(sb, 'license_credentials', [['jurisdiction', 'NC']]),
    MS: await count(sb, 'license_credentials', [['jurisdiction', 'MS']]),
  };

  const loas = {
    total: await count(sb, 'loa_observations'),
    texas_tdi: await count(sb, 'loa_observations', [['source_dataset', 'texas_tdi']]),
    texas_tdi_individual: await count(sb, 'loa_observations', [
      ['source_dataset', 'texas_tdi_individual'],
    ]),
    vermont_dfr: await count(sb, 'loa_observations', [['source_dataset', 'vermont_dfr']]),
    massachusetts_doi_regulatory: await count(sb, 'loa_observations', [
      ['source_dataset', 'massachusetts_doi_regulatory'],
    ]),
  };

  const flAppointedTo = await count(sb, 'national_relationships', [
    ['relationship_type', 'APPOINTED_TO'],
    ['source_dataset', 'florida_dfs_individual_appointments'],
  ]);
  const txAppointedTo = await count(sb, 'national_relationships', [
    ['relationship_type', 'APPOINTED_TO'],
    ['source_dataset', 'texas_tdi_individual_appointments'],
  ]);
  const relationships = {
    APPOINTED_TO:
      flAppointedTo >= 0 && txAppointedTo >= 0 ? flAppointedTo + txAppointedTo : -1,
    appointed_by: await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]),
    ASSOCIATED_WITH: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
    APPOINTER_RESOLVES_TO: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    MEMBER_OF_GROUP: await count(sb, 'national_relationships', [
      ['relationship_type', 'MEMBER_OF_GROUP'],
    ]),
    USES_BRAND: await count(sb, 'national_relationships', [['relationship_type', 'USES_BRAND']]),
    flAppointedTo,
    txAppointedTo,
  };

  const contacts = {
    total: await count(sb, 'contact_observations'),
    email: await count(sb, 'contact_observations', [['contact_kind', 'email']]),
    phone: await count(sb, 'contact_observations', [['contact_kind', 'phone']]),
    physical_address: await count(sb, 'contact_observations', [
      ['contact_kind', 'physical_address'],
    ]),
    mailing_address: await count(sb, 'contact_observations', [['contact_kind', 'mailing_address']]),
    website: await count(sb, 'contact_observations', [['contact_kind', 'website']]),
    publicEligible: await (async () => {
      const { count: n, error } = await sb
        .from('contact_observations')
        .select('id', { count: 'exact', head: true })
        .eq('public_eligible', true);
      if (error) throw new Error(error.message);
      return n ?? 0;
    })(),
  };

  const cms = {
    total: await count(sb, 'cms_marketplace_observations', undefined, 1300108),
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
    total: await count(sb, 'regulatory_evidence'),
    complaint: await count(sb, 'regulatory_evidence', [['evidence_family', 'COMPLAINT']]),
    subtype: await count(sb, 'regulatory_evidence', [
      ['evidence_subtype', 'CONFIRMED_COMPLAINT_INDEX'],
    ]),
    internalOnly: await count(sb, 'regulatory_evidence', [
      ['publication_readiness', 'INTERNAL_ONLY'],
    ]),
    confirmed: await count(sb, 'regulatory_evidence', [['attribution_confidence', 'CONFIRMED']]),
    unresolved: await count(sb, 'regulatory_evidence', [['attribution_confidence', 'UNRESOLVED']]),
    review: await count(sb, 'regulatory_evidence', [['attribution_confidence', 'REVIEW_REQUIRED']]),
    isFinalTrue: await (async () => {
      const { count: n, error } = await sb
        .from('regulatory_evidence')
        .select('id', { count: 'exact', head: true })
        .eq('is_final', true);
      if (error) throw new Error(error.message);
      return n ?? 0;
    })(),
    attachedUnresolved: await countEqNotNull(
      sb,
      'regulatory_evidence',
      'attribution_confidence',
      'UNRESOLVED',
      'entity_id'
    ),
    unattachedConfirmed: await countEqIs(
      sb,
      'regulatory_evidence',
      'attribution_confidence',
      'CONFIRMED',
      'entity_id'
    ),
    unresolvedNullEntity: await countEqIs(
      sb,
      'regulatory_evidence',
      'attribution_confidence',
      'UNRESOLVED',
      'entity_id'
    ),
  };

  const publicTables = {
    providers: await count(sb, 'providers'),
    bridges: await count(sb, 'provider_entity_bridges'),
    conflicts: await count(sb, 'national_identity_conflicts'),
  };

  console.error('Paging bridges / providers / agencies for exact reconciliation…');
  const existing = await pageBridges(sb);
  const providers = await pageProviders(sb);
  const agencies = await pageAgencies(sb);
  const agenciesByNpn = new Map<string, string[]>();
  for (const a of agencies) {
    if (!a.npn) continue;
    const list = agenciesByNpn.get(a.npn) ?? [];
    list.push(a.id);
    agenciesByNpn.set(a.npn, list);
  }
  const providersByNpn = new Map<string, string[]>();
  for (const p of providers) {
    if (!p.npn) continue;
    const list = providersByNpn.get(p.npn) ?? [];
    list.push(p.id);
    providersByNpn.set(p.npn, list);
  }
  const expected = buildExpectedConfirmedBridges({
    providers,
    agenciesByNpn,
    providersByNpn,
  });
  const recon = reconcileProviderBridges({ expected, existing });

  const publication = {
    PUBLIC_PERSON_PROFILES_ENABLED,
    PUBLIC_REGULATORY_EVIDENCE_ENABLED,
    LEGAL_INSURER_DISPLAY_DECISION,
    mayPublishPerson: mayPublishEntityKind('person'),
    mayPublishAgency: mayPublishEntityKind('agency'),
    mayPublishCarrier: mayPublishEntityKind('carrier'),
    mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
    mayPublishGroup: mayPublishEntityKind('insurance_group'),
    mayPublishBrand: mayPublishEntityKind('consumer_brand'),
    publicGraphAgencies: 0,
    publicPeople: 0,
    publicLegalInsurers: 0,
    publicGroups: 0,
    publicBrands: 0,
    sitemapPeople: false,
    sitemapChanges: false,
    robotsChanges: false,
  };

  const semantics = {
    complaintIsFinalOrder: complaintIsFinalOrder(),
    complaintIsEnforcementFinding: complaintIsEnforcementFinding(),
    complaintZeroIsCleanRecord: complaintZeroIsCleanRecord(),
    personToAgency: personActionDisciplinesAgency(),
    agencyToPerson: agencyActionDisciplinesPerson(),
    legalToBrand: brandInheritsAdverse(),
    legalToGroup: groupInheritsMemberAdverse(),
    affiliationInherits: affiliationInheritsAdverse(),
    legalInsurerOnAgencyReport: legalInsurerEvidenceAppearsOnAgencyReport(),
    cmsRegistrationIsNotLicense: cmsRegistrationIsNotLicense(),
    nameOnlyBridges: nameOnlyProviderBridges(),
    flDfsNumberIsNaic: flDfsNumberIsNaic(),
    trustReportVersion: TRUST_REPORT_VERSION,
    trustReportModules: TRUST_REPORT_MODULES,
  };

  const unresolvedHeld = {
    txUnresolvedAppointerIds: [...TX_UNRESOLVED_IDS],
    flDigitCoincidences: [...FL_DIGIT_COINCIDENCES],
    gpnmCocodeHold: '17686',
    maHeldNpns: 1961,
  };

  const census = {
    task: TASK,
    at: new Date().toISOString(),
    entities,
    credentials,
    loas,
    relationships,
    contacts,
    cms,
    evidence,
    publicTables,
    publication,
    semantics,
    unresolvedHeld,
    bridges: {
      production: existing.length,
      expected: expected.length,
      ...recon.summary,
      reviewRequired: existing.filter((b) => b.confidence === 'REVIEW_REQUIRED').length,
      unresolved: existing.filter((b) => b.confidence === 'UNRESOLVED').length,
      nonExactNpn: existing.filter((b) => b.matchMethod !== BRIDGE_MATCH_METHOD).length,
      zeroDelta:
        recon.summary.missing === 0 &&
        recon.summary.staleExtra === 0 &&
        recon.summary.wrongTarget === 0 &&
        recon.summary.duplicate === 0 &&
        existing.length === expected.length,
    },
    agenciesPaged: {
      count: agencies.length,
      withNpn: agencies.filter((a) => a.npn).length,
      confirmed: agencies.filter((a) => a.identity_confidence === 'CONFIRMED').length,
    },
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'ins-nat-final-006-census.json'), JSON.stringify(census, null, 2));
  writeFileSync(
    join(OUT, 'ins-nat-final-006-bridge-reconciliation.json'),
    JSON.stringify({ at: census.at, ...census.bridges }, null, 2)
  );
  console.log(JSON.stringify(census, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
