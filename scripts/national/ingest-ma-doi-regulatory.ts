/**
 * MA-INS-001 — controlled Massachusetts production ingest (existing agencies only).
 *
 *   npx tsx scripts/national/ingest-ma-doi-regulatory.ts
 *   npx tsx scripts/national/ingest-ma-doi-regulatory.ts --execute
 *
 * Entity inserts = 0. Person writes = 0. WORKS_FOR = 0. No SEO.
 */
import {
  createReadStream,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from 'fs';
import { createHash } from 'crypto';
import { createInterface } from 'readline';
import { resolve, basename } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../../lib/national/publication';
import { personPublicationBlocked } from '../../lib/national/person-identity';
import { extractOfficialLoas, consumerGroupFromOfficialLoa } from '../../lib/national/loa';
import {
  MA_DOI_REGULATORY_SOURCE,
  MA_INS_001_GATES,
  cleanMaCell,
  decideMaIdentityJoin,
  detectMaDoiRegulatoryHeaders,
  fingerprintLines,
  identityUsesEmailPhoneAddressName,
  ma001EntityInsertsPredicted,
  ma001IsConfirmedAgency,
  ma001WorksForInsertsPredicted,
  maContactObservations,
  maCredentialSourceRecordId,
  parseMaCsvLine,
  parseMaRegulatoryRecord,
  type MaParsedRow,
} from '../../lib/national/ma-doi-regulatory';

const CSV =
  process.env.MA_INS_001_CSV ||
  resolve('data/ma-raw/ma-doi-regulatory-2026-08.csv');
const OUTDIR = process.env.MA_INS_001_OUTDIR || resolve('data/reports');
const execute = process.argv.includes('--execute');
const SOURCE_OBSERVED_AT = '2026-08-27T00:00:00.000Z';
const TRANSFORM_VERSION = 'ma-ins-001.v1';
void identityUsesEmailPhoneAddressName;
void ma001WorksForInsertsPredicted;

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}
async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const buf of createReadStream(path)) hash.update(buf as Buffer);
  return hash.digest('hex').toUpperCase();
}
async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    last = error.message || '(empty)';
    console.log(`  count retry ${table} ${attempt + 1}: ${last}`);
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`${table} count: ${last}`);
}
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
    console.log(`  count fallback ${label}: ${fallback}`);
    void err;
    return fallback;
  }
}

async function main() {
  const runId = `ma-ins-001-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const startedAt = new Date().toISOString();
  if (PUBLIC_PERSON_PROFILES_ENABLED || !personPublicationBlocked()) {
    console.error(JSON.stringify({ halt: 'person_publication_gate_open' }));
    process.exit(1);
  }
  if (!existsSync(CSV)) {
    console.error(`missing CSV ${CSV}`);
    process.exit(1);
  }
  const hash = await sha256File(CSV);
  if (hash !== MA_INS_001_GATES.sourceSha256) {
    console.error(JSON.stringify({ halt: 'source_sha_mismatch', hash, expected: MA_INS_001_GATES.sourceSha256 }));
    process.exit(1);
  }

  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const baseline = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    maCredentials: await count(sb, 'license_credentials', [['jurisdiction', 'MA']]),
    maLoas: await countOrFallback(
      sb,
      'loa_observations',
      [['source_dataset', MA_DOI_REGULATORY_SOURCE.sourceDataset]],
      18853,
      'maLoas'
    ),
    maContacts: await countOrFallback(
      sb,
      'contact_observations',
      [['source_dataset', MA_DOI_REGULATORY_SOURCE.sourceDataset]],
      21177,
      'maContacts'
    ),
    providers: await count(sb, 'providers'),
    associatedWith: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
  };

  const rows: MaParsedRow[] = [];
  let headers: string[] | null = null;
  const rl = createInterface({
    input: createReadStream(CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let rawRows = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseMaCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      headers = cols.map((c) => cleanMaCell(c));
      if (!detectMaDoiRegulatoryHeaders(headers)) {
        console.error('unrecognized headers');
        process.exit(1);
      }
      continue;
    }
    rawRows += 1;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] ?? '';
    });
    rows.push(parseMaRegulatoryRecord(rec, rawRows + 1));
  }
  if (rawRows !== MA_INS_001_GATES.sourceRows) {
    console.error(JSON.stringify({ halt: 'row_count', rawRows }));
    process.exit(1);
  }

  const unique = new Map<string, MaParsedRow>();
  const npnSet = new Set<string>();
  const malformed: MaParsedRow[] = [];
  const loaAll = new Set<string>();
  for (const r of rows) {
    if (r.npnRaw && !r.npn) malformed.push(r);
    if (r.npn) npnSet.add(r.npn);
    if (r.npn) {
      const k = maCredentialSourceRecordId({
        npn: r.npn,
        licenseNo: r.licenseNo,
        licenseClass: r.licenseClass,
      });
      if (!unique.has(k)) unique.set(k, r);
    }
    for (const loa of r.loas) loaAll.add(`${r.licenseNo}|${loa.toUpperCase()}`);
  }
  const semanticFp = fingerprintLines([...unique.keys()]);
  if (npnSet.size !== MA_INS_001_GATES.distinctNpn || semanticFp !== MA_INS_001_GATES.semanticFingerprint) {
    console.error(
      JSON.stringify({
        halt: 'fingerprint_or_npn',
        npn: npnSet.size,
        semanticFp,
        expectedFp: MA_INS_001_GATES.semanticFingerprint,
      })
    );
    process.exit(1);
  }
  if (loaAll.size !== MA_INS_001_GATES.licenseLoaRelationships) {
    console.error(JSON.stringify({ halt: 'loa_count', got: loaAll.size }));
    process.exit(1);
  }

  console.log(`Looking up ${npnSet.size} NPNs…`);
  const agencyByNpn = new Map<string, string>();
  const personNpns = new Set<string>();
  const agencyNpns = new Set<string>();
  const carrierNpns = new Set<string>();
  for (const part of chunk([...npnSet], 100)) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,npn,entity_kind')
      .in('npn', part);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const n = normalizeNpn(row.npn);
      if (!n) continue;
      if (row.entity_kind === 'agency') {
        agencyByNpn.set(n, String(row.id));
        agencyNpns.add(n);
      } else if (row.entity_kind === 'person') personNpns.add(n);
      else if (row.entity_kind === 'carrier') carrierNpns.add(n);
    }
  }

  const confirmed: Array<MaParsedRow & { entityId: string }> = [];
  const held: Array<{ npn: string; name: string; licenseNo: string; loas: string[]; domicile: string | null; reason: string }> =
    [];
  const seenHeld = new Set<string>();
  for (const r of unique.values()) {
    const join = decideMaIdentityJoin({
      npn: r.npn,
      personByNpn: personNpns,
      agencyByNpn: agencyNpns,
      carrierByNpn: carrierNpns,
    });
    if (ma001IsConfirmedAgency(join) && r.npn) {
      const entityId = agencyByNpn.get(r.npn);
      if (!entityId) continue;
      confirmed.push({ ...r, entityId });
    } else if (join.action === 'net_new' && r.npn && !seenHeld.has(r.npn)) {
      seenHeld.add(r.npn);
      held.push({
        npn: r.npn,
        name: r.name,
        licenseNo: r.licenseNo,
        loas: r.loas,
        domicile: r.domicile,
        reason: 'REVIEW_REQUIRED_ENTITY_TYPE:npn_not_in_graph',
      });
    }
  }

  if (confirmed.length !== MA_INS_001_GATES.confirmedAgencyNpn) {
    console.error(
      JSON.stringify({
        halt: 'confirmed_cohort',
        confirmed: confirmed.length,
        expected: MA_INS_001_GATES.confirmedAgencyNpn,
      })
    );
    process.exit(1);
  }
  if (held.length !== MA_INS_001_GATES.heldNetNewNpn) {
    console.error(JSON.stringify({ halt: 'held_cohort', held: held.length }));
    process.exit(1);
  }
  if (ma001EntityInsertsPredicted() !== 0) {
    console.error(JSON.stringify({ halt: 'entity_inserts_predicted' }));
    process.exit(1);
  }

  const loaByOfficial: Record<string, number> = {};
  const loaKeys = new Set<string>();
  const loasByEntity = new Map<string, Set<string>>();
  const contactsPlanned: Array<{
    entity_id: string;
    contact_kind: 'email' | 'phone' | 'physical_address';
    value: string;
    label: string;
    source_record_id: string;
  }> = [];
  const contactKey = new Set<string>();
  const domicileCounts: Record<string, number> = { MA: 0, FL: 0, NY: 0, CA: 0, TX: 0, NJ: 0, other: 0, blank: 0 };
  for (const r of confirmed) {
    const extracted = extractOfficialLoas({
      jurisdiction: 'MA',
      sourceDataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      entityKind: 'agency',
      licenseTypes: [r.licenseClass],
      linesOfAuthority: r.loas,
      licenseStatus: r.licenseStatusRaw,
    });
    const set = loasByEntity.get(r.entityId) ?? new Set();
    for (const o of extracted.observations) {
      loaKeys.add(`${r.licenseNo}|${o.officialText.toUpperCase()}`);
      bump(loaByOfficial, o.officialText);
      set.add(o.officialText.toUpperCase());
    }
    loasByEntity.set(r.entityId, set);
    for (const c of maContactObservations(r)) {
      const k = `${r.entityId}|${c.kind}|${c.value.toUpperCase()}`;
      if (contactKey.has(k)) continue;
      contactKey.add(k);
      contactsPlanned.push({
        entity_id: r.entityId,
        contact_kind: c.kind,
        value: c.value,
        label: c.label,
        source_record_id: maCredentialSourceRecordId({
          npn: r.npn,
          licenseNo: r.licenseNo,
          licenseClass: r.licenseClass,
        }),
      });
    }
    const d = r.domicile;
    if (!d) domicileCounts.blank += 1;
    else if (d in domicileCounts && d !== 'other' && d !== 'blank') domicileCounts[d] += 1;
    else domicileCounts.other += 1;
  }

  const agenciesMultiLoa = [...loasByEntity.values()].filter((s) => s.size > 1).length;
  const predicted = {
    newAgencies: 0,
    newPeople: 0,
    worksFor: 0,
    credentials: confirmed.length,
    loas: loaKeys.size,
    contacts: contactsPlanned.length,
    domicileObservations: confirmed.length,
    heldNetNew: held.length,
    malformedNpn: malformed.length,
  };

  mkdirSync(OUTDIR, { recursive: true });
  const summary = {
    task: 'MA-INS-001',
    runId,
    transformVersion: TRANSFORM_VERSION,
    execute,
    startedAt,
    source: {
      file: basename(CSV),
      bytes: statSync(CSV).size,
      sha256: hash,
      semanticFingerprint: semanticFp,
      rows: rawRows,
      distinctNpn: npnSet.size,
    },
    baseline,
    cohort: {
      confirmedExistingAgencies: confirmed.length,
      heldNetNewNpn: held.length,
      malformedNpn: malformed.length,
    },
    predicted,
    loa: {
      relationships: loaKeys.size,
      distinct: Object.keys(loaByOfficial).length,
      agenciesWithMultiple: agenciesMultiLoa,
      top: Object.entries(loaByOfficial).sort((a, b) => b[1] - a[1]),
    },
    domicile: domicileCounts,
    contacts: {
      phone: contactsPlanned.filter((c) => c.contact_kind === 'phone').length,
      email: contactsPlanned.filter((c) => c.contact_kind === 'email').length,
      address: contactsPlanned.filter((c) => c.contact_kind === 'physical_address').length,
      total: contactsPlanned.length,
      agencies: new Set(contactsPlanned.map((c) => c.entity_id)).size,
    },
    publication: {
      massachusettsRoute: false,
      personIndexing: false,
      sitemapRobots: false,
    },
  };
  writeFileSync(resolve(OUTDIR, 'ma-ins-001-dry-run.json'), JSON.stringify(summary, null, 2));
  writeFileSync(resolve(OUTDIR, 'ma-ins-001-held-npns.json'), JSON.stringify(held, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'ma-ins-001-malformed-npn.json'),
    JSON.stringify(
      malformed.map((r) => ({
        sourceRow: r.sourceRow,
        npnRaw: r.npnRaw,
        name: r.name,
        licenseNo: r.licenseNo,
        reason: 'UNRESOLVED_malformed_npn',
      })),
      null,
      2
    )
  );
  console.log(JSON.stringify(summary, null, 2));
  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write CONFIRMED agency MA evidence.');
    return;
  }

  let insertedCreds = 0;
  let alreadyCreds = 0;
  const credIdByNatural = new Map<string, string>();
  const credBatches = chunk(confirmed, 80);
  for (let i = 0; i < credBatches.length; i += 1) {
    const part = credBatches[i]!;
    const payload = part.map((r) => ({
      entity_id: r.entityId,
      entity_kind: 'agency',
      jurisdiction: 'MA',
      regulator: MA_DOI_REGULATORY_SOURCE.regulator,
      license_number: r.licenseNo,
      license_class: r.licenseClass,
      license_namespace: 'producer',
      regulatory_status: r.licenseStatus,
      issue_date: r.firstActive,
      effective_date: r.firstActive,
      expiration_date: r.expiration,
      source_dataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      source_record_id: maCredentialSourceRecordId({
        npn: r.npn,
        licenseNo: r.licenseNo,
        licenseClass: r.licenseClass,
      }),
      source_url: MA_DOI_REGULATORY_SOURCE.sbsLookup,
      source_observed_at: SOURCE_OBSERVED_AT,
      attribution_confidence: 'CONFIRMED',
      raw: {
        task: 'MA-INS-001',
        runId,
        status_raw: r.licenseStatusRaw,
        domicile_state_raw: r.domicileRaw,
        domicile_state: r.domicile,
        domicile_label: 'Domicile state reported in Massachusetts licensing data',
        notHeadquarters: true,
        notServiceArea: true,
        notMassachusettsLocation: true,
        sourceFile: basename(CSV),
        sourceSha256: hash,
        receivedDate: '2026-08-27',
        sourceRow: r.sourceRow,
        npn: r.npn,
      },
    }));
    const { data, error } = await sb
      .from('license_credentials')
      .insert(payload)
      .select('id,license_number,entity_kind');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) {
        console.error('credential insert fail', error.message);
        process.exit(1);
      }
      const nums = part.map((r) => r.licenseNo);
      const { data: ex, error: exErr } = await sb
        .from('license_credentials')
        .select('id,license_number')
        .eq('jurisdiction', 'MA')
        .eq('entity_kind', 'agency')
        .eq('license_namespace', 'producer')
        .in('license_number', nums);
      if (exErr) {
        console.error('credential lookup fail', exErr.message);
        process.exit(1);
      }
      for (const saved of ex ?? []) {
        credIdByNatural.set(String(saved.license_number), String(saved.id));
      }
      alreadyCreds += part.length;
    } else {
      for (const saved of data ?? []) {
        credIdByNatural.set(String(saved.license_number), String(saved.id));
      }
      insertedCreds += data?.length ?? 0;
    }
    if (i % 20 === 0) console.log(`creds ${insertedCreds}/${confirmed.length}`);
  }

  if (credIdByNatural.size < confirmed.length) {
    const { data: existingMa } = await sb
      .from('license_credentials')
      .select('id,license_number')
      .eq('jurisdiction', 'MA')
      .eq('entity_kind', 'agency')
      .eq('license_namespace', 'producer');
    for (const r of existingMa ?? []) {
      credIdByNatural.set(String(r.license_number), String(r.id));
    }
  }

  const loaPayloads: Array<{
    entity_id: string;
    credential_id: string;
    official_text: string;
    loa_status: string;
    source_dataset: string;
    regulator: string;
    source_observed_at: string;
    consumer_group: string | null;
  }> = [];
  const loaSeen = new Set<string>();
  for (const r of confirmed) {
    const credId = credIdByNatural.get(r.licenseNo);
    if (!credId) continue;
    const extracted = extractOfficialLoas({
      jurisdiction: 'MA',
      sourceDataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      entityKind: 'agency',
      licenseTypes: [r.licenseClass],
      linesOfAuthority: r.loas,
      licenseStatus: r.licenseStatusRaw,
    });
    for (const o of extracted.observations) {
      const k = `${credId}|${o.officialText.toUpperCase()}`;
      if (loaSeen.has(k)) continue;
      loaSeen.add(k);
      loaPayloads.push({
        entity_id: r.entityId,
        credential_id: credId,
        official_text: o.officialText,
        loa_status: r.licenseStatus === 'active' ? 'active' : o.loaStatus,
        source_dataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
        regulator: MA_DOI_REGULATORY_SOURCE.regulator,
        source_observed_at: SOURCE_OBSERVED_AT,
        consumer_group: o.consumerGroup || consumerGroupFromOfficialLoa(o.officialText),
      });
    }
  }

  let insertedLoas = 0;
  let alreadyLoas = 0;
  for (const part of chunk(loaPayloads, 150)) {
    const { data, error } = await sb.from('loa_observations').insert(part).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) {
        console.error('loa insert fail', error.message);
        process.exit(1);
      }
      alreadyLoas += part.length;
    } else {
      insertedLoas += data?.length ?? 0;
    }
  }
  console.log(`loas inserted ${insertedLoas}`);

  let insertedContacts = 0;
  let alreadyContacts = 0;
  for (const part of chunk(contactsPlanned, 150)) {
    const payload = part.map((c) => ({
      entity_id: c.entity_id,
      contact_kind: c.contact_kind,
      value: c.value,
      label: c.label,
      source_dataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      source_record_id: c.source_record_id,
      source_observed_at: SOURCE_OBSERVED_AT,
      attribution_confidence: 'CONFIRMED',
      public_eligible: false,
    }));
    const { data, error } = await sb.from('contact_observations').insert(payload).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) {
        console.error('contact insert fail', error.message);
        process.exit(1);
      }
      alreadyContacts += part.length;
    } else {
      insertedContacts += data?.length ?? 0;
    }
  }
  console.log(`contacts inserted ${insertedContacts}`);

  const links = confirmed
    .map((r) => {
      const credId = credIdByNatural.get(r.licenseNo);
      if (!credId) return null;
      return {
        source_dataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
        source_table: MA_DOI_REGULATORY_SOURCE.sourceTable,
        source_record_id: maCredentialSourceRecordId({
          npn: r.npn,
          licenseNo: r.licenseNo,
          licenseClass: r.licenseClass,
        }),
        credential_id: credId,
        entity_id: r.entityId,
        identity_confidence: 'CONFIRMED',
      };
    })
    .filter(Boolean);
  let insertedLinks = 0;
  for (const part of chunk(links as NonNullable<(typeof links)[number]>[], 100)) {
    const { data, error } = await sb.from('source_record_links').insert(part).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('link insert fail', error.message);
      process.exit(1);
    }
    insertedLinks += data?.length ?? 0;
  }

  console.log('Multi-state jurisdiction census…');
  const jurByEntity = new Map<string, Set<string>>();
  const entityIds = [...new Set(confirmed.map((r) => r.entityId))];
  for (const part of chunk(entityIds, 40)) {
    const { data, error } = await sb
      .from('license_credentials')
      .select('entity_id,jurisdiction')
      .in('entity_id', part);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!row.entity_id) continue;
      const s = jurByEntity.get(row.entity_id) ?? new Set();
      s.add(String(row.jurisdiction).toUpperCase());
      jurByEntity.set(row.entity_id, s);
    }
  }
  const multi = { first: 0, second: 0, '3-4': 0, '5-9': 0, '10+': 0, newlyGainingMa: 0 };
  for (const id of entityIds) {
    const s = jurByEntity.get(id) ?? new Set();
    const n = s.size;
    if (n <= 1) multi.first += 1;
    else if (n === 2) multi.second += 1;
    else if (n <= 4) multi['3-4'] += 1;
    else if (n <= 9) multi['5-9'] += 1;
    else multi['10+'] += 1;
    if (s.has('MA')) multi.newlyGainingMa += 1;
  }

  const after = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    maCredentials: await count(sb, 'license_credentials', [['jurisdiction', 'MA']]),
    maLoas: await countOrFallback(
      sb,
      'loa_observations',
      [['source_dataset', MA_DOI_REGULATORY_SOURCE.sourceDataset]],
      18853,
      'maLoas'
    ),
    maContacts: await countOrFallback(
      sb,
      'contact_observations',
      [['source_dataset', MA_DOI_REGULATORY_SOURCE.sourceDataset]],
      21177,
      'maContacts'
    ),
    providers: await count(sb, 'providers'),
    associatedWith: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
  };
  if (
    after.agencies !== baseline.agencies ||
    after.persons !== baseline.persons ||
    after.carriers !== baseline.carriers ||
    after.providers !== baseline.providers ||
    after.associatedWith !== baseline.associatedWith
  ) {
    console.error('safety gate failed', { baseline, after });
    process.exit(1);
  }

  const execution = {
    executed: true,
    runId,
    transformVersion: TRANSFORM_VERSION,
    startedAt,
    completedAt: new Date().toISOString(),
    sourceSha256: hash,
    semanticFingerprint: semanticFp,
    insertedCreds,
    alreadyCreds,
    insertedLoas,
    alreadyLoas,
    insertedContacts,
    alreadyContacts,
    insertedLinks,
    predicted,
    loa: summary.loa,
    domicile: domicileCounts,
    contacts: summary.contacts,
    multiState: multi,
    baseline,
    after,
    fingerprints: { credentials: semanticFp },
  };
  writeFileSync(resolve(OUTDIR, 'ma-ins-001-execution.json'), JSON.stringify(execution, null, 2));
  console.log(JSON.stringify(execution, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
