/**
 * INS-NAT-010 — gated individual producer graph (FL core + VT producers).
 *
 *   npx tsx scripts/national/backfill-individual-producers.ts
 *   npx tsx scripts/national/backfill-individual-producers.ts --execute
 *
 * Default dry-run. Never writes public.providers. Never converts agencies.
 * PUBLIC_PERSON_PROFILES_ENABLED remains false.
 * idempotent on (entity_kind, npn) and credential natural key.
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
  displayNameFromDfsFullName,
  isFlIndividualCoreProducerTycl,
  isVtIndividualProducerClass,
  personContactPublicEligible,
  personPublicationBlocked,
  worksForFromSharedContact,
} from '../../lib/national/person-identity';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
} from '../../lib/national/publication';
import {
  executeEligible,
  extractOfficialLoas,
  type LoaStatusToken,
} from '../../lib/national/loa';
import { isVermontFirm } from '../../lib/vt/firm-heuristic';
import { parseVtCsvSync } from '../../lib/vt/parse-workbook';
import { mergeVtProducers, normalizeVtLicenseRow } from '../../lib/vt/normalize';

const OUTDIR =
  process.env.INS_NAT_010_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-010-manifest';
const FL_CSV =
  process.env.INS_NAT_010_FL_CSV ||
  'C:/Users/Michael.Savitsky/insurance-trust-hub/data/dfs-raw/AllValidLicensesIndividual.csv';
const VT_CSV =
  process.env.INS_NAT_010_VT_CSV ||
  'C:/Users/Michael.Savitsky/agent-tools/vt-licensees.csv';
const execute = process.argv.includes('--execute');

type PersonRec = {
  npn: string;
  legalName: string;
  displayName: string;
  states: string[];
  identityConfidence: 'CONFIRMED';
  nameSource: string;
};
type CredRec = {
  key: string;
  npn: string;
  jurisdiction: string;
  regulator: string;
  licenseNumber: string;
  licenseClass: string | null;
  sourceDataset: string;
  sourceTable: string;
  sourceRecordId: string;
  status: string;
  issueDate: string | null;
  expirationDate: string | null;
};
type LoaRec = {
  npn: string;
  credKey: string;
  officialText: string;
  consumerGroup: string | null;
  loaStatus: LoaStatusToken;
  sourceDataset: string;
  regulator: string;
  jurisdiction: string;
};

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
  if (excel) return excel[1].trim();
  const excel2 = s.match(/^=\s*(.+)\s*$/);
  if (excel2 && !s.includes(' ')) return excel2[1].replace(/^"|"$/g, '').trim();
  return s;
}

function parseMdY(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
}

async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eq?: [string, string]
): Promise<T[]> {
  const rows: T[] = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(select).range(from, from + page - 1);
    if (eq) q = q.eq(eq[0], eq[1]);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return rows;
}

async function count(sb: SupabaseClient, table: string, eq?: [string, string]): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  if (eq) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}

function shaLines(lines: string[]): string {
  return createHash('sha256').update(lines.slice().sort().join('\n')).digest('hex');
}

async function loadFlIndividuals(): Promise<{
  byLicense: Map<
    string,
    {
      npn: string | null;
      legalName: string;
      tycls: Set<string>;
      status: string;
      issueDate: string | null;
      email: string;
      phone: string;
    }
  >;
  rows: number;
  missingNpn: number;
  malformedNpn: number;
}> {
  const byLicense = new Map<
    string,
    {
      npn: string | null;
      legalName: string;
      tycls: Set<string>;
      status: string;
      issueDate: string | null;
      email: string;
      phone: string;
    }
  >();
  let rows = 0;
  let missingNpn = 0;
  let malformedNpn = 0;
  const rl = createInterface({ input: createReadStream(FL_CSV, { encoding: 'utf8' }), crlfDelay: Infinity });
  let headers: string[] | null = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      if (cols.some((c) => /license number/i.test(c))) headers = cols;
      continue;
    }
    rows += 1;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] ?? '';
    });
    const license = cleanCell(rec['License Number']);
    if (!license) continue;
    const npnRaw = cleanCell(rec['NPN Number']);
    const npn = normalizeNpn(npnRaw);
    if (!npnRaw) missingNpn += 1;
    else if (!npn) malformedNpn += 1;
    const tycl = cleanCell(rec['License TYCL Desc']);
    const name = cleanCell(rec['Full Name']);
    const existing = byLicense.get(license);
    if (!existing) {
      byLicense.set(license, {
        npn,
        legalName: name,
        tycls: new Set(tycl ? [tycl] : []),
        status: cleanCell(rec['License Status']),
        issueDate: parseMdY(cleanCell(rec['License Issue Date'])),
        email: cleanCell(rec['Email Address']),
        phone: cleanCell(rec['Business Phone']),
      });
    } else {
      if (tycl) existing.tycls.add(tycl);
      if (!existing.npn && npn) existing.npn = npn;
      if (!existing.legalName && name) existing.legalName = name;
    }
  }
  return { byLicense, rows, missingNpn, malformedNpn };
}

function mainVt(): {
  byLicense: Map<string, ReturnType<typeof mergeVtProducers>>;
  individualRows: number;
  firmSkipped: number;
} {
  const byLicense = new Map<string, NonNullable<ReturnType<typeof mergeVtProducers>>>();
  let individualRows = 0;
  let firmSkipped = 0;
  if (!existsSync(VT_CSV)) {
    return { byLicense, individualRows, firmSkipped };
  }
  const raw = parseVtCsvSync(VT_CSV);
  const groups = new Map<string, ReturnType<typeof normalizeVtLicenseRow>[]>();
  for (const row of raw) {
    const n = normalizeVtLicenseRow(row);
    if (n.skipReason) continue;
    if (isVermontFirm({ firstName: row.firstName, lastOrBusinessName: row.lastOrBusinessName })) {
      firmSkipped += 1;
      continue;
    }
    individualRows += 1;
    const list = groups.get(n.licenseNumber) ?? [];
    list.push(n);
    groups.set(n.licenseNumber, list);
  }
  for (const [lic, list] of groups) {
    const merged = mergeVtProducers(list);
    if (merged) byLicense.set(lic, merged);
  }
  return { byLicense, individualRows, firmSkipped };
}

async function main() {
  void worksForFromSharedContact();
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
  if (providers !== 170499) {
    console.error(JSON.stringify({ halt: 'providers_count_unexpected', providers }));
    process.exit(1);
  }

  const baseline = {
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    persons: await count(sb, 'national_entities', ['entity_kind', 'person']),
    credentials: await count(sb, 'license_credentials'),
    agencyLoas: await count(sb, 'loa_observations'),
    contacts: await count(sb, 'contact_observations'),
    carriers: await count(sb, 'national_entities', ['entity_kind', 'carrier']),
    appointments: await count(sb, 'national_relationships'),
    providers,
  };
  if (baseline.agencies !== 81943) {
    console.error(JSON.stringify({ halt: 'agency_count_unexpected', ...baseline }));
    process.exit(1);
  }

  const agencyRows = await fetchAll<{ npn: string | null }>(
    sb,
    'national_entities',
    'npn',
    ['entity_kind', 'agency']
  );
  const agencyNpns = new Set<string>();
  for (const r of agencyRows) {
    const n = normalizeNpn(r.npn);
    if (n) agencyNpns.add(n);
  }

  console.log('Loading Florida individual CSV…');
  const fl = await loadFlIndividuals();
  console.log('Loading Vermont individuals…');
  const vt = mainVt();

  const persons = new Map<string, PersonRec>();
  const creds = new Map<string, CredRec>();
  const loas = new Map<string, LoaRec>();
  const skipReasons: Record<string, number> = {};
  let reviewName = 0;
  let kindConflict = 0;
  let unresolved = 0;
  const flCoreLicenses = new Set<string>();
  const flCoreNpn = new Set<string>();
  const vtProducerLicenses = new Set<string>();
  const contactStoreable = { email: 0, phone: 0, address: 0 };

  const adoptPerson = (npn: string, legalName: string, displayName: string, state: string, nameSource: string) => {
    const existing = persons.get(npn);
    if (!existing) {
      persons.set(npn, {
        npn,
        legalName,
        displayName,
        states: [state],
        identityConfidence: 'CONFIRMED',
        nameSource,
      });
      return true;
    }
    const cmp = compareLegalNames(existing.legalName, legalName);
    if (cmp === 'conflict') {
      reviewName += 1;
      bump(skipReasons, 'same_npn_incompatible_names');
      return false;
    }
    if (!existing.states.includes(state)) existing.states.push(state);
    if (nameSource === 'florida_dfs' && legalName.length >= existing.legalName.length) {
      existing.legalName = legalName;
      existing.displayName = displayName;
      existing.nameSource = nameSource;
    }
    return true;
  };

  for (const [license, rec] of fl.byLicense) {
    const coreTycls = [...rec.tycls].filter(isFlIndividualCoreProducerTycl);
    if (!coreTycls.length) {
      bump(skipReasons, 'fl_not_core_producer');
      continue;
    }
    const decision = decidePersonIdentity({
      npn: rec.npn,
      legalName: rec.legalName,
      existingPersonName: rec.npn && persons.has(rec.npn) ? persons.get(rec.npn)!.legalName : null,
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
    const display = displayNameFromDfsFullName(rec.legalName);
    if (!adoptPerson(npn, rec.legalName, display, 'FL', 'florida_dfs')) continue;
    flCoreLicenses.add(license);
    flCoreNpn.add(npn);
    const extracted = extractOfficialLoas({
      jurisdiction: 'FL',
      sourceDataset: 'florida_dfs',
      entityKind: 'person',
      linesOfAuthority: coreTycls,
    });
    const credKey = `FL|person|producer|${license.toUpperCase()}`;
    creds.set(credKey, {
      key: credKey,
      npn,
      jurisdiction: 'FL',
      regulator: 'Florida Department of Financial Services',
      licenseNumber: license,
      licenseClass: coreTycls[0] ?? null,
      sourceDataset: 'florida_dfs_individual',
      sourceTable: 'dfs_individual_csv',
      sourceRecordId: license,
      status: /valid/i.test(rec.status) ? 'active' : rec.status || 'unknown',
      issueDate: rec.issueDate,
      expirationDate: null,
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
        loaStatus: 'UNKNOWN',
        sourceDataset: 'florida_dfs_individual',
        regulator: 'Florida Department of Financial Services',
        jurisdiction: 'FL',
      });
    }
    if (rec.email) contactStoreable.email += 1;
    if (rec.phone) contactStoreable.phone += 1;
    contactStoreable.address += 1;
  }

  for (const [license, rec] of vt.byLicense) {
    if (!rec) continue;
    if (!rec.licenseTypes.some(isVtIndividualProducerClass)) {
      bump(skipReasons, 'vt_not_insurance_producer');
      continue;
    }
    const npn = normalizeNpn(rec.npn);
    const decision = decidePersonIdentity({
      npn,
      legalName: rec.legalName,
      existingPersonName: npn && persons.has(npn) ? persons.get(npn)!.legalName : null,
      agencyOwnsNpn: npn ? agencyNpns.has(npn) : false,
    });
    if (decision.action === 'provisional') {
      unresolved += 1;
      bump(skipReasons, 'vt_' + decision.reason);
      continue;
    }
    if (decision.action === 'kind_conflict') {
      kindConflict += 1;
      bump(skipReasons, 'vt_' + decision.reason);
      continue;
    }
    if (decision.action === 'review_name') {
      reviewName += 1;
      bump(skipReasons, 'vt_' + decision.reason);
      continue;
    }
    const display = rec.displayName || rec.legalName;
    if (!adoptPerson(npn!, rec.legalName, display, 'VT', 'vermont_dfr')) continue;
    vtProducerLicenses.add(license);
    const extracted = extractOfficialLoas({
      jurisdiction: 'VT',
      sourceDataset: 'vermont_dfr',
      entityKind: 'person',
      licenseTypes: rec.licenseTypes,
      qualifications: rec.qualifications,
    });
    const credKey = `VT|person|producer|${license.toUpperCase()}`;
    creds.set(credKey, {
      key: credKey,
      npn: npn!,
      jurisdiction: 'VT',
      regulator: 'Vermont Department of Financial Regulation',
      licenseNumber: license,
      licenseClass: rec.licenseTypes[0] ?? null,
      sourceDataset: 'vermont_dfr_individual',
      sourceTable: 'vt_individual_csv',
      sourceRecordId: license,
      status: rec.licenseStatus || 'unknown',
      issueDate: rec.issueDate,
      expirationDate: rec.expirationDate,
    });
    for (const obs of extracted.observations) {
      if (!executeEligible(obs)) continue;
      const k = `${credKey}|${obs.officialText.toUpperCase()}`;
      if (loas.has(k)) continue;
      loas.set(k, {
        npn: npn!,
        credKey,
        officialText: obs.officialText,
        consumerGroup: obs.consumerGroup,
        loaStatus: 'UNKNOWN',
        sourceDataset: 'vermont_dfr_individual',
        regulator: 'Vermont Department of Financial Regulation',
        jurisdiction: 'VT',
      });
    }
  }

  const personList = [...persons.values()].sort((a, b) => a.npn.localeCompare(b.npn));
  const credList = [...creds.values()].sort((a, b) => a.key.localeCompare(b.key));
  const loaList = [...loas.values()].sort((a, b) =>
    `${a.credKey}|${a.officialText}`.localeCompare(`${b.credKey}|${b.officialText}`)
  );

  const personFp = shaLines(personList.map((p) => p.npn));
  const credFp = shaLines(credList.map((c) => c.key));
  const loaFp = shaLines(loaList.map((l) => `${l.credKey}|${l.officialText.toUpperCase()}`));

  const byStatePersons: Record<string, number> = {};
  const stateSets = { one: 0, two: 0, threePlus: 0 };
  for (const p of personList) {
    for (const s of p.states) bump(byStatePersons, s);
    if (p.states.length === 1) stateSets.one += 1;
    else if (p.states.length === 2) stateSets.two += 1;
    else stateSets.threePlus += 1;
  }
  const loaByState: Record<string, number> = {};
  const loaByFamily: Record<string, number> = {};
  const loaByTerm: Record<string, number> = {};
  for (const l of loaList) {
    bump(loaByState, l.jurisdiction);
    bump(loaByTerm, l.officialText);
    if (l.consumerGroup) {
      for (const f of l.consumerGroup.split(',')) bump(loaByFamily, f);
    }
  }
  const credByState: Record<string, number> = {};
  for (const c of credList) bump(credByState, c.jurisdiction);

  const existingPersonCount = await count(sb, 'national_entities', ['entity_kind', 'person']);
  const existingPersonCredCount = await count(sb, 'license_credentials', [
    'entity_kind',
    'person',
  ]);
  const loaTotalNow = await count(sb, 'loa_observations');
  const existingPersonLoa = Math.max(0, loaTotalNow - 50368);
  const newPersons =
    existingPersonCount === 0
      ? personList
      : personList.slice(0, Math.max(0, personList.length - existingPersonCount));
  const newCreds =
    existingPersonCredCount === 0
      ? credList
      : credList.slice(0, Math.max(0, credList.length - existingPersonCredCount));

  const summary = {
    task: 'INS-NAT-010',
    execute,
    publicationGate: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      personPublicationBlocked: personPublicationBlocked(),
      personContactPublicEligible: personContactPublicEligible(),
      public_eligible: false,
    },
    baseline,
    fingerprints: { persons: personFp, credentials: credFp, loas: loaFp },
    floridaSource: {
      csvRows: fl.rows,
      uniqueLicenses: fl.byLicense.size,
      missingNpnRows: fl.missingNpn,
      malformedNpnRows: fl.malformedNpn,
      coreLicenses: flCoreLicenses.size,
      coreNpn: flCoreNpn.size,
    },
    vermontSource: {
      csvPresent: existsSync(VT_CSV),
      individualRows: vt.individualRows,
      firmSkipped: vt.firmSkipped,
      mergedLicenses: vt.byLicense.size,
      producerLicenses: vtProducerLicenses.size,
    },
    predicted: {
      persons: personList.length,
      credentials: credList.length,
      loas: loaList.length,
      contacts: 0,
      contactsStoreableNotExecuted: contactStoreable,
      providerWritesPredicted: 0,
      entityAgencyWritesPredicted: 0,
    },
    dryRun: {
      insertPersons: newPersons.length,
      insertCredentials: newCreds.length,
      insertLoas: Math.max(0, loaList.length - existingPersonLoa),
      existingPersons: personList.length - newPersons.length,
      existingPersonLoas: existingPersonLoa,
    },
    multiState: stateSets,
    personsByState: byStatePersons,
    credentialsByState: credByState,
    loasByState: loaByState,
    loasByFamily: loaByFamily,
    reviewName,
    kindConflict,
    unresolved,
    skipReasons,
    kindConflictNote: 'same NPN already an agency — not reused, not inserted as person',
    marketplaceJoinReadiness: {
      personsWithValidNpn: personList.length,
      personsWithHealthFamily: new Set(
        loaList.filter((l) => (l.consumerGroup || '').includes('HEALTH')).map((l) => l.npn)
      ).size,
      personsWithLifeOrHealth: new Set(
        loaList
          .filter((l) => {
            const g = l.consumerGroup || '';
            return g.includes('HEALTH') || g.includes('LIFE');
          })
          .map((l) => l.npn)
      ).size,
      statesRepresented: Object.keys(byStatePersons),
      note: 'Join readiness only. Not Marketplace certification.',
    },
  };

  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'loa-terms.json'),
    JSON.stringify(
      Object.entries(loaByTerm)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 80),
      null,
      2
    )
  );
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write person graph.');
    return;
  }

  let insertedPersons = 0;
  let insertedCreds = 0;
  let insertedLoas = 0;
  let failures = 0;
  const npnToId = new Map<string, string>();
  const existingPersonFull = await fetchAll<{ id: string; npn: string | null }>(
    sb,
    'national_entities',
    'id,npn',
    ['entity_kind', 'person']
  );
  for (const r of existingPersonFull) {
    const n = normalizeNpn(r.npn);
    if (n) npnToId.set(n, r.id);
  }

  const personBatches = chunk(newPersons, 200);
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
        task: 'INS-NAT-010',
        states: p.states,
        nameSource: p.nameSource,
        public: false,
      }),
    }));
    const { data, error } = await sb.from('national_entities').insert(payload).select('id,npn');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      failures += 1;
      console.error('person insert fail', error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      if (row.npn && row.id) npnToId.set(String(row.npn), String(row.id));
    }
    insertedPersons += data?.length ?? 0;
    if (i % 50 === 0) console.log(`persons ${insertedPersons}/${newPersons.length}`);
  }

  const credKeyToId = new Map<string, string>();
  const credBatches = chunk(
    newCreds.filter((c) => npnToId.has(c.npn)),
    200
  );
  let credBatchesN = credBatches.length;
  for (let i = 0; i < credBatches.length; i += 1) {
    const part = credBatches[i]!;
    const payload = part.map((c) => ({
      entity_id: npnToId.get(c.npn)!,
      entity_kind: 'person',
      jurisdiction: c.jurisdiction,
      regulator: c.regulator,
      license_number: c.licenseNumber,
      license_class: c.licenseClass,
      license_namespace: 'producer',
      regulatory_status: /active|valid/i.test(c.status) ? 'active' : 'unknown',
      issue_date: c.issueDate,
      expiration_date: c.expirationDate,
      source_dataset: c.sourceDataset,
      source_record_id: c.sourceRecordId,
      attribution_confidence: 'CONFIRMED',
      raw: { task: 'INS-NAT-010', status: c.status },
    }));
    const { data, error } = await sb
      .from('license_credentials')
      .insert(payload)
      .select('id,jurisdiction,license_namespace,license_number,source_dataset,source_record_id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      failures += 1;
      console.error('credential insert fail', error.message);
      process.exit(1);
    }
    const bySrc = new Map(part.map((c) => [`${c.sourceDataset}|${c.sourceRecordId}`, c]));
    const links = (data ?? []).map((row) => {
      const src = bySrc.get(`${row.source_dataset}|${row.source_record_id}`);
      const key = `${row.jurisdiction}|person|${row.license_namespace}|${String(row.license_number).toUpperCase()}`;
      credKeyToId.set(key, String(row.id));
      return {
        source_dataset: row.source_dataset,
        source_table: src?.sourceTable || 'unknown',
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
    if (i % 50 === 0) console.log(`creds ${insertedCreds} batch ${i}/${credBatchesN}`);
  }

  // Map remaining cred keys if some already existed
  if (credKeyToId.size < credList.length) {
    const personCreds = await fetchAll<{
      id: string;
      jurisdiction: string;
      license_namespace: string;
      license_number: string;
    }>(sb, 'license_credentials', 'id,jurisdiction,license_namespace,license_number', [
      'entity_kind',
      'person',
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
        source_dataset: l.sourceDataset,
        regulator: l.regulator,
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
      failures += 1;
      console.error('loa insert fail', error.message);
      process.exit(1);
    }
    insertedLoas += data?.length ?? 0;
    if (i % 50 === 0) console.log(`loas ${insertedLoas}/${loaPayloads.length}`);
  }

  const after = {
    executed: true,
    personBatches: personBatches.length,
    credentialBatches: credBatchesN,
    loaBatches: loaBatches.length,
    insertedPersons,
    insertedCreds,
    insertedLoas,
    failures,
    retries: 0,
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    persons: await count(sb, 'national_entities', ['entity_kind', 'person']),
    credentials: await count(sb, 'license_credentials'),
    loa_observations: await count(sb, 'loa_observations'),
    contacts: await count(sb, 'contact_observations'),
    providers: await count(sb, 'providers'),
    fingerprints: { persons: personFp, credentials: credFp, loas: loaFp },
  };
  writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(after, null, 2));
  console.log(JSON.stringify(after, null, 2));
  if (after.providers !== 170499 || after.agencies !== 81943) {
    console.error('agency graph or providers mutated');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
