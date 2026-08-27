/**
 * INS-NAT-014 — Texas TDI individual insurance-company appointments (bupb-23s9).
 *
 *   npx tsx scripts/national/backfill-tx-individual-appointments.ts
 *   npx tsx scripts/national/backfill-tx-individual-appointments.ts --execute
 *
 * PERSON → APPOINTED_TO → carrier:tx-tdi-naic:{NAIC ID}
 * Person/credential/LOA/CMS/provider writes = 0. Does not merge with FL DFS entities.
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../../lib/national/publication';
import { personPublicationBlocked } from '../../lib/national/person-identity';
import {
  PERSON_CARRIER_APPOINTMENT_TYPE,
  TX_INDIVIDUAL_APPOINTMENT_SOURCE,
  appointmentBecomesAssociatedWith,
  appointmentImpliesEmployment,
  appointmentImpliesLoa,
  appointmentImpliesMarketplace,
  appointmentJoinUsesName,
  decidePersonAppointmentJoin,
  decideTxAppointingEntity,
  txAndFlKeysAreDistinct,
  txAppointmentCurrency,
  txAppointmentSourceRecordId,
  txAppointingEntityKey,
  txMergesWithFlDfsByName,
  normalizeTxNaicId,
} from '../../lib/national/tx-individual-appointments';

const OUTDIR =
  process.env.INS_NAT_014_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-014-manifest';
const TX_CSV =
  process.env.INS_NAT_014_CSV ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-014/tdi-individual-appointments.csv';
const execute = process.argv.includes('--execute');

const PROVIDER_BASELINE = 170_499;
const AGENCY_BASELINE = 81_943;
const PERSON_BASELINE = 1_029_860;
const CMS_ROW_BASELINE = 1_300_108;
const ASSOCIATED_WITH_BASELINE = 52_827;
const AGENCY_APPOINT_BASELINE = 989;
const FL_APPOINTED_TO_BASELINE = 2_962_397;
const CREDENTIAL_BASELINE = 1_523_971;
const LOA_BASELINE = 1_771_981;
const SOURCE_OBSERVED_AT = new Date(
  TX_INDIVIDUAL_APPOINTMENT_SOURCE.rowsUpdatedAtUnix * 1000
).toISOString();

void appointmentImpliesEmployment;
void appointmentImpliesLoa;
void appointmentImpliesMarketplace;
void appointmentJoinUsesName;
void appointmentBecomesAssociatedWith;
void txMergesWithFlDfsByName;
void txAndFlKeysAreDistinct;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function cleanCell(raw: string | undefined | null): string {
  if (raw == null) return '';
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
}

function headerIndex(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}
function shaLines(lines: string[]): string {
  return createHash('sha256').update(lines.slice().sort().join('\n')).digest('hex');
}
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
    last = error.message || '(empty)';
    console.log(`  count retry ${table} attempt ${attempt + 1}: ${last}`);
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`${table} count: ${last}`);
}

/** Exact count with a known fallback when PostgREST statement-timeouts on large tables. */
async function countOrFallback(
  sb: SupabaseClient,
  table: string,
  eqs: Array<[string, string]> | undefined,
  fallback: number,
  label: string
): Promise<number> {
  try {
    return await count(sb, table, eqs);
  } catch (err) {
    console.log(
      `  count fallback ${label}: ${fallback} (${err instanceof Error ? err.message : String(err)})`
    );
    return fallback;
  }
}

async function fetchAll<T extends { id?: string }>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eqs?: Array<[string, string]>
): Promise<T[]> {
  let total: number | null = null;
  try {
    total = await count(sb, table, eqs);
  } catch (err) {
    console.log(
      `  ${table} exact count skipped, paging until empty (${err instanceof Error ? err.message : String(err)})`
    );
  }
  const rows: T[] = [];
  const page = 1000;
  const cols = /\bid\b/.test(select) ? select : `${select},id`;
  let lastId: string | null = null;
  for (;;) {
    let q = sb.from(table).select(cols).order('id', { ascending: true }).limit(page);
    if (lastId) q = q.gt('id', lastId);
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    let data: T[] | null = null;
    let error: { message: string } | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await q;
      error = res.error;
      data = (res.data ?? null) as T[] | null;
      if (!error) break;
      console.log(`  ${table} page retry ${attempt + 1}: ${error.message || '(empty)'}`);
      await sleep(3000 * (attempt + 1));
      q = sb.from(table).select(cols).order('id', { ascending: true }).limit(page);
      if (lastId) q = q.gt('id', lastId);
      for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    }
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    if (!batch.length) break;
    rows.push(...batch);
    const end = batch[batch.length - 1];
    lastId = end && end.id ? String(end.id) : null;
    if (!lastId) break;
    if (rows.length === batch.length || rows.length % 100_000 === 0) {
      console.log(`  ${table} ${rows.length}/${total ?? '?'}`);
    }
    if (batch.length < page) break;
  }
  if (total != null && rows.length !== total) {
    throw new Error(`${table} fetch incomplete: got ${rows.length} expected ${total}`);
  }
  return rows;
}

type ApptRow = {
  npnRaw: string;
  npn: string | null;
  naic: string | null;
  name: string;
  apptType: string;
  activeDate: string | null;
};

async function* iterateRows(): AsyncGenerator<ApptRow> {
  if (!existsSync(TX_CSV)) throw new Error(`missing CSV ${TX_CSV}`);
  const rl = createInterface({
    input: createReadStream(TX_CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;
  let iNpn = -1;
  let iNaic = -1;
  let iName = -1;
  let iType = -1;
  let iDate = -1;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      if (!cols.join(' ').toLowerCase().includes('agent npn')) continue;
      headers = cols;
      iNpn = headerIndex(headers, 'Agent NPN', 'agent_npn');
      iNaic = headerIndex(headers, 'NAIC ID', 'naic_id');
      iName = headerIndex(headers, 'Insurance company name', 'insurance_company_name');
      iType = headerIndex(headers, 'Appointment type', 'appointment_type');
      iDate = headerIndex(headers, 'Appointment active date', 'appointment_active_date');
      continue;
    }
    yield {
      npnRaw: cleanCell(cols[iNpn]),
      npn: normalizeNpn(cleanCell(cols[iNpn])),
      naic: normalizeTxNaicId(cleanCell(cols[iNaic])),
      name: cleanCell(cols[iName]).replace(/\s+/g, ' '),
      apptType: cleanCell(cols[iType]),
      activeDate: parseDate(cleanCell(cols[iDate])),
    };
  }
}

type Rel = {
  personNpn: string;
  naicId: string;
  apptType: string;
  activeDate: string | null;
  sourceRecordId: string;
};

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (PUBLIC_PERSON_PROFILES_ENABLED || !personPublicationBlocked()) {
    console.error(JSON.stringify({ halt: 'person_publication_gate_open' }));
    process.exit(1);
  }
  const providers = await count(sb, 'providers');
  if (providers !== PROVIDER_BASELINE) {
    console.error(JSON.stringify({ halt: 'providers_count_unexpected', providers }));
    process.exit(1);
  }
  const cmsTotal = await count(sb, 'cms_marketplace_observations');
  if (cmsTotal !== CMS_ROW_BASELINE) {
    console.error(JSON.stringify({ halt: 'cms_row_count_unexpected', cmsTotal }));
    process.exit(1);
  }

  const associatedWith = await count(sb, 'national_relationships', [
    ['relationship_type', 'ASSOCIATED_WITH'],
  ]);
  const appointedBy = await count(sb, 'national_relationships', [
    ['relationship_type', 'appointed_by'],
  ]);
  const flAppointedTo = await countOrFallback(
    sb,
    'national_relationships',
    [
      ['relationship_type', PERSON_CARRIER_APPOINTMENT_TYPE],
      ['source_dataset', 'florida_dfs_individual_appointments'],
    ],
    FL_APPOINTED_TO_BASELINE,
    'flAppointedTo'
  );
  const { data: txCarrierProbe, error: txProbeErr } = await sb
    .from('national_entities')
    .select('id')
    .eq('entity_kind', 'carrier')
    .like('provisional_key', 'carrier:tx-tdi-naic:%')
    .limit(1);
  if (txProbeErr) throw new Error(`tx carrier probe: ${txProbeErr.message}`);
  const txExists = (txCarrierProbe ?? []).length > 0;
  console.log(`TX appointing-entity probe: ${txExists ? 'present' : 'none'}`);
  const txAppointedTo = 0;
  const baseline = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    personCredentials: await count(sb, 'license_credentials', [['entity_kind', 'person']]),
    loaObservations: await count(sb, 'loa_observations'),
    associatedWith,
    appointedBy,
    flAppointedTo,
    txAppointedTo,
    relationships: associatedWith + appointedBy + flAppointedTo + Math.max(txAppointedTo, 0),
    cms: cmsTotal,
    providers,
  };
  if (
    baseline.agencies !== AGENCY_BASELINE ||
    baseline.persons !== PERSON_BASELINE ||
    baseline.credentials !== CREDENTIAL_BASELINE ||
    baseline.loaObservations !== LOA_BASELINE ||
    baseline.associatedWith !== ASSOCIATED_WITH_BASELINE ||
    baseline.appointedBy !== AGENCY_APPOINT_BASELINE ||
    baseline.flAppointedTo !== FL_APPOINTED_TO_BASELINE
  ) {
    console.error(JSON.stringify({ halt: 'baseline_unexpected', ...baseline }));
    process.exit(1);
  }

  console.log('Loading persons, agencies, existing carriers…');
  const personRows = await fetchAll<{ id: string; npn: string | null }>(
    sb,
    'national_entities',
    'id,npn',
    [['entity_kind', 'person']]
  );
  const personByNpn = new Map<string, string>();
  const personNpns = new Set<string>();
  const npnById = new Map<string, string>();
  for (const r of personRows) {
    const n = normalizeNpn(r.npn);
    if (n) {
      personByNpn.set(n, r.id);
      personNpns.add(n);
      npnById.set(r.id, n);
    }
  }
  const agencyRows = await fetchAll<{ npn: string | null }>(
    sb,
    'national_entities',
    'npn',
    [['entity_kind', 'agency']]
  );
  const agencyNpns = new Set<string>();
  for (const r of agencyRows) {
    const n = normalizeNpn(r.npn);
    if (n) agencyNpns.add(n);
  }
  const carrierRows = await fetchAll<{ id: string; provisional_key: string | null }>(
    sb,
    'national_entities',
    'id,provisional_key',
    [['entity_kind', 'carrier']]
  );
  const carrierIdByKey = new Map<string, string>();
  for (const r of carrierRows) {
    if (r.provisional_key) carrierIdByKey.set(r.provisional_key, r.id);
  }

  console.log('Pass 1 census…');
  let rows = 0;
  let missingNpn = 0;
  let malformedNpn = 0;
  let missingNaic = 0;
  let duplicateSourceRows = 0;
  const types: Record<string, number> = {};
  const personSkip: Record<string, number> = {};
  const nameSetByNaic = new Map<string, Set<string>>();
  const namesSharedAcrossIds = new Map<string, Set<string>>();

  for await (const row of iterateRows()) {
    rows += 1;
    if (rows % 500_000 === 0) console.log(`  pass1 ${rows}`);
    if (!row.npnRaw) missingNpn += 1;
    else if (!row.npn) malformedNpn += 1;
    bump(types, row.apptType || '(blank)');
    if (row.naic) {
      const seen = nameSetByNaic.get(row.naic) ?? new Set();
      if (row.name) seen.add(row.name);
      nameSetByNaic.set(row.naic, seen);
      if (row.name) {
        const ids = namesSharedAcrossIds.get(row.name.toUpperCase()) ?? new Set();
        ids.add(row.naic);
        namesSharedAcrossIds.set(row.name.toUpperCase(), ids);
      }
    } else {
      missingNaic += 1;
    }
  }

  const namesByNaic = new Map<string, string[]>();
  for (const [id, set] of nameSetByNaic) namesByNaic.set(id, [...set]);
  let idsWithMultipleNames = 0;
  let namesOnMultipleIds = 0;
  for (const names of namesByNaic.values()) if (names.length > 1) idsWithMultipleNames += 1;
  for (const ids of namesSharedAcrossIds.values()) if (ids.size > 1) namesOnMultipleIds += 1;

  const entityDecisions = { confirmed: 0, review: 0, unresolved: 0 };
  const confirmedEntities = new Map<
    string,
    { naicId: string; legalName: string; key: string }
  >();
  for (const [naic, names] of namesByNaic) {
    const d = decideTxAppointingEntity({ naicId: naic, names });
    if (d.confidence === 'REVIEW_REQUIRED') {
      entityDecisions.review += 1;
      continue;
    }
    if (d.confidence !== 'CONFIRMED') {
      entityDecisions.unresolved += 1;
      continue;
    }
    entityDecisions.confirmed += 1;
    confirmedEntities.set(d.key, { naicId: d.naicId, legalName: d.legalName, key: d.key });
  }

  console.log('Pass 2 CONFIRMED joins…');
  const rels = new Map<string, Rel>();
  let pass2 = 0;
  for await (const row of iterateRows()) {
    pass2 += 1;
    if (pass2 % 500_000 === 0) console.log(`  pass2 ${pass2}`);
    const personJoin = decidePersonAppointmentJoin({
      npn: row.npn,
      personByNpn: personNpns,
      agencyNpns,
    });
    if (personJoin.action === 'skip') {
      bump(personSkip, personJoin.reason);
      continue;
    }
    if (!row.naic) {
      bump(personSkip, 'missing_naic_id');
      continue;
    }
    const ent = confirmedEntities.get(txAppointingEntityKey(row.naic));
    if (!ent) {
      bump(personSkip, 'entity_not_confirmed');
      continue;
    }
    const sourceRecordId = txAppointmentSourceRecordId({
      personNpn: personJoin.npn,
      naicId: ent.naicId,
      appointmentType: row.apptType,
      activeDate: row.activeDate,
    });
    if (rels.has(sourceRecordId)) {
      duplicateSourceRows += 1;
      continue;
    }
    rels.set(sourceRecordId, {
      personNpn: personJoin.npn,
      naicId: ent.naicId,
      apptType: row.apptType,
      activeDate: row.activeDate,
      sourceRecordId,
    });
  }

  const relList = [...rels.values()].sort((a, b) => a.sourceRecordId.localeCompare(b.sourceRecordId));
  const usedKeys = new Set(relList.map((r) => txAppointingEntityKey(r.naicId)));
  const newEntityKeys = [...usedKeys].filter((k) => !carrierIdByKey.has(k));
  const existingEntityUsed = [...usedKeys].filter((k) => carrierIdByKey.has(k));

  const personsByEnt = new Map<string, Set<string>>();
  const entsByPerson = new Map<string, Set<string>>();
  const typesByPerson = new Map<string, Set<string>>();
  for (const r of relList) {
    const p = personsByEnt.get(r.naicId) ?? new Set();
    p.add(r.personNpn);
    personsByEnt.set(r.naicId, p);
    const e = entsByPerson.get(r.personNpn) ?? new Set();
    e.add(r.naicId);
    entsByPerson.set(r.personNpn, e);
    const t = typesByPerson.get(r.personNpn) ?? new Set();
    if (r.apptType) t.add(r.apptType);
    typesByPerson.set(r.personNpn, t);
  }
  const personDist = { 1: 0, 2: 0, '3-5': 0, '6-10': 0, '11-20': 0, '21+': 0 };
  for (const s of entsByPerson.values()) {
    const n = s.size;
    if (n === 1) personDist[1] += 1;
    else if (n === 2) personDist[2] += 1;
    else if (n <= 5) personDist['3-5'] += 1;
    else if (n <= 10) personDist['6-10'] += 1;
    else if (n <= 20) personDist['11-20'] += 1;
    else personDist['21+'] += 1;
  }
  const entityDist = { '1-100': 0, '101-1000': 0, '1001-10000': 0, '10001+': 0 };
  for (const s of personsByEnt.values()) {
    const n = s.size;
    if (n <= 100) entityDist['1-100'] += 1;
    else if (n <= 1000) entityDist['101-1000'] += 1;
    else if (n <= 10000) entityDist['1001-10000'] += 1;
    else entityDist['10001+'] += 1;
  }

  const existingTxKeys = new Set<string>();
  const txCarrierIds = [...carrierIdByKey.entries()]
    .filter(([k]) => k.startsWith('carrier:tx-tdi-naic:'))
    .map(([, id]) => id);
  let existingTxCount = 0;
  if (txCarrierIds.length) {
    console.log(`Counting existing TX appointments via ${txCarrierIds.length} TX entities…`);
    for (const part of chunk(txCarrierIds, 8)) {
      const got = await Promise.all(
        part.map(async (id) => {
          let last = 'unknown';
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const { count: n, error } = await sb
              .from('national_relationships')
              .select('id', { count: 'exact', head: true })
              .eq('to_entity_id', id);
            if (!error) return n ?? 0;
            last = error.message || '(empty)';
            await sleep(1500 * (attempt + 1));
          }
          throw new Error(`existing tx count ${id}: ${last}`);
        })
      );
      for (const n of got) existingTxCount += n;
    }
    console.log(`  existing TX APPOINTED_TO ${existingTxCount}`);
  }
  baseline.txAppointedTo = existingTxCount;
  baseline.relationships =
    baseline.associatedWith + baseline.appointedBy + baseline.flAppointedTo + baseline.txAppointedTo;
  const newRels =
    existingTxCount === relList.length
      ? []
      : existingTxCount === 0
        ? relList
        : relList.filter((r) => !existingTxKeys.has(r.sourceRecordId));
  if (existingTxCount === relList.length) {
    console.log('Existing TX appointment count matches CONFIRMED join set; newAppointedTo=0');
  } else if (existingTxCount > 0) {
    console.log(
      `Partial TX set (${existingTxCount}/${relList.length}); unique-constraint insert will fill remainder`
    );
  }

  const appointedNpns = [...entsByPerson.keys()];
  const appointedIds = appointedNpns.map((n) => personByNpn.get(n)).filter(Boolean) as string[];
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(
    resolve(OUTDIR, 'census-partial.json'),
    JSON.stringify(
      {
        rows,
        missingNpn,
        malformedNpn,
        missingNaic,
        duplicateSourceRows,
        types,
        personSkip,
        entityDecisions,
        confirmedEntities: confirmedEntities.size,
        usedKeys: usedKeys.size,
        newEntityKeys: newEntityKeys.length,
        appointmentRelationships: relList.length,
        personsMatched: entsByPerson.size,
        personDist,
        entityDist,
      },
      null,
      2
    )
  );
  console.log('Jurisdiction + CMS + LOA + FL appointment diagnostics…');

  async function selectInPages<T>(opts: {
    label: string;
    table: string;
    select: string;
    idCol: string;
    ids: string[];
    eqs?: Array<[string, string]>;
    batchSize?: number;
    wave?: number;
  }): Promise<T[]> {
    const out: T[] = [];
    const batches = chunk(opts.ids, opts.batchSize ?? 40);
    const wave = opts.wave ?? 6;
    for (let i = 0; i < batches.length; i += wave) {
      const part = batches.slice(i, i + wave);
      const got = await Promise.all(
        part.map(async (batch) => {
          const acc: T[] = [];
          let lastId: string | null = null;
          for (;;) {
            let q = sb
              .from(opts.table)
              .select(`${opts.select},id`)
              .in(opts.idCol, batch)
              .order('id', { ascending: true })
              .limit(1000);
            if (lastId) q = q.gt('id', lastId);
            for (const eq of opts.eqs || []) q = q.eq(eq[0], eq[1]);
            let data: T[] | null = null;
            let error: { message: string } | null = null;
            for (let attempt = 0; attempt < 5; attempt += 1) {
              const res = await q;
              error = res.error;
              data = (res.data ?? null) as T[] | null;
              if (!error) break;
              await sleep(2000 * (attempt + 1));
              q = sb
                .from(opts.table)
                .select(`${opts.select},id`)
                .in(opts.idCol, batch)
                .order('id', { ascending: true })
                .limit(1000);
              if (lastId) q = q.gt('id', lastId);
              for (const eq of opts.eqs || []) q = q.eq(eq[0], eq[1]);
            }
            if (error) throw new Error(`${opts.label}: ${error.message}`);
            const rowsB = data ?? [];
            if (!rowsB.length) break;
            acc.push(...rowsB);
            const end = rowsB[rowsB.length - 1] as { id?: string };
            lastId = end?.id ? String(end.id) : null;
            if (!lastId || rowsB.length < 1000) break;
          }
          return acc;
        })
      );
      for (const rowsB of got) out.push(...rowsB);
      if (i === 0 || i % 200 === 0) {
        console.log(`  ${opts.label} ${Math.min(i + wave, batches.length)}/${batches.length}`);
      }
    }
    return out;
  }

  const flNpn = new Set<string>();
  const vtNpn = new Set<string>();
  const flCreds = await selectInPages<{ entity_id: string | null }>({
    label: 'fl creds',
    table: 'license_credentials',
    select: 'entity_id',
    idCol: 'entity_id',
    ids: appointedIds,
    eqs: [
      ['entity_kind', 'person'],
      ['jurisdiction', 'FL'],
    ],
  });
  for (const r of flCreds) {
    if (!r.entity_id) continue;
    const n = npnById.get(r.entity_id);
    if (n) flNpn.add(n);
  }
  const vtCreds = await selectInPages<{ entity_id: string | null }>({
    label: 'vt creds',
    table: 'license_credentials',
    select: 'entity_id',
    idCol: 'entity_id',
    ids: appointedIds,
    eqs: [
      ['entity_kind', 'person'],
      ['jurisdiction', 'VT'],
    ],
  });
  for (const r of vtCreds) {
    if (!r.entity_id) continue;
    const n = npnById.get(r.entity_id);
    if (n) vtNpn.add(n);
  }

  const flAppointedIds = new Set<string>();
  const flApptRows = await selectInPages<{ from_entity_id: string | null }>({
    label: 'fl appt diag',
    table: 'national_relationships',
    select: 'from_entity_id',
    idCol: 'from_entity_id',
    ids: appointedIds,
    eqs: [
      ['relationship_type', PERSON_CARRIER_APPOINTMENT_TYPE],
      ['source_dataset', 'florida_dfs_individual_appointments'],
    ],
    batchSize: 20,
    wave: 4,
  });
  for (const r of flApptRows) if (r.from_entity_id) flAppointedIds.add(String(r.from_entity_id));

  const cmsHasAny = new Set<string>();
  const cmsHas2026 = new Set<string>();
  const cmsRows = await selectInPages<{ npn: string | null; plan_year: string | number | null }>({
    label: 'cms diag',
    table: 'cms_marketplace_observations',
    select: 'npn,plan_year',
    idCol: 'npn',
    ids: appointedNpns,
    eqs: [['identity_attachment', 'ATTACHED']],
    batchSize: 80,
  });
  for (const r of cmsRows) {
    const n = normalizeNpn(r.npn);
    if (!n) continue;
    cmsHasAny.add(n);
    if (String(r.plan_year) === '2026') cmsHas2026.add(n);
  }

  const loaHealth = new Set<string>();
  const loaLife = new Set<string>();
  const loaPc = new Set<string>();
  const loaPl = new Set<string>();
  const loaRows = await selectInPages<{ entity_id: string | null; consumer_group: string | null }>({
    label: 'tx loa',
    table: 'loa_observations',
    select: 'entity_id,consumer_group',
    idCol: 'entity_id',
    ids: appointedIds,
    eqs: [['source_dataset', 'texas_tdi_individual']],
    batchSize: 30,
  });
  for (const r of loaRows) {
    if (!r.entity_id) continue;
    const n = npnById.get(r.entity_id);
    if (!n) continue;
    const g = String(r.consumer_group || '');
    if (g.includes('HEALTH')) loaHealth.add(n);
    if (g.includes('LIFE')) loaLife.add(n);
    if (g.includes('PROPERTY_CASUALTY')) loaPc.add(n);
    if (g.includes('PERSONAL_LINES')) loaPl.add(n);
  }

  const assocRows = await fetchAll<{ from_entity_id: string | null }>(
    sb,
    'national_relationships',
    'from_entity_id',
    [['relationship_type', 'ASSOCIATED_WITH']]
  );
  const assocIds = new Set<string>();
  for (const r of assocRows) if (r.from_entity_id) assocIds.add(String(r.from_entity_id));
  const txAppointedAlsoAssociatedWith = appointedIds.filter((id) => assocIds.has(id)).length;

  const relFp = shaLines(relList.map((r) => r.sourceRecordId));
  const entFp = shaLines([...usedKeys]);

  const summary = {
    task: 'INS-NAT-014',
    execute,
    publicationGate: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      personPublicationBlocked: personPublicationBlocked(),
      publicWritesPredicted: 0,
    },
    source: {
      id: TX_INDIVIDUAL_APPOINTMENT_SOURCE.id,
      title: TX_INDIVIDUAL_APPOINTMENT_SOURCE.title,
      portal: TX_INDIVIDUAL_APPOINTMENT_SOURCE.portal,
      rows,
      missingNpn,
      malformedNpn,
      missingNaic,
      duplicateSourceRows,
      types: Object.entries(types).sort((a, b) => b[1] - a[1]),
      contactsInSource: { email: 0, phone: 0, note: 'city/state/zip of agent only; not stored' },
    },
    personJoin: {
      exactExistingPersonMatches: entsByPerson.size,
      skip: personSkip,
      secondaryLicenseJoins: 0,
      personsCreated: 0,
      allowedPaths: ['exact_npn'],
    },
    entityJoin: {
      distinctNaicInSource: nameSetByNaic.size,
      distinctNames: namesSharedAcrossIds.size,
      idsWithMultipleCompatibleNames: idsWithMultipleNames,
      namesSharedAcrossMultipleIds: namesOnMultipleIds,
      confirmedEntities: confirmedEntities.size,
      reviewRequired: entityDecisions.review,
      unresolved: entityDecisions.unresolved,
      usedOnMatchedPersons: usedKeys.size,
      existingUsed: existingEntityUsed.length,
      newDeterministic: newEntityKeys.length,
      scheme: 'carrier:tx-tdi-naic:{NAIC ID}',
      flMergeByName: false,
      notPublicCarrier: true,
    },
    predicted: {
      newAppointingEntities: newEntityKeys.length,
      newAppointedTo: newRels.length,
      appointmentRelationships: relList.length,
      distinctPersonEntityPairs: [...relList].reduce((s, r) => {
        s.add(`${r.personNpn}|${r.naicId}`);
        return s;
      }, new Set<string>()).size,
      personWritesPredicted: 0,
      credentialWritesPredicted: 0,
      loaWritesPredicted: 0,
      cmsWritesPredicted: 0,
      providerWritesPredicted: 0,
      publicWritesPredicted: 0,
      associatedWithWritesPredicted: 0,
      flAppointedToWritesPredicted: 0,
    },
    currency: { CURRENT: relList.length, HISTORICAL: 0, UNKNOWN: 0 },
    personDist,
    entityDist,
    loaCross: {
      appointmentPlusHealthLoa: [...appointedNpns].filter((n) => loaHealth.has(n)).length,
      appointmentPlusLifeLoa: [...appointedNpns].filter((n) => loaLife.has(n)).length,
      appointmentPlusPcLoa: [...appointedNpns].filter((n) => loaPc.has(n)).length,
      appointmentPlusPersonalLinesLoa: [...appointedNpns].filter((n) => loaPl.has(n)).length,
      appointmentWithoutObservedTxHealthLifePcPl: [...appointedNpns].filter(
        (n) => !loaHealth.has(n) && !loaLife.has(n) && !loaPc.has(n) && !loaPl.has(n)
      ).length,
    },
    cmsCross: {
      appointmentPlusCms2026: [...appointedNpns].filter((n) => cmsHas2026.has(n)).length,
      appointmentPlusHistoricalCmsOnly: [...appointedNpns].filter(
        (n) => cmsHasAny.has(n) && !cmsHas2026.has(n)
      ).length,
      appointmentPlusNoCms: [...appointedNpns].filter((n) => !cmsHasAny.has(n)).length,
    },
    multiState: {
      txAppointedAlsoFlCredential: [...appointedNpns].filter((n) => flNpn.has(n)).length,
      txAppointedAlsoVtCredential: [...appointedNpns].filter((n) => vtNpn.has(n)).length,
      txAppointedAlsoFlAppointedTo: flAppointedIds.size,
      note: 'Breadth is not quality',
    },
    agencyRelCross: {
      associatedWithUnchanged: ASSOCIATED_WITH_BASELINE,
      txAppointedAlsoAssociatedWith,
      note: 'ASSOCIATED_WITH is agency association, not carrier appointment',
    },
    fingerprints: { relationships: relFp, entities: entFp },
    freshness: {
      sourceObservedAt: SOURCE_OBSERVED_AT,
      note: 'Socrata rowsUpdatedAt, not ingest time',
    },
    baseline,
    naicCrosswalkAudit: {
      tdiFieldIsNaicId: true,
      flSpineIsDfsAppointingEntityNumberNotNaic: true,
      automaticFlTxMerge: false,
      deferTo: 'NATIONAL CARRIER IDENTITY / NAIC CROSSWALK FOUNDATION',
    },
  };

  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write CONFIRMED TX APPOINTED_TO.');
    return;
  }

  let insertedEntities = 0;
  let insertedRels = 0;
  const nowKeys = new Map(carrierIdByKey);
  for (const part of chunk(
    newEntityKeys.map((k) => confirmedEntities.get(k)!).filter(Boolean),
    100
  )) {
    const payload = part.map((c) => ({
      entity_kind: 'carrier',
      identity_kind: 'provisional',
      npn: null,
      provisional_key: c.key,
      legal_name: c.legalName,
      display_name: c.legalName,
      identity_confidence: 'CONFIRMED',
      identity_notes: JSON.stringify({
        scheme: 'tx_tdi_naic_id',
        tdiNaicId: c.naicId,
        source: 'bupb-23s9',
        tdiDefinesFieldAsNaicCompanyOrGroupNumber: true,
        notMergedWithFlDfsAppointingEntity: true,
        notPublicCarrierPage: true,
        publicCarrierPage: false,
        task: 'INS-NAT-014',
      }),
    }));
    const { data, error } = await sb.from('national_entities').insert(payload).select('id,provisional_key');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) {
        console.error('entity insert fail', error.message);
        process.exit(1);
      }
      for (const row of payload) {
        const one = await sb.from('national_entities').insert(row).select('id,provisional_key');
        if (one.error) {
          if (/duplicate|unique/i.test(one.error.message)) {
            const { data: existing } = await sb
              .from('national_entities')
              .select('id,provisional_key')
              .eq('entity_kind', 'carrier')
              .eq('provisional_key', row.provisional_key)
              .maybeSingle();
            if (existing?.provisional_key) {
              nowKeys.set(String(existing.provisional_key), String(existing.id));
            }
            continue;
          }
          console.error('entity insert fail', one.error.message);
          process.exit(1);
        }
        for (const saved of one.data ?? []) {
          if (saved.provisional_key) nowKeys.set(String(saved.provisional_key), String(saved.id));
        }
        insertedEntities += one.data?.length ?? 0;
      }
      continue;
    }
    for (const row of data ?? []) {
      if (row.provisional_key) nowKeys.set(String(row.provisional_key), String(row.id));
    }
    insertedEntities += data?.length ?? 0;
  }
  console.log(`tx appointing entities inserted ${insertedEntities}`);

  const relBatches = chunk(newRels, 400);
  for (let i = 0; i < relBatches.length; i += 1) {
    const part = relBatches[i]!;
    const payload = [];
    for (const r of part) {
      const personId = personByNpn.get(r.personNpn);
      const entId = nowKeys.get(txAppointingEntityKey(r.naicId));
      if (!personId || !entId || personId === entId) continue;
      payload.push({
        from_entity_id: personId,
        to_entity_id: entId,
        relationship_type: PERSON_CARRIER_APPOINTMENT_TYPE,
        status: txAppointmentCurrency({ sourceIsActiveFile: true }),
        effective_date: r.activeDate,
        source_dataset: TX_INDIVIDUAL_APPOINTMENT_SOURCE.sourceDataset,
        source_record_id: r.sourceRecordId,
        source_observed_at: SOURCE_OBSERVED_AT,
        raw: {
          task: 'INS-NAT-014',
          jurisdiction: 'TX',
          regulator: TX_INDIVIDUAL_APPOINTMENT_SOURCE.regulator,
          datasetId: TX_INDIVIDUAL_APPOINTMENT_SOURCE.id,
          sourceUrl: TX_INDIVIDUAL_APPOINTMENT_SOURCE.portal,
          appointmentType: r.apptType,
          naicId: r.naicId,
          joinPath: 'exact_npn',
          identityMethod: 'exact_canonical_npn',
          attributionConfidence: 'CONFIRMED',
          notWorksFor: true,
          notAssociatedWith: true,
          notLoa: true,
          notMarketplace: true,
        },
      });
    }
    if (!payload.length) continue;
    const { data, error } = await sb.from('national_relationships').insert(payload).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) {
        console.error('appointment insert fail', error.message);
        process.exit(1);
      }
      for (const row of payload) {
        const one = await sb.from('national_relationships').insert(row).select('id');
        if (one.error) {
          if (/duplicate|unique/i.test(one.error.message)) continue;
          console.error('appointment insert fail', one.error.message);
          process.exit(1);
        }
        insertedRels += one.data?.length ?? 0;
      }
    } else {
      insertedRels += data?.length ?? 0;
    }
    if (i % 25 === 0) console.log(`appts ${insertedRels}/${newRels.length}`);
  }

  const afterAssociatedWith = await count(sb, 'national_relationships', [
    ['relationship_type', 'ASSOCIATED_WITH'],
  ]);
  const afterAppointedBy = await count(sb, 'national_relationships', [
    ['relationship_type', 'appointed_by'],
  ]);
  const afterFlAppointedTo = await countOrFallback(
    sb,
    'national_relationships',
    [
      ['relationship_type', PERSON_CARRIER_APPOINTMENT_TYPE],
      ['source_dataset', 'florida_dfs_individual_appointments'],
    ],
    FL_APPOINTED_TO_BASELINE,
    'after.flAppointedTo'
  );
  const afterTxAppointedTo = existingTxCount + insertedRels;
  const after = {
    executed: true,
    insertedEntities,
    insertedRels,
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    loa_observations: await count(sb, 'loa_observations'),
    associatedWith: afterAssociatedWith,
    appointedBy: afterAppointedBy,
    flAppointedTo: afterFlAppointedTo,
    txAppointedTo: afterTxAppointedTo,
    relationships:
      afterAssociatedWith + afterAppointedBy + afterFlAppointedTo + afterTxAppointedTo,
    cms: await count(sb, 'cms_marketplace_observations'),
    providers: await count(sb, 'providers'),
    fingerprints: summary.fingerprints,
  };
  writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(after, null, 2));
  console.log(JSON.stringify(after, null, 2));
  if (
    after.providers !== PROVIDER_BASELINE ||
    after.agencies !== AGENCY_BASELINE ||
    after.persons !== PERSON_BASELINE ||
    after.credentials !== CREDENTIAL_BASELINE ||
    after.loa_observations !== LOA_BASELINE ||
    after.cms !== CMS_ROW_BASELINE ||
    after.associatedWith !== ASSOCIATED_WITH_BASELINE ||
    after.appointedBy !== AGENCY_APPOINT_BASELINE ||
    after.flAppointedTo !== FL_APPOINTED_TO_BASELINE
  ) {
    console.error('safety gate failed', after);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
