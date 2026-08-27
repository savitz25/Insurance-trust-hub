/**
 * INS-NAT-013 — Florida DFS individual carrier appointments.
 *
 *   npx tsx scripts/national/backfill-fl-individual-appointments.ts
 *   npx tsx scripts/national/backfill-fl-individual-appointments.ts --execute
 *
 * Default dry-run. PERSON → APPOINTED_TO → CARRIER.
 * Person/credential/LOA/CMS/provider writes predicted 0.
 * Exact NPN (fallback: unique FL person license). Exact DFS appointing entity number.
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { createHash } from 'crypto';
import { resolve, join } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import {
  carrierProvisionalKey,
  decideCarrierIdentity,
  normalizeAppointingEntityNumber,
} from '../../lib/national/carrier-identity';
import { classifyAppointmentTypeGroup } from '../../lib/dfs/appointments';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../../lib/national/publication';
import { personPublicationBlocked } from '../../lib/national/person-identity';
import {
  FL_INDIVIDUAL_APPOINTMENT_SOURCE,
  PERSON_CARRIER_APPOINTMENT_TYPE,
  appointmentImpliesEmployment,
  appointmentImpliesLoa,
  appointmentImpliesMarketplace,
  appointmentJoinUsesName,
  appointmentSourceRecordId,
  decidePersonAppointmentJoin,
  individualAppointmentCurrency,
} from '../../lib/national/fl-individual-appointments';

const OUTDIR =
  process.env.INS_NAT_013_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-013-manifest';
const DATADIR =
  process.env.INS_NAT_013_DATA ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-013';
const execute = process.argv.includes('--execute');

const PROVIDER_BASELINE = 170_499;
const AGENCY_BASELINE = 81_943;
const PERSON_BASELINE = 1_029_860;
const CMS_ROW_BASELINE = 1_300_108;
const ASSOCIATED_WITH_BASELINE = 52_827;
const AGENCY_APPOINT_BASELINE = 989;
/** DFS bulk Last-Modified from All Active Appointments Individual (A-C) headers. */
const SOURCE_OBSERVED_AT = '2026-08-27T06:27:45.000Z';

void appointmentImpliesEmployment;
void appointmentImpliesLoa;
void appointmentImpliesMarketplace;
void appointmentJoinUsesName;

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
  const excel = s.match(/^=\s*"([^"]*)"\s*$/);
  if (excel) return excel[1]!.trim();
  const excel2 = s.match(/^=\s*(.+)\s*$/);
  if (excel2 && !s.includes(' ')) return excel2[1]!.replace(/^"|"$/g, '').trim();
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
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`${table} count: ${last}`);
}

async function fetchAll<T extends { id?: string }>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eqs?: Array<[string, string]>
): Promise<T[]> {
  const total = await count(sb, table, eqs);
  const rows: T[] = [];
  const page = 1000;
  const cols = /\bid\b/.test(select) ? select : `${select},id`;
  let lastId: string | null = null;
  for (;;) {
    let q = sb.from(table).select(cols).order('id', { ascending: true }).limit(page);
    if (lastId) q = q.gt('id', lastId);
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    if (!batch.length) break;
    rows.push(...batch);
    const end = batch[batch.length - 1];
    lastId = end && end.id ? String(end.id) : null;
    if (!lastId) break;
    if (rows.length === batch.length || rows.length % 100_000 === 0) {
      console.log(`  ${table} ${rows.length}/${total}`);
    }
    if (batch.length < page) break;
  }
  if (total && rows.length !== total) {
    throw new Error(`${table} fetch incomplete: got ${rows.length} expected ${total}`);
  }
  return rows;
}

type ApptRow = {
  npnRaw: string;
  npn: string | null;
  license: string;
  ent: string | null;
  entName: string;
  tycl: string;
  tyclDesc: string;
  status: string;
  issue: string | null;
  exp: string | null;
  email: boolean;
  phone: boolean;
  addr: boolean;
};

async function* iterateAppointmentRows(files: string[]): AsyncGenerator<ApptRow> {
  for (const file of files) {
    console.log(`  file ${file}`);
    const rl = createInterface({
      input: createReadStream(file, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    let headers: string[] | null = null;
    let iLic = -1;
    let iNpn = -1;
    let iEnt = -1;
    let iEntName = -1;
    let iTycl = -1;
    let iTyclDesc = -1;
    let iStatus = -1;
    let iIssue = -1;
    let iExp = -1;
    let iEmail = -1;
    let iPhone = -1;
    let iAddr = -1;
    for await (const line of rl) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line.replace(/^\uFEFF/, ''));
      if (!headers) {
        if (!cols.join(' ').toLowerCase().includes('license number')) continue;
        headers = cols;
        iLic = headerIndex(headers, 'License Number');
        iNpn = headerIndex(headers, 'NPN Number', 'NPN');
        iEnt = headerIndex(headers, 'Appointing Entity Number');
        iEntName = headerIndex(headers, 'Appointing Entity Name');
        iTycl = headerIndex(headers, 'Appointment TYCL', 'Appointment Type Code');
        iTyclDesc = headerIndex(headers, 'Appointment TYCL Desc', 'Appointment Type');
        iStatus = headerIndex(headers, 'Appointment Status', 'Status');
        iIssue = headerIndex(headers, 'Appointment Issue Date', 'Effective Date', 'Issue Date');
        iExp = headerIndex(headers, 'Appointment Expiration Date', 'Expiration Date');
        iEmail = headerIndex(headers, 'Email Address', 'Email');
        iPhone = headerIndex(headers, 'Business Phone', 'Phone');
        iAddr = headerIndex(headers, 'Business Address1', 'Business Address');
        continue;
      }
      yield {
        npnRaw: cleanCell(cols[iNpn]),
        npn: normalizeNpn(cleanCell(cols[iNpn])),
        license: cleanCell(cols[iLic]),
        ent: normalizeAppointingEntityNumber(cleanCell(cols[iEnt])),
        entName: cleanCell(cols[iEntName]).replace(/\s+/g, ' '),
        tycl: cleanCell(cols[iTycl]),
        tyclDesc: cleanCell(cols[iTyclDesc]),
        status: cleanCell(cols[iStatus]) || 'ACTIVE',
        issue: parseDate(cleanCell(cols[iIssue])),
        exp: parseDate(cleanCell(cols[iExp])),
        email: Boolean(cleanCell(cols[iEmail])),
        phone: Boolean(cleanCell(cols[iPhone])),
        addr: Boolean(cleanCell(cols[iAddr])),
      };
    }
  }
}

function appointmentFiles(): string[] {
  if (!existsSync(DATADIR)) {
    throw new Error(`missing data dir ${DATADIR}`);
  }
  const names = readdirSync(DATADIR).filter(
    (n) =>
      n.toLowerCase().startsWith('allactiveappointmentsindividual') &&
      n.toLowerCase().endsWith('.csv')
  );
  if (!names.length) throw new Error(`no individual appointment CSVs in ${DATADIR}`);
  return names.map((n) => join(DATADIR, n)).sort();
}

type Rel = {
  personNpn: string;
  carrierNumber: string;
  apptType: string;
  status: string;
  effective: string | null;
  expiration: string | null;
  sourceRecordId: string;
  joinPath: 'exact_npn' | 'exact_fl_license';
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

  const baseline = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    loaObservations: await count(sb, 'loa_observations'),
    relationships: await count(sb, 'national_relationships'),
    associatedWith: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
    appointedBy: await count(sb, 'national_relationships', [
      ['relationship_type', 'appointed_by'],
    ]),
    appointedTo: await count(sb, 'national_relationships', [
      ['relationship_type', PERSON_CARRIER_APPOINTMENT_TYPE],
    ]),
    contacts: await count(sb, 'contact_observations'),
    cms: cmsTotal,
    providers,
  };
  if (baseline.agencies !== AGENCY_BASELINE || baseline.persons !== PERSON_BASELINE) {
    console.error(JSON.stringify({ halt: 'graph_baseline_unexpected', ...baseline }));
    process.exit(1);
  }
  if (baseline.associatedWith !== ASSOCIATED_WITH_BASELINE) {
    console.error(JSON.stringify({ halt: 'associated_with_unexpected', ...baseline }));
    process.exit(1);
  }
  if (baseline.appointedBy !== AGENCY_APPOINT_BASELINE) {
    console.error(JSON.stringify({ halt: 'agency_appointments_unexpected', ...baseline }));
    process.exit(1);
  }

  console.log('Loading persons, agencies, carriers, FL person licenses…');
  const personRows = await fetchAll<{ id: string; npn: string | null }>(
    sb,
    'national_entities',
    'id,npn',
    [['entity_kind', 'person']]
  );
  const personByNpn = new Map<string, string>();
  const personNpns = new Set<string>();
  for (const r of personRows) {
    const n = normalizeNpn(r.npn);
    if (n) {
      personByNpn.set(n, r.id);
      personNpns.add(n);
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

  const carrierRows = await fetchAll<{ id: string; provisional_key: string | null; legal_name: string }>(
    sb,
    'national_entities',
    'id,provisional_key,legal_name',
    [['entity_kind', 'carrier']]
  );
  const carrierIdByKey = new Map<string, string>();
  const existingCarrierNumbers = new Set<string>();
  for (const r of carrierRows) {
    if (r.provisional_key) {
      carrierIdByKey.set(r.provisional_key, r.id);
      const m = String(r.provisional_key).match(/^carrier:fl-dfs:(.+)$/);
      if (m) existingCarrierNumbers.add(m[1]!);
    }
  }

  const flCreds = await fetchAll<{
    license_number: string;
    entity_id: string | null;
  }>(sb, 'license_credentials', 'license_number,entity_id', [
    ['entity_kind', 'person'],
    ['jurisdiction', 'FL'],
  ]);
  const licenseToEntity = new Map<string, Set<string>>();
  for (const r of flCreds) {
    const lic = String(r.license_number || '')
      .replace(/\s+/g, '')
      .toUpperCase();
    if (!lic || !r.entity_id) continue;
    const set = licenseToEntity.get(lic) ?? new Set();
    set.add(r.entity_id);
    licenseToEntity.set(lic, set);
  }
  const entityToNpn = new Map<string, string>();
  for (const [npn, id] of personByNpn) entityToNpn.set(id, npn);
  const uniqueFlLicenseToNpn = new Map<string, string>();
  const ambiguousFlLicenses = new Set<string>();
  for (const [lic, ents] of licenseToEntity) {
    const npns = [...ents].map((id) => entityToNpn.get(id)).filter(Boolean) as string[];
    const uniq = [...new Set(npns)];
    if (uniq.length === 1) uniqueFlLicenseToNpn.set(lic, uniq[0]!);
    else if (uniq.length > 1) ambiguousFlLicenses.add(lic);
  }

  const files = appointmentFiles();
  console.log(`Pass 1 census — ${files.length} DFS individual appointment files…`);

  let rows = 0;
  let missingNpn = 0;
  let malformedNpn = 0;
  let missingCarrier = 0;
  let duplicateSourceRows = 0;
  const types: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const personSkip: Record<string, number> = {};
  const namesByNumber = new Map<string, string[]>();
  const nameSetByNumber = new Map<string, Set<string>>();
  const contacts = { email: 0, phone: 0, address: 0 };
  const rels = new Map<string, Rel>();
  let secondaryLicenseJoins = 0;

  for await (const row of iterateAppointmentRows(files)) {
    rows += 1;
    if (!row.npnRaw) missingNpn += 1;
    else if (!row.npn) malformedNpn += 1;
    bump(types, row.tyclDesc || row.tycl || '(blank)');
    bump(statusCounts, row.status);
    if (row.email) contacts.email += 1;
    if (row.phone) contacts.phone += 1;
    if (row.addr) contacts.address += 1;
    if (row.ent) {
      const seen = nameSetByNumber.get(row.ent) ?? new Set();
      if (row.entName) seen.add(row.entName);
      nameSetByNumber.set(row.ent, seen);
    } else {
      missingCarrier += 1;
    }
  }
  for (const [num, set] of nameSetByNumber) namesByNumber.set(num, [...set]);

  const carrierDecisions = {
    confirmed: 0,
    review: 0,
    unresolved: 0,
  };
  const confirmedCarriers = new Map<string, { number: string; legalName: string; key: string }>();
  for (const [num, names] of namesByNumber) {
    const d = decideCarrierIdentity({ appointingEntityNumber: num, names });
    if (d.confidence === 'REVIEW_REQUIRED') {
      carrierDecisions.review += 1;
      continue;
    }
    if (d.confidence !== 'CONFIRMED' || !d.number) {
      carrierDecisions.unresolved += 1;
      continue;
    }
    carrierDecisions.confirmed += 1;
    const key = carrierProvisionalKey(d.number);
    confirmedCarriers.set(key, { number: d.number, legalName: d.legalName, key });
  }

  console.log('Pass 2 — CONFIRMED person + carrier joins…');
  for await (const row of iterateAppointmentRows(files)) {
    const personJoin = decidePersonAppointmentJoin({
      npn: row.npn,
      licenseNumber: row.license,
      personByNpn: personNpns,
      agencyNpns,
      uniqueFlLicenseToNpn,
      ambiguousFlLicenses,
    });
    if (personJoin.action === 'skip') {
      bump(personSkip, personJoin.reason);
      continue;
    }
    if (personJoin.path === 'exact_fl_license') secondaryLicenseJoins += 1;
    if (!row.ent) continue;
    const carrier = confirmedCarriers.get(carrierProvisionalKey(row.ent));
    if (!carrier) {
      bump(personSkip, 'carrier_not_confirmed');
      continue;
    }
    const sourceRecordId = appointmentSourceRecordId({
      personNpn: personJoin.npn,
      appointingEntityNumber: carrier.number,
      appointmentType: row.tyclDesc || row.tycl,
      effectiveDate: row.issue,
    });
    if (rels.has(sourceRecordId)) {
      duplicateSourceRows += 1;
      continue;
    }
    rels.set(sourceRecordId, {
      personNpn: personJoin.npn,
      carrierNumber: carrier.number,
      apptType: row.tyclDesc || row.tycl,
      status: row.status,
      effective: row.issue,
      expiration: row.exp,
      sourceRecordId,
      joinPath: personJoin.path,
    });
  }

  const relList = [...rels.values()].sort((a, b) =>
    a.sourceRecordId.localeCompare(b.sourceRecordId)
  );
  const usedCarrierKeys = new Set(
    relList.map((r) => carrierProvisionalKey(r.carrierNumber))
  );
  const newCarrierKeys = [...usedCarrierKeys].filter((k) => !carrierIdByKey.has(k));
  const existingCarrierUsed = [...usedCarrierKeys].filter((k) => carrierIdByKey.has(k));

  const personsByCarrier = new Map<string, Set<string>>();
  const carriersByPerson = new Map<string, Set<string>>();
  for (const r of relList) {
    const p = personsByCarrier.get(r.carrierNumber) ?? new Set();
    p.add(r.personNpn);
    personsByCarrier.set(r.carrierNumber, p);
    const c = carriersByPerson.get(r.personNpn) ?? new Set();
    c.add(r.carrierNumber);
    carriersByPerson.set(r.personNpn, c);
  }
  const personDist = { 1: 0, 2: 0, '3-5': 0, '6-10': 0, '11-20': 0, '21+': 0 };
  for (const s of carriersByPerson.values()) {
    const n = s.size;
    if (n === 1) personDist[1] += 1;
    else if (n === 2) personDist[2] += 1;
    else if (n <= 5) personDist['3-5'] += 1;
    else if (n <= 10) personDist['6-10'] += 1;
    else if (n <= 20) personDist['11-20'] += 1;
    else personDist['21+'] += 1;
  }
  const carrierDist = { '1-100': 0, '101-1000': 0, '1001-10000': 0, '10001+': 0 };
  for (const s of personsByCarrier.values()) {
    const n = s.size;
    if (n <= 100) carrierDist['1-100'] += 1;
    else if (n <= 1000) carrierDist['101-1000'] += 1;
    else if (n <= 10000) carrierDist['1001-10000'] += 1;
    else carrierDist['10001+'] += 1;
  }

  const existingApptKeys = new Set<string>();
  if (baseline.appointedTo > 0) {
    const existing = await fetchAll<{ source_record_id: string | null }>(
      sb,
      'national_relationships',
      'source_record_id',
      [['relationship_type', PERSON_CARRIER_APPOINTMENT_TYPE]]
    );
    for (const r of existing) if (r.source_record_id) existingApptKeys.add(r.source_record_id);
  }
  const newRels = relList.filter((r) => !existingApptKeys.has(r.sourceRecordId));

  const relFp = shaLines(relList.map((r) => r.sourceRecordId));
  const carrierFp = shaLines([...usedCarrierKeys]);

  const currency = { CURRENT: 0, HISTORICAL: 0, UNKNOWN: 0 };
  for (const r of relList) {
    currency[
      individualAppointmentCurrency({
        status: r.status,
        expirationDate: r.expiration,
        sourceIsActiveFile: true,
      })
    ] += 1;
  }

  console.log('CMS/LOA diagnostics for appointed persons…');
  const appointedNpns = [...carriersByPerson.keys()];
  const cmsHasAny = new Set<string>();
  const cmsHas2026 = new Set<string>();
  const cmsLookupBatches = chunk(appointedNpns, 100);
  const wave = 6;
  for (let i = 0; i < cmsLookupBatches.length; i += wave) {
    const part = cmsLookupBatches.slice(i, i + wave);
    const got = await Promise.all(
      part.map(async (batch) => {
        const { data, error } = await sb
          .from('cms_marketplace_observations')
          .select('npn,plan_year,identity_attachment')
          .in('npn', batch)
          .eq('identity_attachment', 'ATTACHED');
        if (error) throw new Error(`cms diag: ${error.message}`);
        return data ?? [];
      })
    );
    for (const rowsCms of got) {
      for (const r of rowsCms) {
        const n = normalizeNpn(r.npn);
        if (!n) continue;
        cmsHasAny.add(n);
        if (String(r.plan_year) === '2026') cmsHas2026.add(n);
      }
    }
    if (i === 0 || i % 300 === 0) {
      console.log(`  cms diag ${Math.min(i + wave, cmsLookupBatches.length)}/${cmsLookupBatches.length}`);
    }
  }
  const appointedWithHealth = new Set<string>();
  const appointedWithLife = new Set<string>();
  const appointedEntityIds = new Set<string>();
  for (const npn of appointedNpns) {
    const id = personByNpn.get(npn);
    if (id) appointedEntityIds.add(id);
  }
  const loaRows = await fetchAll<{ entity_id: string | null; consumer_group: string | null }>(
    sb,
    'loa_observations',
    'entity_id,consumer_group',
    [['source_dataset', 'florida_dfs_individual']]
  );
  for (const r of loaRows) {
    if (!r.entity_id || !appointedEntityIds.has(r.entity_id)) continue;
    const g = String(r.consumer_group || '');
    const npn = entityToNpn.get(r.entity_id);
    if (!npn) continue;
    if (g.includes('HEALTH')) appointedWithHealth.add(npn);
    if (g.includes('LIFE')) appointedWithLife.add(npn);
  }
  const cmsCross = {
    appointmentPlusCms2026: [...appointedNpns].filter((n) => cmsHas2026.has(n)).length,
    appointmentPlusHistoricalCmsOnly: [...appointedNpns].filter(
      (n) => cmsHasAny.has(n) && !cmsHas2026.has(n)
    ).length,
    appointmentPlusNoCms: [...appointedNpns].filter((n) => !cmsHasAny.has(n)).length,
  };
  const loaCross = {
    appointmentPlusHealthLoa: [...appointedNpns].filter((n) => appointedWithHealth.has(n)).length,
    appointmentPlusLifeLoa: [...appointedNpns].filter((n) => appointedWithLife.has(n)).length,
    appointmentWithoutObservedHealthOrLifeLoa: [...appointedNpns].filter(
      (n) => !appointedWithHealth.has(n) && !appointedWithLife.has(n)
    ).length,
  };

  const summary = {
    task: 'INS-NAT-013',
    execute,
    publicationGate: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      personPublicationBlocked: personPublicationBlocked(),
    },
    source: {
      portal: FL_INDIVIDUAL_APPOINTMENT_SOURCE.portal,
      files: files.map((f) => f.replace(/\\/g, '/').split('/').pop()),
      rows,
      missingNpn,
      malformedNpn,
      missingCarrier,
      duplicateSourceRows,
      types: Object.entries(types)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40),
      statusCounts,
      contactsStoreableNotExecuted: contacts,
    },
    personJoin: {
      exactExistingPersonMatches: carriersByPerson.size,
      secondaryLicenseJoins,
      skip: personSkip,
      allowedPaths: ['exact_npn', 'exact_fl_license_when_npn_missing_and_unique'],
    },
    carrierJoin: {
      distinctAppointingIdsInSource: namesByNumber.size,
      confirmedCarriersInSource: confirmedCarriers.size,
      carriersUsedOnConfirmedPersonAppointments: usedCarrierKeys.size,
      existingSpineMatches: existingCarrierUsed.length,
      newDeterministicCandidates: newCarrierKeys.length,
      reviewRequiredNumbers: carrierDecisions.review,
      unresolvedNumbers: carrierDecisions.unresolved,
      scheme: 'carrier:fl-dfs:{Appointing Entity Number}',
      notNaic: true,
    },
    predicted: {
      newCarriers: newCarrierKeys.length,
      newAppointedTo: newRels.length,
      appointmentRelationships: relList.length,
      distinctPersonCarrierPairs: [...relList].reduce((s, r) => {
        s.add(`${r.personNpn}|${r.carrierNumber}`);
        return s;
      }, new Set<string>()).size,
      personWritesPredicted: 0,
      credentialWritesPredicted: 0,
      loaWritesPredicted: 0,
      cmsWritesPredicted: 0,
      providerWritesPredicted: 0,
      associatedWithWritesPredicted: 0,
    },
    currency,
    personDist,
    carrierDist,
    fingerprints: { relationships: relFp, carriers: carrierFp },
    cmsCross,
    loaCross,
    freshness: {
      sourceObservedAt: SOURCE_OBSERVED_AT,
      note: 'Last-Modified from DFS bulk file; not appointment-verified-today',
    },
    baseline,
  };

  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'new-carriers.json'),
    JSON.stringify(
      newCarrierKeys.map((k) => confirmedCarriers.get(k)),
      null,
      2
    )
  );
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write CONFIRMED APPOINTED_TO.');
    return;
  }

  let insertedCarriers = 0;
  let insertedRels = 0;
  const nowKeys = new Map(carrierIdByKey);
  for (const part of chunk(
    newCarrierKeys.map((k) => confirmedCarriers.get(k)!).filter(Boolean),
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
        scheme: 'fl_dfs_appointing_entity_number',
        appointingEntityNumber: c.number,
        notClaimedAsNaic: true,
        task: 'INS-NAT-013',
        publicCarrierPage: false,
      }),
    }));
    const { data, error } = await sb.from('national_entities').insert(payload).select('id,provisional_key');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('carrier insert fail', error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      if (row.provisional_key) nowKeys.set(String(row.provisional_key), String(row.id));
    }
    insertedCarriers += data?.length ?? 0;
  }
  console.log(`carriers inserted ${insertedCarriers}`);

  const relBatches = chunk(newRels, 200);
  for (let i = 0; i < relBatches.length; i += 1) {
    const part = relBatches[i]!;
    const payload = [];
    for (const r of part) {
      const personId = personByNpn.get(r.personNpn);
      const carrierId = nowKeys.get(carrierProvisionalKey(r.carrierNumber));
      if (!personId || !carrierId || personId === carrierId) continue;
      payload.push({
        from_entity_id: personId,
        to_entity_id: carrierId,
        relationship_type: PERSON_CARRIER_APPOINTMENT_TYPE,
        status: individualAppointmentCurrency({
          status: r.status,
          expirationDate: r.expiration,
          sourceIsActiveFile: true,
        }),
        effective_date: r.effective,
        termination_date: r.expiration,
        source_dataset: FL_INDIVIDUAL_APPOINTMENT_SOURCE.sourceDataset,
        source_record_id: r.sourceRecordId,
        source_observed_at: SOURCE_OBSERVED_AT,
        raw: {
          task: 'INS-NAT-013',
          jurisdiction: 'FL',
          regulator: FL_INDIVIDUAL_APPOINTMENT_SOURCE.regulator,
          sourceUrl: FL_INDIVIDUAL_APPOINTMENT_SOURCE.portal,
          appointmentType: r.apptType,
          appointmentTypeGroup: classifyAppointmentTypeGroup(r.apptType),
          appointmentStatus: r.status,
          appointingEntityNumber: r.carrierNumber,
          joinPath: r.joinPath,
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
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('appointment insert fail', error.message);
      process.exit(1);
    }
    insertedRels += data?.length ?? 0;
    if (i % 50 === 0) console.log(`appts ${insertedRels}/${newRels.length}`);
  }

  const after = {
    executed: true,
    insertedCarriers,
    insertedRels,
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    loa_observations: await count(sb, 'loa_observations'),
    relationships: await count(sb, 'national_relationships'),
    associatedWith: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
    appointedBy: await count(sb, 'national_relationships', [
      ['relationship_type', 'appointed_by'],
    ]),
    appointedTo: await count(sb, 'national_relationships', [
      ['relationship_type', PERSON_CARRIER_APPOINTMENT_TYPE],
    ]),
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
    after.cms !== CMS_ROW_BASELINE ||
    after.associatedWith !== ASSOCIATED_WITH_BASELINE ||
    after.appointedBy !== AGENCY_APPOINT_BASELINE
  ) {
    console.error('safety gate failed', after);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
