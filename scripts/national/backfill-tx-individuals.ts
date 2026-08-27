/**
 * INS-NAT-012 — Texas individual producers + PERSON→AGENCY graph + CMS re-attach.
 *
 *   npx tsx scripts/national/backfill-tx-individuals.ts
 *   npx tsx scripts/national/backfill-tx-individuals.ts --execute
 *
 * Default dry-run. Never writes public.providers. Never converts agencies.
 * PUBLIC_PERSON_PROFILES_ENABLED remains false.
 * CMS: UPDATE attachment only; row count must stay 1,300,108.
 * Joins are exact NPN only (no name/phone/email identity).
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import { compareLegalNames } from '../../lib/national/names';
import {
  decidePersonIdentity,
  isTxIndividualCoreProducerLicense,
  isTxIndividualHighConfidenceProducerLicense,
  isTxIndividualExcludedLicense,
  personContactPublicEligible,
  personPublicationBlocked,
  worksForFromSharedContact,
} from '../../lib/national/person-identity';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../../lib/national/publication';
import {
  executeEligible,
  extractOfficialLoas,
  healthLoaImpliesMarketplace,
  type LoaStatusToken,
} from '../../lib/national/loa';
import { txStatusFromOfficialExpiration } from '../../lib/national/freshness';
import { cmsJoinExactNpn } from '../../lib/national/cms-marketplace';
import {
  TX_ASSOCIATION_SOURCE,
  TX_INDIVIDUAL_SOURCE,
  associationImpliesWorksFor,
  associationJoinUsesName,
  associationSourceRecordId,
  classifyPersonAgencyAssociation,
} from '../../lib/national/tx-association';

const OUTDIR =
  process.env.INS_NAT_012_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-012-manifest';
const TX_CSV =
  process.env.INS_NAT_012_TX_CSV ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-012/tdi-individuals.csv';
const ASSOC_CSV =
  process.env.INS_NAT_012_ASSOC_CSV ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-012/tdi-associations.csv';
const execute = process.argv.includes('--execute');

const INDIVIDUAL_OBSERVED_AT = new Date(
  TX_INDIVIDUAL_SOURCE.rowsUpdatedAtUnix * 1000
).toISOString();
const ASSOCIATION_OBSERVED_AT = new Date(
  TX_ASSOCIATION_SOURCE.rowsUpdatedAtUnix * 1000
).toISOString();
const CMS_ROW_BASELINE = 1_300_108;
const PROVIDER_BASELINE = 170_499;
const AGENCY_BASELINE = 81_943;

type PersonRec = {
  npn: string;
  legalName: string;
  displayName: string;
  identityConfidence: 'CONFIRMED';
  action: 'create' | 'attach';
};
type CredRec = {
  key: string;
  npn: string;
  licenseNumber: string;
  licenseClass: string | null;
  status: string;
  issueDate: string | null;
  expirationDate: string | null;
  sourceRecordId: string;
};
type LoaRec = {
  npn: string;
  credKey: string;
  officialText: string;
  consumerGroup: string | null;
  loaStatus: LoaStatusToken;
};
type RelRec = {
  personNpn: string;
  agencyNpn: string;
  sourceRecordId: string;
  associationType: string;
  status: string;
  currency: string;
  effectiveDate: string | null;
  reason: string;
};

void worksForFromSharedContact;
void associationImpliesWorksFor;
void associationJoinUsesName;
void healthLoaImpliesMarketplace;
void personContactPublicEligible;

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
  if (iso) return iso[1];
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
    if (rows.length === batch.length || rows.length % 50_000 === 0) {
      console.log(`  ${table} ${rows.length}/${total}`);
    }
    if (batch.length < page) break;
  }
  if (total && rows.length !== total) {
    throw new Error(`${table} fetch incomplete: got ${rows.length} expected ${total}`);
  }
  return rows;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<number>
): Promise<number> {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    let local = 0;
    for (;;) {
      const idx = i;
      i += 1;
      if (idx >= items.length) break;
      const cur = items[idx];
      if (cur === undefined) break;
      local += await fn(cur);
    }
    return local;
  });
  const parts = await Promise.all(workers);
  return parts.reduce((a, b) => a + b, 0);
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, n + i));
  return out;
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}

function shaLines(lines: string[]): string {
  return createHash('sha256').update(lines.slice().sort().join('\n')).digest('hex');
}

type LicenseAcc = {
  licenseNumber: string;
  npn: string | null;
  legalName: string;
  types: Set<string>;
  quals: Set<string>;
  issueDate: string | null;
  expirationDate: string | null;
  city: string;
  state: string;
  npnConflict: boolean;
};

async function loadIndividuals(): Promise<{
  byLicense: Map<string, LicenseAcc>;
  rows: number;
  missingNpn: number;
  malformedNpn: number;
  licenseTypes: Record<string, number>;
  qualifications: Record<string, number>;
  hqState: Record<string, number>;
  coreRows: number;
  excludedRows: number;
  highConfidenceRows: number;
}> {
  if (!existsSync(TX_CSV)) {
    throw new Error(`missing TX individuals CSV: ${TX_CSV}`);
  }
  const byLicense = new Map<string, LicenseAcc>();
  let rows = 0;
  let missingNpn = 0;
  let malformedNpn = 0;
  let coreRows = 0;
  let excludedRows = 0;
  let highConfidenceRows = 0;
  const licenseTypes: Record<string, number> = {};
  const qualifications: Record<string, number> = {};
  const hqState: Record<string, number> = {};
  const rl = createInterface({
    input: createReadStream(TX_CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;
  let iNpn = -1;
  let iLic = -1;
  let iName = -1;
  let iType = -1;
  let iQual = -1;
  let iIssue = -1;
  let iExp = -1;
  let iCity = -1;
  let iState = -1;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      headers = cols;
      iNpn = headerIndex(headers, 'npn');
      iLic = headerIndex(headers, 'license number', 'license_number');
      iName = headerIndex(headers, 'name');
      iType = headerIndex(headers, 'license type', 'license_type');
      iQual = headerIndex(headers, 'qualification');
      iIssue = headerIndex(headers, 'issue date', 'license_issue_date');
      iExp = headerIndex(headers, 'expiration date', 'expiration_date');
      iCity = headerIndex(headers, 'city');
      iState = headerIndex(headers, 'state');
      continue;
    }
    rows += 1;
    const npnRaw = cleanCell(cols[iNpn]);
    const npn = normalizeNpn(npnRaw);
    if (!npnRaw) missingNpn += 1;
    else if (!npn) malformedNpn += 1;
    const license = cleanCell(cols[iLic]);
    if (!license) continue;
    const name = cleanCell(cols[iName]);
    const type = cleanCell(cols[iType]);
    const qual = cleanCell(cols[iQual]);
    const issueDate = parseDate(cleanCell(cols[iIssue]));
    const expirationDate = parseDate(cleanCell(cols[iExp]));
    const city = cleanCell(cols[iCity]);
    const state = cleanCell(cols[iState]).toUpperCase().slice(0, 2);
    if (type) bump(licenseTypes, type);
    if (qual) bump(qualifications, qual);
    bump(hqState, state || '(blank)');
    if (isTxIndividualCoreProducerLicense(type)) coreRows += 1;
    else if (isTxIndividualHighConfidenceProducerLicense(type)) highConfidenceRows += 1;
    else if (isTxIndividualExcludedLicense(type)) excludedRows += 1;
    const existing = byLicense.get(license);
    if (!existing) {
      byLicense.set(license, {
        licenseNumber: license,
        npn,
        legalName: name,
        types: new Set(type ? [type] : []),
        quals: new Set(qual ? [qual] : []),
        issueDate,
        expirationDate,
        city,
        state,
        npnConflict: false,
      });
    } else {
      if (type) existing.types.add(type);
      if (qual) existing.quals.add(qual);
      if (existing.npn && npn && existing.npn !== npn) existing.npnConflict = true;
      if (!existing.npn && npn) existing.npn = npn;
      if (!existing.legalName && name) existing.legalName = name;
      if (issueDate && (!existing.issueDate || issueDate < existing.issueDate)) {
        existing.issueDate = issueDate;
      }
      if (expirationDate && (!existing.expirationDate || expirationDate > existing.expirationDate)) {
        existing.expirationDate = expirationDate;
      }
    }
  }
  return {
    byLicense,
    rows,
    missingNpn,
    malformedNpn,
    licenseTypes,
    qualifications,
    hqState,
    coreRows,
    excludedRows,
    highConfidenceRows,
  };
}

type AssocRow = {
  licenseeNpn: string | null;
  associatedNpn: string | null;
  associatedNaic: string;
  associationType: string;
  beginDate: string | null;
  licenseeName: string;
  associatedName: string;
};

async function loadAssociations(): Promise<{ rows: number; recs: AssocRow[]; types: Record<string, number> }> {
  if (!existsSync(ASSOC_CSV)) {
    throw new Error(`missing TX associations CSV: ${ASSOC_CSV}`);
  }
  const recs: AssocRow[] = [];
  const types: Record<string, number> = {};
  let rows = 0;
  const rl = createInterface({
    input: createReadStream(ASSOC_CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;
  let iLicNpn = -1;
  let iAssocNpn = -1;
  let iNaic = -1;
  let iType = -1;
  let iBegin = -1;
  let iLicName = -1;
  let iAssocName = -1;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      headers = cols;
      iLicNpn = headerIndex(headers, 'licensee npn', 'licensee_npn');
      iAssocNpn = headerIndex(headers, 'associated licensee npn', 'associated_licensee_npn');
      iNaic = headerIndex(headers, 'associated licensee naic id', 'associated_licensee_naic_id');
      iType = headerIndex(headers, 'association type', 'association_type');
      iBegin = headerIndex(headers, 'association begin date', 'association_begin_date');
      iLicName = headerIndex(headers, 'licensee name', 'licensee_name');
      iAssocName = headerIndex(headers, 'associated licensee name', 'associated_licensee_name');
      continue;
    }
    rows += 1;
    const associationType = cleanCell(cols[iType]);
    bump(types, associationType || '(blank)');
    recs.push({
      licenseeNpn: normalizeNpn(cleanCell(cols[iLicNpn])),
      associatedNpn: normalizeNpn(cleanCell(cols[iAssocNpn])),
      associatedNaic: cleanCell(cols[iNaic]),
      associationType,
      beginDate: parseDate(cleanCell(cols[iBegin])),
      licenseeName: cleanCell(cols[iLicName]),
      associatedName: cleanCell(cols[iAssocName]),
    });
  }
  return { rows, recs, types };
}

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
    credentials: await count(sb, 'license_credentials'),
    personCredentials: await count(sb, 'license_credentials', [['entity_kind', 'person']]),
    txPersonCredentials: await count(sb, 'license_credentials', [
      ['entity_kind', 'person'],
      ['jurisdiction', 'TX'],
    ]),
    loaObservations: await count(sb, 'loa_observations'),
    relationships: await count(sb, 'national_relationships'),
    contacts: await count(sb, 'contact_observations'),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    cms: cmsTotal,
    providers,
  };
  if (baseline.agencies !== AGENCY_BASELINE) {
    console.error(JSON.stringify({ halt: 'agency_count_unexpected', ...baseline }));
    process.exit(1);
  }

  console.log('Loading existing agencies and persons…');
  const agencyRows = await fetchAll<{ id: string; npn: string | null }>(
    sb,
    'national_entities',
    'id,npn',
    [['entity_kind', 'agency']]
  );
  const agencyNpns = new Set<string>();
  const agencyIdByNpn = new Map<string, string>();
  for (const r of agencyRows) {
    const n = normalizeNpn(r.npn);
    if (n) {
      agencyNpns.add(n);
      agencyIdByNpn.set(n, r.id);
    }
  }

  const personRows = await fetchAll<{ id: string; npn: string | null; legal_name: string }>(
    sb,
    'national_entities',
    'id,npn,legal_name',
    [['entity_kind', 'person']]
  );
  const existingPersonByNpn = new Map<string, { id: string; legalName: string }>();
  for (const r of personRows) {
    const n = normalizeNpn(r.npn);
    if (n) existingPersonByNpn.set(n, { id: r.id, legalName: r.legal_name });
  }

  console.log('Loading Texas individual CSV…');
  const tx = await loadIndividuals();
  console.log('Loading Texas associations CSV…');
  const assoc = await loadAssociations();

  const persons = new Map<string, PersonRec>();
  const creds = new Map<string, CredRec>();
  const loas = new Map<string, LoaRec>();
  const skipReasons: Record<string, number> = {};
  let reviewName = 0;
  let kindConflict = 0;
  let unresolved = 0;
  const coreLicenses = new Set<string>();
  const coreNpn = new Set<string>();
  const observedAtDate = new Date(INDIVIDUAL_OBSERVED_AT);

  for (const rec of tx.byLicense.values()) {
    const coreTypes = [...rec.types].filter(isTxIndividualCoreProducerLicense);
    if (!coreTypes.length) {
      if ([...rec.types].some(isTxIndividualHighConfidenceProducerLicense)) {
        bump(skipReasons, 'tx_high_confidence_not_executed');
      } else {
        bump(skipReasons, 'tx_not_core_producer');
      }
      continue;
    }
    if (rec.npnConflict) {
      bump(skipReasons, 'same_license_different_npn');
      continue;
    }
    const existing = rec.npn ? existingPersonByNpn.get(rec.npn) : undefined;
    const decision = decidePersonIdentity({
      npn: rec.npn,
      legalName: rec.legalName,
      existingPersonName: existing?.legalName ?? null,
      agencyOwnsNpn: rec.npn ? agencyNpns.has(rec.npn) : false,
    });
    if (decision.action === 'provisional') {
      unresolved += 1;
      bump(skipReasons, decision.reason);
      continue;
    }
    if (decision.action === 'kind_conflict') {
      kindConflict += 1;
      bump(skipReasons, decision.reason);
      continue;
    }
    if (decision.action === 'review_name') {
      reviewName += 1;
      bump(skipReasons, decision.reason);
      continue;
    }
    const npn = rec.npn!;
    const already = persons.get(npn);
    if (already) {
      const cmp = compareLegalNames(already.legalName, rec.legalName);
      if (cmp === 'conflict') {
        reviewName += 1;
        bump(skipReasons, 'same_npn_incompatible_names');
        continue;
      }
    } else {
      persons.set(npn, {
        npn,
        legalName: rec.legalName,
        displayName: rec.legalName,
        identityConfidence: 'CONFIRMED',
        action: decision.action,
      });
    }
    coreLicenses.add(rec.licenseNumber);
    coreNpn.add(npn);
    const credKey = `TX|person|producer|${rec.licenseNumber.toUpperCase()}`;
    const status = txStatusFromOfficialExpiration(rec.expirationDate, observedAtDate);
    creds.set(credKey, {
      key: credKey,
      npn,
      licenseNumber: rec.licenseNumber,
      licenseClass: coreTypes[0] ?? null,
      status,
      issueDate: rec.issueDate,
      expirationDate: rec.expirationDate,
      sourceRecordId: rec.licenseNumber,
    });
    const quals = [...rec.quals].filter((q) => q && q.toUpperCase() !== 'NONE');
    const extracted = extractOfficialLoas({
      jurisdiction: 'TX',
      sourceDataset: 'texas_tdi',
      entityKind: 'person',
      licenseTypes: coreTypes,
      qualifications: quals,
    });
    for (const obs of extracted.observations) {
      if (!executeEligible(obs)) continue;
      const k = `${credKey}|${obs.officialText.toUpperCase()}`;
      if (loas.has(k)) continue;
      loas.set(k, {
        npn,
        credKey,
        officialText: obs.officialText,
        consumerGroup: obs.consumerGroup,
        loaStatus: status === 'expired' ? 'expired' : 'UNKNOWN',
      });
    }
  }

  const personList = [...persons.values()].sort((a, b) => a.npn.localeCompare(b.npn));
  const createPersons = personList.filter((p) => p.action === 'create');
  const attachPersons = personList.filter((p) => p.action === 'attach');
  const credList = [...creds.values()].sort((a, b) => a.key.localeCompare(b.key));
  const loaList = [...loas.values()].sort((a, b) =>
    `${a.credKey}|${a.officialText}`.localeCompare(`${b.credKey}|${b.officialText}`)
  );

  const personNpns = new Set(personList.map((p) => p.npn));
  for (const n of existingPersonByNpn.keys()) personNpns.add(n);

  const rels = new Map<string, RelRec>();
  const relSkip: Record<string, number> = {};
  let relManyPersonsOneAgency = 0;
  let relOnePersonManyAgencies = 0;
  const personsByAgency = new Map<string, Set<string>>();
  const agenciesByPerson = new Map<string, Set<string>>();
  for (const row of assoc.recs) {
    const decision = classifyPersonAgencyAssociation({
      licenseeNpn: row.licenseeNpn,
      associatedLicenseeNpn: row.associatedNpn,
      associatedNaicId: row.associatedNaic,
      associationType: row.associationType,
      beginDate: row.beginDate,
      personNpns,
      agencyNpns,
    });
    if (decision.action === 'skip') {
      bump(relSkip, decision.reason);
      continue;
    }
    const sourceRecordId = associationSourceRecordId({
      licenseeNpn: row.licenseeNpn || '',
      associatedNpn: row.associatedNpn || '',
      associationType: row.associationType,
      beginDate: row.beginDate,
    });
    const key = `${decision.personNpn}|${decision.agencyNpn}|ASSOCIATED_WITH|${sourceRecordId}`;
    if (rels.has(key)) continue;
    if (decision.relationshipType === 'WORKS_FOR') {
      throw new Error('WORKS_FOR leaked');
    }
    rels.set(key, {
      personNpn: decision.personNpn,
      agencyNpn: decision.agencyNpn,
      sourceRecordId,
      associationType: row.associationType,
      status: decision.status,
      currency: decision.currency,
      effectiveDate: decision.effectiveDate,
      reason: decision.reason,
    });
    const pset = personsByAgency.get(decision.agencyNpn) ?? new Set();
    pset.add(decision.personNpn);
    personsByAgency.set(decision.agencyNpn, pset);
    const aset = agenciesByPerson.get(decision.personNpn) ?? new Set();
    aset.add(decision.agencyNpn);
    agenciesByPerson.set(decision.personNpn, aset);
  }
  for (const s of personsByAgency.values()) if (s.size > 1) relManyPersonsOneAgency += 1;
  for (const s of agenciesByPerson.values()) if (s.size > 1) relOnePersonManyAgencies += 1;
  const relList = [...rels.values()].sort((a, b) =>
    `${a.personNpn}|${a.agencyNpn}|${a.sourceRecordId}`.localeCompare(
      `${b.personNpn}|${b.agencyNpn}|${b.sourceRecordId}`
    )
  );

  console.log('Intersecting TX person NPNs with CMS evidence (indexed npn lookup)…');
  const unattachedCmsNpns = new Set<string>();
  const unattachedRowsByNpn = new Map<string, number>();
  const kindConflictCmsNpns = new Set<string>();
  let cmsUnattachedRowCount = 0;
  const cmsLookupBatches = chunk(
    personList.map((p) => p.npn),
    100
  );
  const wave = 6;
  for (let i = 0; i < cmsLookupBatches.length; i += wave) {
    const part = cmsLookupBatches.slice(i, i + wave);
    const got = await Promise.all(
      part.map(async (batch) => {
        const { data, error } = await sb
          .from('cms_marketplace_observations')
          .select('npn,identity_attachment')
          .in('npn', batch);
        if (error) throw new Error(`cms lookup: ${error.message}`);
        return data ?? [];
      })
    );
    for (const rows of got) {
      for (const r of rows) {
        const n = normalizeNpn(r.npn);
        if (!n) continue;
        if (r.identity_attachment === 'KIND_CONFLICT') kindConflictCmsNpns.add(n);
        if (r.identity_attachment !== 'UNATTACHED') continue;
        cmsUnattachedRowCount += 1;
        unattachedCmsNpns.add(n);
        unattachedRowsByNpn.set(n, (unattachedRowsByNpn.get(n) ?? 0) + 1);
      }
    }
    if (i === 0 || i % 300 === 0) {
      console.log(`  cms lookup batches ${Math.min(i + wave, cmsLookupBatches.length)}/${cmsLookupBatches.length}`);
    }
  }
  const cmsKindConflict = kindConflictCmsNpns.size;
  console.log(
    `  CMS intersect unattachedRows=${cmsUnattachedRowCount} unattachedNpn=${unattachedCmsNpns.size} kindConflictNpn=${cmsKindConflict}`
  );
  const cmsAttachNpns: string[] = [];
  let cmsAttachRows = 0;
  for (const p of personList) {
    const join = cmsJoinExactNpn({
      npn: p.npn,
      personId: existingPersonByNpn.get(p.npn)?.id || 'pending',
      agencyOwnsNpn: agencyNpns.has(p.npn),
    });
    if (join.attachment === 'KIND_CONFLICT') continue;
    if (join.attachment !== 'ATTACHED') continue;
    if (!unattachedCmsNpns.has(p.npn)) continue;
    cmsAttachNpns.push(p.npn);
    cmsAttachRows += unattachedRowsByNpn.get(p.npn) ?? 0;
  }
  cmsAttachNpns.sort();

  const existingTxCredKeys = new Set<string>();
  if (baseline.txPersonCredentials > 0) {
    const existingTxCreds = await fetchAll<{
      jurisdiction: string;
      license_namespace: string;
      license_number: string;
    }>(sb, 'license_credentials', 'jurisdiction,license_namespace,license_number', [
      ['entity_kind', 'person'],
      ['jurisdiction', 'TX'],
    ]);
    for (const r of existingTxCreds) {
      existingTxCredKeys.add(
        `${r.jurisdiction}|person|${r.license_namespace}|${String(r.license_number).toUpperCase()}`
      );
    }
  }
  const newCreds = credList.filter((c) => !existingTxCredKeys.has(c.key));
  const existingRelCount = await count(sb, 'national_relationships', [
    ['source_dataset', TX_ASSOCIATION_SOURCE.sourceDataset],
  ]);

  const loaByTerm: Record<string, number> = {};
  const loaByFamily: Record<string, number> = {};
  for (const l of loaList) {
    bump(loaByTerm, l.officialText);
    if (l.consumerGroup) {
      for (const f of l.consumerGroup.split(',')) bump(loaByFamily, f);
    }
  }

  const flOverlap = personList.filter((p) => existingPersonByNpn.has(p.npn)).length;
  const personFp = shaLines(personList.map((p) => p.npn));
  const credFp = shaLines(credList.map((c) => c.key));
  const loaFp = shaLines(loaList.map((l) => `${l.credKey}|${l.officialText.toUpperCase()}`));
  const relFp = shaLines(relList.map((r) => `${r.personNpn}|${r.agencyNpn}|${r.sourceRecordId}`));
  const cmsFp = shaLines(cmsAttachNpns);

  const summary = {
    task: 'INS-NAT-012',
    execute,
    publicationGate: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      personPublicationBlocked: personPublicationBlocked(),
      public_eligible: false,
    },
    freshness: {
      individualSourceObservedAt: INDIVIDUAL_OBSERVED_AT,
      associationSourceObservedAt: ASSOCIATION_OBSERVED_AT,
      note: 'source_observed_at is Socrata rowsUpdatedAt, not ingest time, not license-verified-today',
    },
    baseline,
    fingerprints: {
      persons: personFp,
      credentials: credFp,
      loas: loaFp,
      relationships: relFp,
      cmsAttachments: cmsFp,
    },
    texasSource: {
      csvRows: tx.rows,
      uniqueLicenses: tx.byLicense.size,
      missingNpnRows: tx.missingNpn,
      malformedNpnRows: tx.malformedNpn,
      coreRows: tx.coreRows,
      coreLicenses: coreLicenses.size,
      coreNpn: coreNpn.size,
      excludedRows: tx.excludedRows,
      highConfidenceRows: tx.highConfidenceRows,
      licenseTypes: Object.entries(tx.licenseTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30),
      qualifications: Object.entries(tx.qualifications)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30),
      hqStateTop: Object.entries(tx.hqState)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15),
    },
    associationSource: {
      csvRows: assoc.rows,
      types: Object.entries(assoc.types).sort((a, b) => b[1] - a[1]),
    },
    predicted: {
      newPersons: createPersons.length,
      attachExistingPersons: attachPersons.length,
      credentials: credList.length,
      newCredentials: newCreds.length,
      loas: loaList.length,
      relationships: relList.length,
      newRelationships: Math.max(0, relList.length - existingRelCount),
      cmsAttachNpns: cmsAttachNpns.length,
      cmsAttachRows,
      cmsRowsRemain: CMS_ROW_BASELINE,
      providerWritesPredicted: 0,
      entityAgencyWritesPredicted: 0,
      contactsPredicted: 0,
    },
    multiState: {
      txPersonsMatchingExistingNpn: flOverlap,
      note: 'Existing persons are FL/VT national identities; same NPN attaches TX credential',
    },
    reviewName,
    kindConflict,
    unresolved,
    skipReasons,
    relationshipSkip: relSkip,
    relationshipShape: {
      distinctPersonAgencyPairs: new Set(relList.map((r) => `${r.personNpn}|${r.agencyNpn}`)).size,
      agenciesWithManyPersons: relManyPersonsOneAgency,
      personsWithManyAgencies: relOnePersonManyAgencies,
      worksForCount: relList.filter((r) => r.associationType === 'WORKS_FOR').length,
      relationshipType: 'ASSOCIATED_WITH',
    },
    loasByTerm: Object.entries(loaByTerm)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
    loaByFamily,
    cms: {
      unattachedRows: cmsUnattachedRowCount,
      unattachedDistinctNpn: unattachedCmsNpns.size,
      kindConflictRows: cmsKindConflict,
      attachNpns: cmsAttachNpns.length,
      attachRows: cmsAttachRows,
      fuzzyJoin: false,
    },
  };

  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'loa-terms.json'),
    JSON.stringify(Object.entries(loaByTerm).sort((a, b) => b[1] - a[1]), null, 2)
  );
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write TX person graph.');
    return;
  }

  let insertedPersons = 0;
  let insertedCreds = 0;
  let insertedLoas = 0;
  let insertedRels = 0;
  let cmsUpdated = 0;
  const npnToId = new Map<string, string>();
  for (const [n, p] of existingPersonByNpn) npnToId.set(n, p.id);

  const personBatches = chunk(createPersons, 200);
  for (let i = 0; i < personBatches.length; i += 1) {
    const part = personBatches[i]!;
    const payload = part.map((p) => ({
      entity_kind: 'person',
      identity_kind: 'npn',
      npn: p.npn,
      legal_name: p.legalName,
      display_name: p.displayName,
      identity_confidence: 'CONFIRMED',
      identity_notes: JSON.stringify({
        task: 'INS-NAT-012',
        states: ['TX'],
        nameSource: 'texas_tdi',
        public: false,
      }),
    }));
    const { data, error } = await sb.from('national_entities').insert(payload).select('id,npn');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('person insert fail', error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      if (row.npn && row.id) npnToId.set(String(row.npn), String(row.id));
    }
    insertedPersons += data?.length ?? 0;
    if (i % 50 === 0) console.log(`persons ${insertedPersons}/${createPersons.length}`);
  }

  const credKeyToId = new Map<string, string>();
  const credBatches = chunk(
    newCreds.filter((c) => npnToId.has(c.npn)),
    200
  );
  for (let i = 0; i < credBatches.length; i += 1) {
    const part = credBatches[i]!;
    const payload = part.map((c) => ({
      entity_id: npnToId.get(c.npn)!,
      entity_kind: 'person',
      jurisdiction: 'TX',
      regulator: TX_INDIVIDUAL_SOURCE.regulator,
      license_number: c.licenseNumber,
      license_class: c.licenseClass,
      license_namespace: 'producer',
      regulatory_status: c.status,
      issue_date: c.issueDate,
      expiration_date: c.expirationDate,
      source_dataset: TX_INDIVIDUAL_SOURCE.sourceDataset,
      source_record_id: c.sourceRecordId,
      source_url: TX_INDIVIDUAL_SOURCE.url,
      source_observed_at: INDIVIDUAL_OBSERVED_AT,
      attribution_confidence: 'CONFIRMED',
      raw: { task: 'INS-NAT-012', status: c.status },
    }));
    const { data, error } = await sb
      .from('license_credentials')
      .insert(payload)
      .select('id,jurisdiction,license_namespace,license_number,source_dataset,source_record_id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('credential insert fail', error.message);
      process.exit(1);
    }
    const bySrc = new Map(part.map((c) => [`${c.sourceRecordId}`, c]));
    const links = (data ?? []).map((row) => {
      const src = bySrc.get(String(row.source_record_id));
      const key = `${row.jurisdiction}|person|${row.license_namespace}|${String(row.license_number).toUpperCase()}`;
      credKeyToId.set(key, String(row.id));
      return {
        source_dataset: row.source_dataset,
        source_table: 'tdi_individual_csv',
        source_record_id: row.source_record_id,
        credential_id: row.id,
        entity_id: src ? npnToId.get(src.npn) : null,
        identity_confidence: 'CONFIRMED',
      };
    });
    if (links.length) {
      const { error: linkErr } = await sb.from('source_record_links').insert(links);
      if (linkErr && !/duplicate|unique/i.test(linkErr.message)) {
        console.error('link insert fail', linkErr.message);
        process.exit(1);
      }
    }
    insertedCreds += data?.length ?? 0;
    if (i % 50 === 0) console.log(`creds ${insertedCreds} batch ${i}/${credBatches.length}`);
  }

  if (credKeyToId.size < credList.length) {
    const personCreds = await fetchAll<{
      id: string;
      jurisdiction: string;
      license_namespace: string;
      license_number: string;
    }>(sb, 'license_credentials', 'id,jurisdiction,license_namespace,license_number', [
      ['entity_kind', 'person'],
      ['jurisdiction', 'TX'],
    ]);
    for (const r of personCreds) {
      credKeyToId.set(
        `${r.jurisdiction}|person|${r.license_namespace}|${String(r.license_number).toUpperCase()}`,
        r.id
      );
    }
  }

  const loaPayloads = loaList
    .map((l) => {
      const credentialId = credKeyToId.get(l.credKey);
      const entityId = npnToId.get(l.npn);
      if (!credentialId || !entityId) return null;
      return {
        entity_id: entityId,
        credential_id: credentialId,
        official_text: l.officialText,
        loa_status: l.loaStatus,
        source_dataset: TX_INDIVIDUAL_SOURCE.sourceDataset,
        regulator: TX_INDIVIDUAL_SOURCE.regulator,
        source_observed_at: INDIVIDUAL_OBSERVED_AT,
        consumer_group: l.consumerGroup,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const loaBatches = chunk(loaPayloads, 200);
  for (let i = 0; i < loaBatches.length; i += 1) {
    const part = loaBatches[i]!;
    const { data, error } = await sb.from('loa_observations').insert(part).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('loa insert fail', error.message);
      process.exit(1);
    }
    insertedLoas += data?.length ?? 0;
    if (i % 50 === 0) console.log(`loas ${insertedLoas}/${loaPayloads.length}`);
  }

  const relPayloads = relList
    .map((r) => {
      const fromId = npnToId.get(r.personNpn);
      const toId = agencyIdByNpn.get(r.agencyNpn);
      if (!fromId || !toId || fromId === toId) return null;
      return {
        from_entity_id: fromId,
        to_entity_id: toId,
        relationship_type: 'ASSOCIATED_WITH',
        status: r.status,
        effective_date: r.effectiveDate,
        source_dataset: TX_ASSOCIATION_SOURCE.sourceDataset,
        source_record_id: r.sourceRecordId,
        source_observed_at: ASSOCIATION_OBSERVED_AT,
        raw: {
          task: 'INS-NAT-012',
          association_type: r.associationType,
          currency: r.currency,
          reason: r.reason,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const relBatches = chunk(relPayloads, 200);
  for (let i = 0; i < relBatches.length; i += 1) {
    const part = relBatches[i]!;
    const { data, error } = await sb.from('national_relationships').insert(part).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('relationship insert fail', error.message);
      process.exit(1);
    }
    insertedRels += data?.length ?? 0;
    if (i % 20 === 0) console.log(`rels ${insertedRels}/${relPayloads.length}`);
  }

  const cmsAttachEligible = cmsAttachNpns.filter((n) => npnToId.has(n));
  cmsUpdated = await mapPool(cmsAttachEligible, 8, async (npn) => {
    const entityId = npnToId.get(npn);
    if (!entityId) return 0;
    const { data, error } = await sb
      .from('cms_marketplace_observations')
      .update({
        entity_id: entityId,
        identity_attachment: 'ATTACHED',
        attribution_confidence: 'CONFIRMED',
      })
      .eq('npn', npn)
      .eq('identity_attachment', 'UNATTACHED')
      .select('id');
    if (error) throw new Error(`cms attach ${npn}: ${error.message}`);
    return data?.length ?? 0;
  });
  console.log(`cms attach rows ${cmsUpdated} npns ${cmsAttachEligible.length}`);

  const after = {
    executed: true,
    insertedPersons,
    insertedCreds,
    insertedLoas,
    insertedRels,
    cmsUpdated,
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    credentials: await count(sb, 'license_credentials'),
    personCredentials: await count(sb, 'license_credentials', [['entity_kind', 'person']]),
    txPersonCredentials: await count(sb, 'license_credentials', [
      ['entity_kind', 'person'],
      ['jurisdiction', 'TX'],
    ]),
    loa_observations: await count(sb, 'loa_observations'),
    relationships: await count(sb, 'national_relationships'),
    contacts: await count(sb, 'contact_observations'),
    cms: await count(sb, 'cms_marketplace_observations'),
    providers: await count(sb, 'providers'),
    fingerprints: summary.fingerprints,
  };
  writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(after, null, 2));
  console.log(JSON.stringify(after, null, 2));
  if (
    after.providers !== PROVIDER_BASELINE ||
    after.agencies !== AGENCY_BASELINE ||
    after.cms !== CMS_ROW_BASELINE
  ) {
    console.error('safety gate failed', after);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
