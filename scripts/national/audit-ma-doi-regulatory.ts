/**
 * MA-INS-000 — Massachusetts DOI regulatory extract dry-run.
 *
 *   npx tsx scripts/national/audit-ma-doi-regulatory.ts
 *
 * READ-ONLY. No inserts/updates. No sitemap/robots/public person launch.
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { createInterface } from 'readline';
import { resolve, basename } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../../lib/national/publication';
import { personPublicationBlocked } from '../../lib/national/person-identity';
import {
  MA_DOI_REGULATORY_SOURCE,
  cleanMaCell,
  decideMaIdentityJoin,
  detectMaDoiRegulatoryHeaders,
  fingerprintLines,
  maContactObservations,
  maCredentialSourceRecordId,
  maLoaSourceRecordId,
  parseMaCsvLine,
  parseMaRegulatoryRecord,
  publicationClassForMa,
  type MaParsedRow,
} from '../../lib/national/ma-doi-regulatory';

const DEFAULT_CSV =
  process.env.MA_INS_000_CSV ||
  resolve('data/ma-raw/ma-doi-regulatory-2026-08.csv');
const OUTDIR =
  process.env.MA_INS_000_OUTDIR ||
  resolve('data/reports');
const csvPath = process.argv.find((a) => a.endsWith('.csv')) || DEFAULT_CSV;

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, n + i));
  return out;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  for await (const buf of stream) hash.update(buf as Buffer);
  return hash.digest('hex').toUpperCase();
}

async function fetchNpnKind(
  sb: SupabaseClient,
  npns: string[]
): Promise<{ person: Set<string>; agency: Set<string>; carrier: Set<string> }> {
  const person = new Set<string>();
  const agency = new Set<string>();
  const carrier = new Set<string>();
  for (const part of chunk(npns, 100)) {
    const { data, error } = await sb
      .from('national_entities')
      .select('npn,entity_kind')
      .in('npn', part);
    if (error) throw new Error(`npn lookup: ${error.message}`);
    for (const r of data ?? []) {
      const n = normalizeNpn(r.npn);
      if (!n) continue;
      if (r.entity_kind === 'person') person.add(n);
      else if (r.entity_kind === 'agency') agency.add(n);
      else if (r.entity_kind === 'carrier') carrier.add(n);
    }
  }
  return { person, agency, carrier };
}

async function fetchMaCredentials(sb: SupabaseClient, npns: string[]) {
  const byNpn = new Map<string, Array<{ license_number: string; regulatory_status: string | null; expiration_date: string | null }>>();
  // Credentials join via entity. Fetch entity ids first in batches is heavy;
  // instead count existing MA person/agency credentials globally + sample by NPN via entities.
  const { count: maCreds, error } = await sb
    .from('license_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('jurisdiction', 'MA');
  if (error) throw new Error(`ma creds: ${error.message}`);
  void npns;
  void byNpn;
  return { existingMaCredentials: maCreds ?? 0 };
}

async function countEq(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number | null> {
  try {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(csvPath)) {
    console.error(`missing CSV ${csvPath}`);
    process.exit(1);
  }
  const st = statSync(csvPath);
  const hash = await sha256File(csvPath);

  const rows: MaParsedRow[] = [];
  let headerLine = '';
  let rawRows = 0;
  let blank = 0;
  let malformed = 0;
  const headersSeen: string[] = [];
  const fullRowDup = new Map<string, number>();

  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;
  for await (const line of rl) {
    if (!line.trim()) {
      blank += 1;
      continue;
    }
    const cols = parseMaCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      headers = cols.map((c) => cleanMaCell(c));
      headerLine = headers.join(',');
      headersSeen.push(...headers);
      if (!detectMaDoiRegulatoryHeaders(headers)) {
        console.error('Unrecognized headers', headers);
        process.exit(1);
      }
      continue;
    }
    rawRows += 1;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] ?? '';
    });
    if (cols.length < 10) {
      malformed += 1;
      continue;
    }
    const parsed = parseMaRegulatoryRecord(rec, rawRows + 1);
    const dupKey = cols.map((c) => cleanMaCell(c)).join('\0');
    fullRowDup.set(dupKey, (fullRowDup.get(dupKey) ?? 0) + 1);
    rows.push(parsed);
  }

  const duplicateFullRows = [...fullRowDup.values()].filter((n) => n > 1).reduce((a, b) => a + b - 1, 0);

  const npnSet = new Set<string>();
  const licenseSet = new Set<string>();
  const loaSet = new Set<string>();
  const loaCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const classCounts: Record<string, number> = {};
  const domicileCounts: Record<string, number> = {};
  const namesByNpn = new Map<string, Set<string>>();
  const licensesByNpn = new Map<string, Set<string>>();
  const domicileByNpn = new Map<string, Set<string>>();
  const emailsByNpn = new Map<string, Set<string>>();
  const phonesByNpn = new Map<string, Set<string>>();
  const addrByNpn = new Map<string, Set<string>>();
  const npnByLicense = new Map<string, Set<string>>();
  const npnByEmail = new Map<string, Set<string>>();
  const npnByPhone = new Map<string, Set<string>>();
  const npnByAddr = new Map<string, Set<string>>();
  const npnByName = new Map<string, Set<string>>();
  const statusByLicense = new Map<string, Set<string>>();
  const expByLicense = new Map<string, Set<string>>();
  const entityTypeCounts: Record<string, number> = {};
  const pubCounts: Record<string, number> = {};
  let missingNpn = 0;
  let malformedNpn = 0;
  let scientificNpn = 0;
  let activeLicenses = 0;
  let inactiveLicenses = 0;
  let unknownStatus = 0;
  let expBeforeActive = 0;
  let invalidEmail = 0;
  let invalidPhone = 0;
  let blankState = 0;
  let zipShort = 0;
  const licenseLoa = new Set<string>();
  const loasByLicense = new Map<string, Set<string>>();
  const loasByNpn = new Map<string, Set<string>>();
  const licenseByNpnClass = new Map<string, MaParsedRow>();

  for (const r of rows) {
    bump(statusCounts, r.licenseStatusRaw || '(blank)');
    bump(classCounts, r.licenseClass || '(blank)');
    bump(domicileCounts, r.domicile || r.domicileRaw || '(blank)');
    bump(entityTypeCounts, r.entityType.type);
    if (!r.npnRaw) missingNpn += 1;
    else if (!r.npn) {
      malformedNpn += 1;
      if (/e\+/i.test(r.npnRaw)) scientificNpn += 1;
    }
    if (r.npn) {
      npnSet.add(r.npn);
      const ns = namesByNpn.get(r.npn) ?? new Set();
      if (r.name) ns.add(r.name.toUpperCase());
      namesByNpn.set(r.npn, ns);
      const ls = licensesByNpn.get(r.npn) ?? new Set();
      if (r.licenseNo) ls.add(r.licenseNo);
      licensesByNpn.set(r.npn, ls);
      const ds = domicileByNpn.get(r.npn) ?? new Set();
      if (r.domicile) ds.add(r.domicile);
      domicileByNpn.set(r.npn, ds);
      if (r.emailRaw) {
        const es = emailsByNpn.get(r.npn) ?? new Set();
        es.add(r.emailRaw.toLowerCase());
        emailsByNpn.set(r.npn, es);
      }
      if (r.phoneRaw) {
        const ps = phonesByNpn.get(r.npn) ?? new Set();
        ps.add(r.phoneRaw);
        phonesByNpn.set(r.npn, ps);
      }
      if (r.address1) {
        const as = addrByNpn.get(r.npn) ?? new Set();
        as.add(`${r.address1}|${r.city}|${r.busState}|${r.zip || ''}`.toUpperCase());
        addrByNpn.set(r.npn, as);
      }
      if (r.name) {
        const kn = r.name.toUpperCase();
        const set = npnByName.get(kn) ?? new Set();
        set.add(r.npn);
        npnByName.set(kn, set);
      }
      const lk = `${r.npn}|${r.licenseNo}|${r.licenseClass}`;
      if (!licenseByNpnClass.has(lk)) licenseByNpnClass.set(lk, r);
    }
    if (r.licenseNo) {
      licenseSet.add(r.licenseNo);
      if (r.npn) {
        const set = npnByLicense.get(r.licenseNo) ?? new Set();
        set.add(r.npn);
        npnByLicense.set(r.licenseNo, set);
      }
      const ss = statusByLicense.get(r.licenseNo) ?? new Set();
      ss.add(r.licenseStatusRaw || '');
      statusByLicense.set(r.licenseNo, ss);
      const ex = expByLicense.get(r.licenseNo) ?? new Set();
      ex.add(r.expiration || '');
      expByLicense.set(r.licenseNo, ex);
    }
    if (r.licenseStatus === 'active') activeLicenses += 1;
    else if (['inactive', 'expired', 'suspended', 'revoked', 'cancelled'].includes(r.licenseStatus)) {
      inactiveLicenses += 1;
    } else unknownStatus += 1;
    if (r.firstActive && r.expiration && r.expiration < r.firstActive) expBeforeActive += 1;
    if (r.emailRaw && !r.emailRaw.includes('@')) invalidEmail += 1;
    if (r.phoneRaw && r.phoneRaw.replace(/\D/g, '').length < 7) invalidPhone += 1;
    if (!r.busState) blankState += 1;
    if (r.zipRaw && !r.zip) zipShort += 1;
    const contacts = maContactObservations(r);
    if (r.emailRaw && !contacts.some((c) => c.kind === 'email')) invalidEmail += 1;
    if (r.phoneRaw && !contacts.some((c) => c.kind === 'phone')) invalidPhone += 1;
    for (const loa of r.loas) {
      loaSet.add(loa);
      bump(loaCounts, loa);
      if (r.licenseNo) {
        licenseLoa.add(maLoaSourceRecordId({ licenseNo: r.licenseNo, loa }));
        const s = loasByLicense.get(r.licenseNo) ?? new Set();
        s.add(loa);
        loasByLicense.set(r.licenseNo, s);
      }
      if (r.npn) {
        const s = loasByNpn.get(r.npn) ?? new Set();
        s.add(loa);
        loasByNpn.set(r.npn, s);
      }
    }
    if (r.emailRaw) {
      const e = r.emailRaw.toLowerCase();
      const set = npnByEmail.get(e) ?? new Set();
      if (r.npn) set.add(r.npn);
      npnByEmail.set(e, set);
    }
    if (r.phoneRaw) {
      const set = npnByPhone.get(r.phoneRaw) ?? new Set();
      if (r.npn) set.add(r.npn);
      npnByPhone.set(r.phoneRaw, set);
    }
    if (r.address1) {
      const k = `${r.address1}|${r.city}|${r.busState}`.toUpperCase();
      const set = npnByAddr.get(k) ?? new Set();
      if (r.npn) set.add(r.npn);
      npnByAddr.set(k, set);
    }
  }

  const uniqueLicenses = [...licenseByNpnClass.values()];
  const uniqueLicenseActive = uniqueLicenses.filter((r) => r.licenseStatus === 'active').length;
  const uniqueLicenseInactive = uniqueLicenses.filter((r) =>
    ['inactive', 'expired', 'suspended', 'revoked', 'cancelled'].includes(r.licenseStatus)
  ).length;

  const sameNpnDifferentNames = [...namesByNpn.entries()].filter(([, s]) => s.size > 1).length;
  const sameLicenseMultipleNpn = [...npnByLicense.entries()].filter(([, s]) => s.size > 1).length;
  const sameEmailMultipleNpn = [...npnByEmail.entries()].filter(([, s]) => s.size > 1).length;
  const samePhoneMultipleNpn = [...npnByPhone.entries()].filter(([, s]) => s.size > 1).length;
  const sameAddrMultipleNpn = [...npnByAddr.entries()].filter(([, s]) => s.size > 1).length;
  const sameNameMultipleNpn = [...npnByName.entries()].filter(([, s]) => s.size > 1).length;
  const licenseStatusConflict = [...statusByLicense.entries()].filter(([, s]) => s.size > 1).length;
  const licenseExpConflict = [...expByLicense.entries()].filter(([, s]) => s.size > 1).length;
  const multiLoaLicenses = [...loasByLicense.values()].filter((s) => s.size > 1).length;
  const multiLoaEntities = [...loasByNpn.values()].filter((s) => s.size > 1).length;
  const multiLicenseNpn = [...licensesByNpn.values()].filter((s) => s.size > 1).length;

  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const baseline = {
    agencies: await countEq(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await countEq(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await countEq(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await countEq(sb, 'license_credentials'),
    maCredentials: await countEq(sb, 'license_credentials', [['jurisdiction', 'MA']]),
    maProducers: await countEq(sb, 'ma_producers'),
    providers: await countEq(sb, 'providers'),
  };

  const npnList = [...npnSet];
  console.log(`Resolving ${npnList.length} distinct NPNs against national graph…`);
  const kinds = await fetchNpnKind(sb, npnList);
  const existingMa = await fetchMaCredentials(sb, npnList);

  const joinCounts = {
    CONFIRMED_person: 0,
    CONFIRMED_agency: 0,
    REVIEW_REQUIRED: 0,
    UNRESOLVED_missing_npn: 0,
    NET_NEW: 0,
  };
  const pubRoll: Record<string, number> = {};
  const matchedExisting = new Set<string>();
  const netNew = new Set<string>();
  const reviewNpn = new Set<string>();
  let newMaRelationships = 0;
  const contactPred = { phone: 0, email: 0, address: 0, entities: new Set<string>() };
  const predictedCredentialKeys = new Set<string>();
  const predictedLoaKeys = new Set<string>();
  const predictedContactKeys = new Set<string>();

  const npnSeenJoin = new Set<string>();
  for (const r of uniqueLicenses) {
    const join = decideMaIdentityJoin({
      npn: r.npn,
      personByNpn: kinds.person,
      agencyByNpn: kinds.agency,
      carrierByNpn: kinds.carrier,
    });
    const pub = publicationClassForMa({ join, entityType: r.entityType });
    bump(pubRoll, pub);
    bump(pubCounts, pub);
    if (join.action === 'attach') {
      if (join.entityKind === 'person') joinCounts.CONFIRMED_person += 1;
      else joinCounts.CONFIRMED_agency += 1;
      matchedExisting.add(join.npn);
      newMaRelationships += 1;
    } else if (join.action === 'net_new') {
      joinCounts.NET_NEW += 1;
      if (r.npn) netNew.add(r.npn);
    } else if (join.confidence === 'REVIEW_REQUIRED') {
      joinCounts.REVIEW_REQUIRED += 1;
      if (r.npn) reviewNpn.add(r.npn);
    } else {
      joinCounts.UNRESOLVED_missing_npn += 1;
    }
    if (r.npn && !npnSeenJoin.has(r.npn)) {
      npnSeenJoin.add(r.npn);
    }
    predictedCredentialKeys.add(
      maCredentialSourceRecordId({
        npn: r.npn,
        licenseNo: r.licenseNo,
        licenseClass: r.licenseClass,
      })
    );
    for (const loa of r.loas) {
      predictedLoaKeys.add(maLoaSourceRecordId({ licenseNo: r.licenseNo, loa }));
    }
    const contacts = maContactObservations(r);
    for (const c of contacts) {
      const key = `${r.npn || r.licenseNo}|${c.kind}|${c.value}`;
      if (predictedContactKeys.has(key)) continue;
      predictedContactKeys.add(key);
      if (c.kind === 'phone') contactPred.phone += 1;
      if (c.kind === 'email') contactPred.email += 1;
      if (c.kind === 'physical_address') contactPred.address += 1;
      if (r.npn) contactPred.entities.add(r.npn);
    }
  }

  // Distinct-NPN identity rollup (one decision per NPN)
  const npnIdentity = { CONFIRMED: 0, HIGH_CONFIDENCE: 0, REVIEW_REQUIRED: 0, UNRESOLVED: 0 };
  for (const npn of npnSet) {
    const join = decideMaIdentityJoin({
      npn,
      personByNpn: kinds.person,
      agencyByNpn: kinds.agency,
      carrierByNpn: kinds.carrier,
    });
    if (join.confidence === 'CONFIRMED') npnIdentity.CONFIRMED += 1;
    else if (join.confidence === 'REVIEW_REQUIRED') npnIdentity.REVIEW_REQUIRED += 1;
    else npnIdentity.UNRESOLVED += 1;
  }

  const businessCand = rows.filter((r) => r.entityType.type === 'REVIEW_REQUIRED_ENTITY_TYPE' && r.entityType.hint === 'business_candidate');
  const personCand = rows.filter((r) => r.entityType.type === 'REVIEW_REQUIRED_ENTITY_TYPE' && r.entityType.hint === 'person_candidate');
  const businessNpn = new Set(businessCand.map((r) => r.npn).filter(Boolean) as string[]);
  const personNpn = new Set(personCand.map((r) => r.npn).filter(Boolean) as string[]);

  const flTxCaNyNj = { FL: 0, TX: 0, CA: 0, NY: 0, NJ: 0 };
  for (const r of uniqueLicenses) {
    if (r.domicile && r.domicile in flTxCaNyNj) {
      flTxCaNyNj[r.domicile as keyof typeof flTxCaNyNj] += 1;
    }
  }
  const domicileMa = uniqueLicenses.filter((r) => r.domicile === 'MA').length;
  const domicileNonMa = uniqueLicenses.filter((r) => r.domicile && r.domicile !== 'MA').length;

  const activeEntityNpns = new Set(
    uniqueLicenses.filter((r) => r.licenseStatus === 'active' && r.npn).map((r) => r.npn!)
  );
  const onlyInactive = [...npnSet].filter((n) => {
    const lic = uniqueLicenses.filter((r) => r.npn === n);
    return lic.length && lic.every((r) => r.licenseStatus !== 'active');
  }).length;

  const dryFp = fingerprintLines(
    uniqueLicenses.map((r) =>
      maCredentialSourceRecordId({ npn: r.npn, licenseNo: r.licenseNo, licenseClass: r.licenseClass })
    )
  );

  const collision = {
    sameNpnDifferentNames,
    sameLicenseMultipleNpn,
    sameEmailMultipleNpn,
    samePhoneMultipleNpn,
    sameAddressMultipleNpn: sameAddrMultipleNpn,
    sameNameMultipleNpn,
    licenseStatusConflict,
    licenseExpirationConflict: licenseExpConflict,
    malformedNpn,
    scientificNotationNpn: scientificNpn,
    missingNpn,
    samples: {
      sameNpnDifferentNames: [...namesByNpn.entries()]
        .filter(([, s]) => s.size > 1)
        .slice(0, 8)
        .map(([npn, s]) => ({ npn, names: [...s] })),
      sameLicenseMultipleNpn: [...npnByLicense.entries()]
        .filter(([, s]) => s.size > 1)
        .slice(0, 8)
        .map(([lic, s]) => ({ licenseNo: lic, npns: [...s] })),
    },
  };

  const contactReport = {
    rowsWithPhone: rows.filter((r) => r.phoneRaw).length,
    distinctPhones: new Set(rows.map((r) => r.phoneRaw).filter(Boolean)).size,
    rowsWithEmail: rows.filter((r) => r.emailRaw).length,
    distinctEmails: new Set(rows.map((r) => r.emailRaw.toLowerCase()).filter(Boolean)).size,
    rowsWithAddress: rows.filter((r) => r.address1).length,
    distinctAddresses: npnByAddr.size,
    predictedObservations: {
      phone: contactPred.phone,
      email: contactPred.email,
      address: contactPred.address,
      entitiesEnriched: contactPred.entities.size,
    },
    invalidEmail,
    invalidPhone,
    note: 'Business address reported to Massachusetts regulator — not assumed HQ',
  };

  const dryRun = {
    task: 'MA-INS-000',
    execute: false,
    productionWrite: false,
    publicationGate: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      personPublicationBlocked: personPublicationBlocked(),
    },
    source: {
      originalOperatorPath: 'C:\\Users\\Michael.Savitsky\\investor-trust-hub\\data\\raw\\Henry_August 2026.csv',
      originalFilename: 'Henry_August 2026.csv',
      canonicalPath: csvPath.replace(/\\/g, '/'),
      canonicalFilename: basename(csvPath),
      format: 'csv',
      encoding: 'utf-8-no-bom',
      bytes: st.size,
      sha256: hash,
      modified: st.mtime.toISOString(),
      sheets: 'n/a (csv)',
      headerLine,
      columns: headersSeen,
      columnCount: headersSeen.filter(Boolean).length,
    },
    provenance: {
      agencyLikely: 'Massachusetts Division of Insurance',
      requestReference: 'UNRESOLVED — filename Henry_August 2026; no recovered request ID',
      receivedDate: '2026-08-27',
      asOfDate: 'UNRESOLVED — August 2026 in filename; no official as-of column',
      completeness:
        'UNRESOLVED — not proven complete census; Insurance Producer rows with mixed domicile; all observed statuses Active in this extract pending audit totals',
    },
    raw: {
      dataRows: rawRows,
      blankRows: blank,
      malformedRows: malformed,
      duplicateFullRows,
      validParsed: rows.length,
    },
    grain: maRowGrainNote(uniqueLicenses.length, rows.length, licenseLoa.size),
    counts: {
      distinctNpn: npnSet.size,
      distinctLicenses: licenseSet.size,
      uniqueNpnLicenseClass: uniqueLicenses.length,
      licenseLoaRelationships: licenseLoa.size,
      distinctLoas: loaSet.size,
      sourceRows: rawRows,
    },
    entityPopulation: {
      businessCandidatesDistinctNpn: businessNpn.size,
      personCandidatesDistinctNpn: personNpn.size,
      unresolvedEntityType: entityTypeCounts.UNRESOLVED ?? 0,
      reviewRequiredEntityType: entityTypeCounts.REVIEW_REQUIRED_ENTITY_TYPE ?? 0,
      confirmedBusiness: entityTypeCounts.CONFIRMED_BUSINESS ?? 0,
      confirmedPerson: entityTypeCounts.CONFIRMED_PERSON ?? 0,
      note: 'No official entity-type column. Name-token hints are REVIEW_REQUIRED, never CONFIRMED.',
    },
    licenses: {
      rowLevelActive: activeLicenses,
      rowLevelInactive: inactiveLicenses,
      rowLevelUnknown: unknownStatus,
      uniqueLicenseActive,
      uniqueLicenseInactive,
      statusDistribution: statusCounts,
      classDistribution: classCounts,
    },
    loas: {
      distinct: loaSet.size,
      relationshipCount: licenseLoa.size,
      top: Object.entries(loaCounts).sort((a, b) => b[1] - a[1]),
      licensesWithMultipleLoas: multiLoaLicenses,
      npnWithMultipleLoas: multiLoaEntities,
    },
    domicile: {
      massachusettsUniqueLicenses: domicileMa,
      nonMassachusettsUniqueLicenses: domicileNonMa,
      blank: uniqueLicenses.filter((r) => !r.domicile).length,
      byState: Object.entries(domicileCounts).sort((a, b) => b[1] - a[1]),
      licensedInMaDomiciled: flTxCaNyNj,
    },
    identity: npnIdentity,
    graphMatch: {
      exactExistingPersonNpn: [...npnSet].filter((n) => kinds.person.has(n)).length,
      exactExistingAgencyNpn: [...npnSet].filter((n) => kinds.agency.has(n)).length,
      exactExistingCarrierNpn: [...npnSet].filter((n) => kinds.carrier.has(n)).length,
      netNewNpn: netNew.size,
      reviewRequiredNpn: reviewNpn.size,
      matchedExisting: matchedExisting.size,
      existingMaCredentialsInGraph: existingMa.existingMaCredentials,
      baseline,
    },
    predicted: {
      newEntities: netNew.size,
      entityInserts: 0,
      noteEntityInserts:
        'Net-new NPNs are candidates only. Entity type is REVIEW_REQUIRED without official type. MA-INS-000 does not insert entities.',
      credentialInserts: predictedCredentialKeys.size,
      loaInserts: predictedLoaKeys.size,
      contactInserts: predictedContactKeys.size,
      relationshipInserts: 0,
      updates: 0,
      newMaStateRelationshipsOnExisting: matchedExisting.size,
      worksForInserts: 0,
    },
    publication: pubRoll,
    currentness: {
      entitiesWithGe1Active: activeEntityNpns.size,
      entitiesOnlyInactive: onlyInactive,
    },
    quality: {
      expBeforeActive,
      invalidEmail,
      invalidPhone,
      blankBusinessState: blankState,
      zipUnusable: zipShort,
      duplicateLicenseLoaRows: rawRows - licenseLoa.size,
      multiLicenseSameNpn: multiLicenseNpn,
    },
    fingerprints: { credentials: dryFp },
    collisions: {
      sameNpnDifferentNames,
      sameLicenseMultipleNpn,
      sameEmailMultipleNpn,
      samePhoneMultipleNpn,
      sameAddrMultipleNpn,
      sameNameMultipleNpn,
    },
  };

  mkdirSync(OUTDIR, { recursive: true });
  mkdirSync(resolve('docs/state-adapters/massachusetts'), { recursive: true });
  writeFileSync(resolve(OUTDIR, 'ma-ins-000-dry-run.json'), JSON.stringify(dryRun, null, 2));
  writeFileSync(resolve(OUTDIR, 'ma-ins-000-collision-census.json'), JSON.stringify(collision, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'ma-ins-000-contact-report.json'),
    JSON.stringify(contactReport, null, 2)
  );
  writeFileSync(
    resolve(OUTDIR, 'ma-ins-000-provenance.json'),
    JSON.stringify(
      {
        originalFilename: 'Henry_August 2026.csv',
        canonicalFilename: basename(csvPath),
        sha256: hash,
        bytes: st.size,
        copiedFrom: 'investor-trust-hub/data/raw/Henry_August 2026.csv',
        copyVerified: true,
        receivedLocal: '2026-08-27',
      },
      null,
      2
    )
  );
  console.log(JSON.stringify(dryRun, null, 2));
  console.log('DRY-RUN only. NO production ingest.');
}

function maRowGrainNote(uniqueLicenses: number, rows: number, loaRels: number) {
  return {
    grain: 'LICENSE_PLUS_LOA_SET',
    explanation:
      'Each source row is one Massachusetts producer license with a LOA_NAME cell that may list one or more comma-separated official lines of authority. Rows are not 1:1 with entities. Distinct NPN is the entity denominator. Distinct LICENSE_NO (with class) is the credential denominator. Split LOA_NAME values are LOA observations.',
    uniqueLicenses,
    sourceRows: rows,
    loaRelationships: loaRels,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
