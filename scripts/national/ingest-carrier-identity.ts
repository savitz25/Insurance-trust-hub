/**
 * INS-NAT-FINAL-002B — controlled production ingest of NAIC legal insurers + groups.
 *
 *   npx tsx scripts/national/ingest-carrier-identity.ts
 *   npx tsx scripts/national/ingest-carrier-identity.ts --apply-schema
 *   npx tsx scripts/national/ingest-carrier-identity.ts --execute
 *
 * Default is dry-run. Never writes public.providers.
 * Never writes APPOINTER_RESOLVES_TO or USES_BRAND.
 * Never mutates FL/TX appointing entities.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { CARRIER_REGISTRY } from '../../lib/carriers/registry';
import {
  CARRIER_RELATIONSHIP_TYPE,
  IDENTIFIER_SCHEME,
  classifyFlAppointingToNational,
  classifyTxAppointingToNational,
  consumerBrandProvisionalKey,
  insuranceGroupProvisionalKey,
  legalInsurerProvisionalKey,
  parseAppointingEntityKey,
} from '../../lib/national/legal-insurer-identity';
import {
  NAIC_LOC_SOURCE,
  listingDirFromZipParent,
  parseNaicListingDir,
  predictedInsuranceGroupEntities,
  predictedLegalInsurerEntities,
  sha256File,
} from '../../lib/national/naic-listing';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPublishEntityKind,
} from '../../lib/national/publication';

const { Client } = pg;

export const TASK = 'INS-NAT-FINAL-002B';
export const TRANSFORM = 'ins-nat-final-002b.v1';
export const SOURCE_DATASET = 'naic_loc_jun_2026';
export const SOURCE_OBSERVED_AT = '2026-08-27T00:00:00.000Z';

export const APPROVED = {
  zipSha256: 'baabd84b0c4d546865e9b28c2e54d7ac1f40146192f5dc0e37eb5e5e0440a260',
  parserFingerprint: '9fdc197f2dad28ee9a274b404d9ace58a3be5c9de9a12257ba821f26b71dc39e',
  dryRunFingerprint: 'bad17e96dce6286cdee6e66b84d9fbd8b8e1eeb59834c6996ba3a27319ada50f',
  migrationSha256: '70b01c012ec825ec02729eba943d1d310aa11527508f1e6ee9fb1933c19745c5',
  legalInsurers: 6185,
  groups: 720,
  memberships: 3845,
  brands: 14,
  txAppointers: 1517,
  txConfirmed: 1510,
  txUnresolved: [
    '14348',
    '16806',
    '38466',
    '62472',
    '70335',
    '91413',
    '95175',
  ],
  flAppointers: 11944,
  providers: 170499,
  sameNameDifferentCoCodeGroups: 29,
} as const;

const BLANK_TYPE: Record<string, string> = {
  'PROP.csv': 'property',
  'LIFE.csv': 'life',
  'HLTH.csv': 'health',
  'TILE.csv': 'title',
  'FRAT.csv': 'fraternal',
  'ORBE.csv': 'other',
};

const ROOT = resolve(process.cwd());
const execute = process.argv.includes('--execute');
const applySchemaFlag = process.argv.includes('--apply-schema') || execute;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    last = `${error.code || ''} ${error.message || '(empty)'}`.trim();
    if (/PGRST205|schema cache|does not exist|22P02/i.test(last) && attempt < 5) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    throw new Error(`${table}${eqs ? JSON.stringify(eqs) : ''}: ${last}`);
  }
  throw new Error(`${table}: ${last}`);
}

async function countKind(sb: SupabaseClient, kind: string): Promise<number | null> {
  const { count: n, error } = await sb
    .from('national_entities')
    .select('id', { count: 'exact', head: true })
    .eq('entity_kind', kind);
  if (error) return null;
  return n ?? 0;
}

async function pageKeys(
  sb: SupabaseClient,
  kind: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,provisional_key')
      .eq('entity_kind', kind)
      .range(from, from + page - 1);
    if (error) throw new Error(`pageKeys ${kind}: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      if (r.provisional_key) map.set(String(r.provisional_key), String(r.id));
    }
    if (rows.length < page) break;
  }
  return map;
}

async function pageCarrierKeys(sb: SupabaseClient) {
  const fl: string[] = [];
  const tx: string[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from('national_entities')
      .select('provisional_key')
      .eq('entity_kind', 'carrier')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      const k = String(r.provisional_key || '');
      if (k.startsWith('carrier:fl-dfs:')) fl.push(k);
      else if (k.startsWith('carrier:tx-tdi-naic:')) tx.push(k);
    }
    if (rows.length < page) break;
  }
  return { fl, tx };
}

function databaseUrl(): string | null {
  const v = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DIRECT_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim();
  return v || null;
}

export async function applyCarrierIdentityMigration(): Promise<{
  applied: boolean;
  alreadyPresent: boolean;
  method: string;
}> {
  const sqlPath = join(ROOT, 'supabase/migrations/20260827120000_insurance_carrier_identity.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const sha = createHash('sha256').update(readFileSync(sqlPath)).digest('hex');
  if (sha !== APPROVED.migrationSha256) {
    throw new Error(`migration_sha_mismatch got=${sha} expected=${APPROVED.migrationSha256}`);
  }
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      'SCHEMA_MISSING_NO_DATABASE_URL: additive migration is not applied and no Postgres URL is available. Set DATABASE_URL (session pooler or direct) and re-run with --apply-schema --execute.'
    );
  }
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    await client.query("NOTIFY pgrst, 'reload schema'");
  } finally {
    await client.end();
  }
  return { applied: true, alreadyPresent: false, method: 'postgres' };
}

async function schemaReady(sb: SupabaseClient): Promise<boolean> {
  const ident = await sb.from('national_entity_identifiers').select('id').limit(1);
  if (ident.error) return false;
  const probe = await sb
    .from('national_entities')
    .select('id', { count: 'exact', head: true })
    .eq('entity_kind', 'legal_insurer');
  return !probe.error;
}

async function insertEntities(
  sb: SupabaseClient,
  rows: Array<Record<string, unknown>>,
  existing: Map<string, string>
): Promise<number> {
  let inserted = 0;
  for (const part of chunk(rows, 80)) {
    const fresh = part.filter((r) => !existing.has(String(r.provisional_key)));
    if (!fresh.length) continue;
    const { data, error } = await sb
      .from('national_entities')
      .insert(fresh)
      .select('id,provisional_key');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        for (const row of fresh) {
          const { data: one, error: e2 } = await sb
            .from('national_entities')
            .insert(row)
            .select('id,provisional_key')
            .single();
          if (e2) {
            if (/duplicate|unique/i.test(e2.message)) continue;
            throw new Error(`entity insert: ${e2.message}`);
          }
          if (one?.provisional_key) {
            existing.set(String(one.provisional_key), String(one.id));
            inserted += 1;
          }
        }
        continue;
      }
      throw new Error(`entity batch: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (row.provisional_key) {
        existing.set(String(row.provisional_key), String(row.id));
        inserted += 1;
      }
    }
  }
  return inserted;
}

async function insertIdentifiers(
  sb: SupabaseClient,
  rows: Array<Record<string, unknown>>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const part of chunk(rows, 80)) {
    const { data, error } = await sb
      .from('national_entity_identifiers')
      .insert(part)
      .select('id');
    if (!error) {
      inserted += data?.length ?? 0;
      continue;
    }
    if (!/duplicate|unique/i.test(error.message)) {
      throw new Error(`identifier batch: ${error.message}`);
    }
    for (const row of part) {
      const { data: one, error: e2 } = await sb
        .from('national_entity_identifiers')
        .insert(row)
        .select('id')
        .single();
      if (e2) {
        if (/duplicate|unique/i.test(e2.message)) {
          skipped += 1;
          continue;
        }
        throw new Error(`identifier: ${e2.message}`);
      }
      if (one) inserted += 1;
    }
  }
  return { inserted, skipped };
}

async function insertAliases(
  sb: SupabaseClient,
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (!rows.length) return 0;
  let inserted = 0;
  for (const part of chunk(rows, 80)) {
    const { data, error } = await sb.from('national_entity_aliases').insert(part).select('id');
    if (!error) {
      inserted += data?.length ?? 0;
      continue;
    }
    if (!/duplicate|unique/i.test(error.message)) throw new Error(`alias: ${error.message}`);
    for (const row of part) {
      const { error: e2 } = await sb.from('national_entity_aliases').insert(row).select('id').single();
      if (e2) {
        if (/duplicate|unique/i.test(e2.message)) continue;
        throw new Error(`alias row: ${e2.message}`);
      }
      inserted += 1;
    }
  }
  return inserted;
}

async function insertRels(
  sb: SupabaseClient,
  rows: Array<Record<string, unknown>>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const part of chunk(rows, 80)) {
    const { data, error } = await sb.from('national_relationships').insert(part).select('id');
    if (!error) {
      inserted += data?.length ?? 0;
      continue;
    }
    if (!/duplicate|unique/i.test(error.message)) {
      throw new Error(`relationship batch: ${error.message}`);
    }
    for (const row of part) {
      const { error: e2 } = await sb
        .from('national_relationships')
        .insert(row)
        .select('id')
        .single();
      if (e2) {
        if (/duplicate|unique/i.test(e2.message)) {
          skipped += 1;
          continue;
        }
        throw new Error(`relationship: ${e2.message}`);
      }
      inserted += 1;
    }
  }
  return { inserted, skipped };
}

function sameNameDifferentCo(companies: Array<{ companyName: string; cocode: string }>) {
  const byName = new Map<string, Set<string>>();
  for (const c of companies) {
    const k = c.companyName.toUpperCase();
    const set = byName.get(k) ?? new Set<string>();
    set.add(c.cocode);
    byName.set(k, set);
  }
  let n = 0;
  for (const set of byName.values()) if (set.size > 1) n += 1;
  return n;
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const runId = `${TASK.toLowerCase()}-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}Z`;
  const locDir =
    listingDirFromZipParent(join(ROOT, 'data/naic-raw')) ||
    join(ROOT, 'data/naic-raw/loc-jun-2026');
  const zipPath = join(ROOT, 'data/naic-raw', NAIC_LOC_SOURCE.zipFileName);
  const zipSha = sha256File(zipPath);
  if (!zipSha || zipSha !== APPROVED.zipSha256) {
    throw new Error(`naic_zip_fingerprint_mismatch got=${zipSha} expected=${APPROVED.zipSha256}`);
  }
  const listing = parseNaicListingDir(locDir);
  if (listing.fingerprint !== APPROVED.parserFingerprint) {
    throw new Error(
      `parser_fingerprint_mismatch got=${listing.fingerprint} expected=${APPROVED.parserFingerprint} — STOP and regenerate dry-run`
    );
  }
  const legal = predictedLegalInsurerEntities(listing);
  const groups = predictedInsuranceGroupEntities(listing);
  if (legal.length !== APPROVED.legalInsurers) {
    throw new Error(`legal_count ${legal.length} != ${APPROVED.legalInsurers}`);
  }
  if (groups.length !== APPROVED.groups) {
    throw new Error(`group_count ${groups.length} != ${APPROVED.groups}`);
  }
  if (listing.memberships.length !== APPROVED.memberships) {
    throw new Error(`membership_count ${listing.memberships.length} != ${APPROVED.memberships}`);
  }
  const nameGroups = sameNameDifferentCo(listing.companies);
  if (nameGroups !== APPROVED.sameNameDifferentCoCodeGroups) {
    throw new Error(
      `same_name_different_cocode ${nameGroups} != ${APPROVED.sameNameDifferentCoCodeGroups}`
    );
  }
  if (listing.collisions.sameCoCodeConflictingNames.length !== 0) {
    throw new Error('same CoCode conflicting names is not 0');
  }
  if (listing.collisions.groupCodeEqualsCoCode.length !== 0) {
    throw new Error('group code equals CoCode is not 0');
  }
  const legalCo = new Set(legal.map((e) => e.cocode));
  const groupCodes = new Set(groups.map((g) => g.groupCode));
  const orphanMembers = listing.memberships.filter(
    (m) => !legalCo.has(m.cocode) || !groupCodes.has(m.groupCode)
  );
  const expectedMemberships = APPROVED.memberships - orphanMembers.length;

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providersBefore = await count(sb, 'providers');
  if (providersBefore !== APPROVED.providers) {
    throw new Error(`providers ${providersBefore} != ${APPROVED.providers}`);
  }
  const agenciesBefore = await count(sb, 'national_entities', [['entity_kind', 'agency']]);
  const personsBefore = await count(sb, 'national_entities', [['entity_kind', 'person']]);
  const carriersBefore = await count(sb, 'national_entities', [['entity_kind', 'carrier']]);
  const credsBefore = await count(sb, 'license_credentials');
  const appointedByBefore = await count(sb, 'national_relationships', [
    ['relationship_type', 'appointed_by'],
  ]);

  const { fl, tx } = await pageCarrierKeys(sb);
  const coSet = new Set(listing.distinctCoCodes);
  const groupSet = new Set(listing.distinctGroupCodes);
  let txConfirmed = 0;
  let txUnresolved: string[] = [];
  let txReview = 0;
  for (const key of tx) {
    const parsed = parseAppointingEntityKey(key);
    const m = classifyTxAppointingToNational({
      txNaicId: parsed.raw,
      officialCoCodes: coSet,
      officialGroupCodes: groupSet,
    });
    if (m.confidence === 'CONFIRMED' && m.targetKind === 'legal_insurer') txConfirmed += 1;
    else if (m.confidence === 'REVIEW_REQUIRED') txReview += 1;
    else if (m.confidence === 'UNRESOLVED') txUnresolved.push(parsed.raw);
  }
  txUnresolved.sort();
  if (fl.length !== APPROVED.flAppointers || tx.length !== APPROVED.txAppointers) {
    throw new Error(
      `appointer_census_drift fl=${fl.length}/${APPROVED.flAppointers} tx=${tx.length}/${APPROVED.txAppointers}`
    );
  }
  if (txConfirmed !== APPROVED.txConfirmed) {
    throw new Error(`tx_confirmed_drift ${txConfirmed} != ${APPROVED.txConfirmed}`);
  }
  if (txUnresolved.join(',') !== APPROVED.txUnresolved.join(',')) {
    throw new Error(`tx_unresolved_drift ${txUnresolved.join(',')} != ${APPROVED.txUnresolved.join(',')}`);
  }
  let flCoincidence = 0;
  for (const key of fl) {
    const parsed = parseAppointingEntityKey(key);
    const m = classifyFlAppointingToNational({
      appointingEntityNumber: parsed.raw,
      officialCoCodes: coSet,
    });
    if (m.confidence === 'REVIEW_REQUIRED') flCoincidence += 1;
  }

  const legalPayload = legal.map((e) => {
    const rows = listing.companies.filter((c) => c.cocode === e.cocode);
    const primary = rows[0]!;
    return {
      entity_kind: 'legal_insurer',
      identity_kind: 'provisional',
      npn: null,
      provisional_key: e.provisionalKey,
      legal_name: e.legalName,
      display_name: e.legalName,
      identity_confidence: 'CONFIRMED',
      identity_notes: JSON.stringify({
        task: TASK,
        product: NAIC_LOC_SOURCE.product,
        transform: TRANSFORM,
        cocode: e.cocode,
        companyType: BLANK_TYPE[primary.sourceFile] || primary.sourceFile,
        statusCode: primary.statusCode,
        statusLabel: primary.statusLabel,
        domicile: primary.domicile,
        groupCode: e.groupCode,
        sourceFiles: e.sourceFiles,
        notQualityScore: true,
        notMisconduct: true,
      }),
    };
  });

  const groupPayload = groups.map((g) => ({
    entity_kind: 'insurance_group',
    identity_kind: 'provisional',
    npn: null,
    provisional_key: g.provisionalKey,
    legal_name: g.groupName,
    display_name: g.groupName,
    identity_confidence: 'CONFIRMED',
    identity_notes: JSON.stringify({
      task: TASK,
      product: NAIC_LOC_SOURCE.product,
      transform: TRANSFORM,
      groupCode: g.groupCode,
      memberCount: g.memberCount,
    }),
  }));

  const brandPayload = CARRIER_REGISTRY.map((b) => ({
    entity_kind: 'consumer_brand',
    identity_kind: 'provisional',
    npn: null,
    provisional_key: consumerBrandProvisionalKey(b.slug),
    legal_name: b.displayName,
    display_name: b.displayName,
    identity_confidence: 'REVIEW_REQUIRED',
    identity_notes: JSON.stringify({
      task: TASK,
      identitySource: 'curated_product_registry',
      internalOnly: true,
      legalInsurerMapping: 'none',
      slug: b.slug,
    }),
  }));

  const predicted = {
    legalInsurers: legalPayload.length,
    groups: groupPayload.length,
    brands: brandPayload.length,
    identifiers: legalPayload.length + groupPayload.length,
    memberships: expectedMemberships,
    membershipOrphans: orphanMembers.length,
    appointerResolvesTo: 0,
    usesBrand: 0,
  };

  const statusCounts = listing.statusCounts;
  const report = {
    task: TASK,
    runId,
    execute,
    at: new Date().toISOString(),
    source: {
      product: NAIC_LOC_SOURCE.product,
      zipSha256: zipSha,
      parserFingerprint: listing.fingerprint,
      dryRunFingerprint: APPROVED.dryRunFingerprint,
      observedAt: SOURCE_OBSERVED_AT,
      transform: TRANSFORM,
    },
    baseline: {
      agencies: agenciesBefore,
      persons: personsBefore,
      carriers: carriersBefore,
      credentials: credsBefore,
      appointedBy: appointedByBefore,
      providers: providersBefore,
      fl: fl.length,
      tx: tx.length,
      txConfirmed,
      txUnresolved,
      flCoincidence,
    },
    predicted,
    statusCounts,
    publication: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
      mayPublishGroup: mayPublishEntityKind('insurance_group'),
      mayPublishBrand: mayPublishEntityKind('consumer_brand'),
      mayPublishCarrier: mayPublishEntityKind('carrier'),
    },
    schema: { applied: false, alreadyPresent: false, method: 'none' as string },
    writes: {
      legalInsurersInserted: 0,
      groupsInserted: 0,
      brandsInserted: 0,
      identifiersInserted: 0,
      identifiersSkipped: 0,
      aliasesInserted: 0,
      membershipsInserted: 0,
      membershipsSkipped: 0,
      appointerResolvesTo: 0,
      usesBrand: 0,
    },
    after: {} as Record<string, unknown>,
    qa: {} as Record<string, unknown>,
    holds: orphanMembers.map(
      (m) =>
        `GPNM_MEMBER_WITHOUT_COMPANY_LISTING group=${m.groupCode} cocode=${m.cocode} name=${m.companyName}`
    ) as string[],
    errors: [] as string[],
  };

  mkdirSync(join(ROOT, 'data/reports'), { recursive: true });

  if (!execute) {
    writeFileSync(
      join(ROOT, 'data/reports/ins-nat-final-002b-dry-run.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(JSON.stringify({ ...report, note: 'DRY-RUN only. Re-run with --execute.' }, null, 2));
    return;
  }

  let ready = await schemaReady(sb);
  if (!ready) {
    if (!applySchemaFlag) {
      throw new Error('schema_not_ready; pass --apply-schema --execute');
    }
    report.schema = await applyCarrierIdentityMigration();
    for (let i = 0; i < 8 && !ready; i += 1) {
      await sleep(2000);
      ready = await schemaReady(sb);
    }
    if (!ready) {
      throw new Error('schema_applied_but_postgrest_cache_not_ready');
    }
  } else {
    report.schema = { applied: false, alreadyPresent: true, method: 'already_present' };
  }

  const legalKeys = await pageKeys(sb, 'legal_insurer');
  const groupKeys = await pageKeys(sb, 'insurance_group');
  const brandKeys = await pageKeys(sb, 'consumer_brand');

  report.writes.legalInsurersInserted = await insertEntities(sb, legalPayload, legalKeys);
  report.writes.groupsInserted = await insertEntities(sb, groupPayload, groupKeys);
  report.writes.brandsInserted = await insertEntities(sb, brandPayload, brandKeys);

  const identRows: Array<Record<string, unknown>> = [];
  for (const e of legal) {
    const id = legalKeys.get(e.provisionalKey);
    if (!id) continue;
    const primary = listing.companies.find((c) => c.cocode === e.cocode);
    identRows.push({
      entity_id: id,
      scheme: IDENTIFIER_SCHEME.NAIC_COCODE,
      value: e.cocode,
      display_value: e.cocode,
      source_dataset: SOURCE_DATASET,
      source_record_id: `${e.sourceFiles[0] || 'LOC'}:${e.cocode}`,
      source_url: NAIC_LOC_SOURCE.zipUrl,
      source_observed_at: SOURCE_OBSERVED_AT,
      attribution_confidence: 'CONFIRMED',
      raw: {
        product: NAIC_LOC_SOURCE.product,
        transform: TRANSFORM,
        runId,
        companyName: e.legalName,
        statusCode: primary?.statusCode,
        statusLabel: primary?.statusLabel,
        domicile: primary?.domicile,
        groupCode: e.groupCode,
        sourceFiles: e.sourceFiles,
        feinRaw: primary?.fein ?? null,
      },
    });
  }
  for (const g of groups) {
    const id = groupKeys.get(g.provisionalKey);
    if (!id) continue;
    identRows.push({
      entity_id: id,
      scheme: IDENTIFIER_SCHEME.NAIC_GROUP_CODE,
      value: g.groupCode,
      display_value: g.groupCode,
      source_dataset: SOURCE_DATASET,
      source_record_id: `GPAL.csv:${g.groupCode}`,
      source_url: NAIC_LOC_SOURCE.zipUrl,
      source_observed_at: SOURCE_OBSERVED_AT,
      attribution_confidence: 'CONFIRMED',
      raw: {
        product: NAIC_LOC_SOURCE.product,
        transform: TRANSFORM,
        runId,
        groupName: g.groupName,
        memberCount: g.memberCount,
      },
    });
  }
  const ident = await insertIdentifiers(sb, identRows);
  report.writes.identifiersInserted = ident.inserted;
  report.writes.identifiersSkipped = ident.skipped;

  const aliasRows: Array<Record<string, unknown>> = [];
  const namesByCo = new Map<string, Set<string>>();
  for (const c of listing.companies) {
    const set = namesByCo.get(c.cocode) ?? new Set<string>();
    set.add(c.companyName);
    namesByCo.set(c.cocode, set);
  }
  for (const m of listing.memberships) {
    const set = namesByCo.get(m.cocode) ?? new Set<string>();
    if (m.companyName) set.add(m.companyName);
    namesByCo.set(m.cocode, set);
  }
  for (const e of legal) {
    const id = legalKeys.get(e.provisionalKey);
    if (!id) continue;
    const names = namesByCo.get(e.cocode) ?? new Set();
    for (const alias of names) {
      if (alias.toUpperCase() === e.legalName.toUpperCase()) continue;
      aliasRows.push({
        entity_id: id,
        alias,
        alias_kind: 'legal_name',
        source_dataset: SOURCE_DATASET,
        source_observed_at: SOURCE_OBSERVED_AT,
      });
    }
  }
  report.writes.aliasesInserted = await insertAliases(sb, aliasRows);

  const rels: Array<Record<string, unknown>> = [];
  for (const m of listing.memberships) {
    const fromId = legalKeys.get(legalInsurerProvisionalKey(m.cocode));
    const toId = groupKeys.get(insuranceGroupProvisionalKey(m.groupCode));
    if (!fromId || !toId) {
      report.holds.push(`membership_unresolved ${m.groupCode}|${m.cocode}`);
      continue;
    }
    rels.push({
      from_entity_id: fromId,
      to_entity_id: toId,
      relationship_type: CARRIER_RELATIONSHIP_TYPE.MEMBER_OF_GROUP,
      status: m.statusCode || null,
      source_dataset: SOURCE_DATASET,
      source_record_id: `${m.groupCode}|${m.cocode}`,
      source_observed_at: SOURCE_OBSERVED_AT,
      raw: {
        product: NAIC_LOC_SOURCE.product,
        transform: TRANSFORM,
        runId,
        groupCode: m.groupCode,
        cocode: m.cocode,
        groupName: m.groupName,
        companyName: m.companyName,
        domicile: m.domicile,
        identityConfidence: 'CONFIRMED',
        notParentCompanyWording: true,
      },
    });
  }
  const rel = await insertRels(sb, rels);
  report.writes.membershipsInserted = rel.inserted;
  report.writes.membershipsSkipped = rel.skipped;

  const { fl: flAfter, tx: txAfter } = await pageCarrierKeys(sb);
  report.after = {
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    agency: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    person: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    identifiers: await count(sb, 'national_entity_identifiers'),
    naicCocode: await count(sb, 'national_entity_identifiers', [['scheme', 'naic_cocode']]),
    naicGroup: await count(sb, 'national_entity_identifiers', [['scheme', 'naic_group_code']]),
    memberOfGroup: await count(sb, 'national_relationships', [
      ['relationship_type', 'MEMBER_OF_GROUP'],
    ]),
    usesBrand: await count(sb, 'national_relationships', [['relationship_type', 'USES_BRAND']]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    appointedBy: await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
    fl: flAfter.length,
    tx: txAfter.length,
  };

  async function qaEntity(kind: string, key: string) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,entity_kind,provisional_key,legal_name,identity_confidence')
      .eq('entity_kind', kind)
      .eq('provisional_key', key)
      .maybeSingle();
    if (error) return { error: error.message };
    return data;
  }
  report.qa = {
    americanGeneralLife: await qaEntity('legal_insurer', legalInsurerProvisionalKey('60488')),
    allstateInsCo: await qaEntity('legal_insurer', legalInsurerProvisionalKey('19232')),
    allstateGroup: await qaEntity('insurance_group', insuranceGroupProvisionalKey('8')),
    cvsGroup: await qaEntity('insurance_group', insuranceGroupProvisionalKey('1')),
    liquidation: await qaEntity('legal_insurer', legalInsurerProvisionalKey('44725')),
    farmersMutInsAssnA: await qaEntity('legal_insurer', legalInsurerProvisionalKey('14115')),
    farmersMutInsAssnB: await qaEntity('legal_insurer', legalInsurerProvisionalKey('14681')),
    flAppointerUnchanged: flAfter.length === fl.length,
    txAppointerUnchanged: txAfter.length === tx.length,
    layersSeparate:
      legalInsurerProvisionalKey('19232') !== insuranceGroupProvisionalKey('8') &&
      consumerBrandProvisionalKey('allstate') !== legalInsurerProvisionalKey('19232'),
  };

  if (report.after.usesBrand !== 0) report.errors.push('USES_BRAND_NOT_ZERO');
  if (report.after.appointerResolvesTo !== 0) report.errors.push('APPOINTER_RESOLVES_TO_NOT_ZERO');
  if (report.after.providers !== APPROVED.providers) report.errors.push('providers_changed');
  if (report.after.agency !== agenciesBefore) report.errors.push('agencies_changed');
  if (report.after.person !== personsBefore) report.errors.push('persons_changed');
  if (report.after.carrier !== carriersBefore) report.errors.push('carriers_changed');
  if (report.after.fl !== fl.length) report.errors.push('fl_appointers_changed');
  if (report.after.tx !== tx.length) report.errors.push('tx_appointers_changed');
  if (report.after.legalInsurer !== APPROVED.legalInsurers) {
    report.errors.push(`legal_insurer_total ${report.after.legalInsurer}`);
  }
  if (report.after.insuranceGroup !== APPROVED.groups) {
    report.errors.push(`group_total ${report.after.insuranceGroup}`);
  }
  if (report.after.memberOfGroup !== expectedMemberships) {
    report.errors.push(`membership_total ${report.after.memberOfGroup} expected ${expectedMemberships}`);
  }

  writeFileSync(
    join(ROOT, 'data/reports/ins-nat-final-002b-execution.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exit(1);
}

const isDirect = /ingest-carrier-identity/.test(process.argv[1] || '');
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
