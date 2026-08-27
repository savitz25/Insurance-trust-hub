/**
 * MA-INS-002 — resolve 2,089 held MA NPNs from authoritative entity-type sources.
 *
 *   npx tsx scripts/national/resolve-ma-held-npns.ts
 *   npx tsx scripts/national/resolve-ma-held-npns.ts --execute
 *
 * CONFIRMED official type only. Name heuristics never create entities.
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'fs';
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
  detectMaDoiRegulatoryHeaders,
  fingerprintLines,
  maContactObservations,
  maCredentialSourceRecordId,
  parseMaCsvLine,
  parseMaRegulatoryRecord,
  type MaParsedRow,
} from '../../lib/national/ma-doi-regulatory';
import {
  MA002_TYPE_SOURCES,
  MA_INS_002_GATES,
  decideHeldEntityType,
  evidenceFromStagingRow,
  ma002WorksForPredicted,
  npnStillCanonical,
  type HeldTypeDecision,
  type TypeEvidence,
} from '../../lib/national/ma-held-resolution';

const CSV =
  process.env.MA_INS_002_CSV || resolve('data/ma-raw/ma-doi-regulatory-2026-08.csv');
const OUTDIR = process.env.MA_INS_002_OUTDIR || resolve('data/reports');
const execute = process.argv.includes('--execute');
const SOURCE_OBSERVED_AT = '2026-08-27T00:00:00.000Z';
void ma002WorksForPredicted;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
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
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`${table} count: ${last}`);
}

async function main() {
  const runId = `ma-ins-002-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const startedAt = new Date().toISOString();
  if (PUBLIC_PERSON_PROFILES_ENABLED || !personPublicationBlocked()) {
    console.error(JSON.stringify({ halt: 'person_publication_gate_open' }));
    process.exit(1);
  }
  if (!existsSync(CSV)) {
    console.error(`missing ${CSV}`);
    process.exit(1);
  }
  const hash = await sha256File(CSV);
  if (hash !== MA_INS_001_GATES.sourceSha256) {
    console.error(JSON.stringify({ halt: 'source_sha', hash }));
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
      if (!detectMaDoiRegulatoryHeaders(headers)) process.exit(1);
      continue;
    }
    rawRows += 1;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] ?? '';
    });
    rows.push(parseMaRegulatoryRecord(rec, rawRows + 1));
  }

  const unique = new Map<string, MaParsedRow>();
  const malformed: MaParsedRow[] = [];
  for (const r of rows) {
    if (r.npnRaw && !r.npn) malformed.push(r);
    if (!r.npn) continue;
    const k = maCredentialSourceRecordId({
      npn: r.npn,
      licenseNo: r.licenseNo,
      licenseClass: r.licenseClass,
    });
    if (!unique.has(k)) unique.set(k, r);
  }
  const allNpns = [...new Set([...unique.values()].map((r) => r.npn!).filter(Boolean))];

  console.log(`Graph lookup ${allNpns.length} NPNs…`);
  const graphAgency = new Set<string>();
  const graphPerson = new Set<string>();
  const graphCarrier = new Set<string>();
  const graphId = new Map<string, { id: string; kind: string }>();
  for (const part of chunk(allNpns, 100)) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,npn,entity_kind')
      .in('npn', part);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const n = normalizeNpn(row.npn);
      if (!n) continue;
      graphId.set(n, { id: String(row.id), kind: String(row.entity_kind) });
      if (row.entity_kind === 'agency') graphAgency.add(n);
      else if (row.entity_kind === 'person') graphPerson.add(n);
      else if (row.entity_kind === 'carrier') graphCarrier.add(n);
    }
  }

  const heldRows: MaParsedRow[] = [];
  const heldNpn = new Set<string>();
  for (const r of unique.values()) {
    if (!r.npn) continue;
    if (graphAgency.has(r.npn) || graphPerson.has(r.npn) || graphCarrier.has(r.npn)) continue;
    heldRows.push(r);
    heldNpn.add(r.npn);
  }
  if (heldNpn.size > MA_INS_002_GATES.heldValidNpn) {
    console.error(JSON.stringify({ halt: 'held_count_grew', got: heldNpn.size }));
    process.exit(1);
  }
  const alreadyResolvedSince001 = MA_INS_002_GATES.heldValidNpn - heldNpn.size;
  if (heldNpn.size !== MA_INS_002_GATES.heldValidNpn) {
    console.log(
      `Held NPN now ${heldNpn.size} (MA-INS-001 held ${MA_INS_002_GATES.heldValidNpn}; ${alreadyResolvedSince001} now in graph)`
    );
  }

  const evidenceByNpn = new Map<string, TypeEvidence[]>();
  const rawHits: Record<string, number> = {};
  const heldList = [...heldNpn];
  for (const spec of MA002_TYPE_SOURCES) {
    console.log(`  staging ${spec.table}…`);
    let hits = 0;
    for (const part of chunk(heldList, 80)) {
      const { data, error } = await sb
        .from(spec.table)
        .select('*')
        .in(spec.npnColumn, part);
      if (error) {
        console.log(`    skip ${spec.table}: ${error.message}`);
        break;
      }
      for (const row of data ?? []) {
        const n = normalizeNpn(row[spec.npnColumn]);
        if (!n || !heldNpn.has(n)) continue;
        hits += 1;
        const ev = evidenceFromStagingRow({
          source: spec.source,
          table: spec.table,
          authority: spec.authority,
          extractIsBusinessOnly: spec.extractIsBusinessOnly,
          typeColumn: spec.typeColumn,
          entityTypeRaw: spec.extractIsBusinessOnly ? 'business' : row.entity_type,
          sourceDate: row.source_checked_at || row.updated_at || null,
        });
        const list = evidenceByNpn.get(n) ?? [];
        list.push(ev);
        evidenceByNpn.set(n, list);
      }
    }
    rawHits[spec.table] = hits;
  }

  console.log('  CMS NPN hits (type not explicit)…');
  const cmsHit = new Set<string>();
  for (const part of chunk(heldList, 80)) {
    const { data, error } = await sb
      .from('cms_marketplace_observations')
      .select('npn')
      .in('npn', part);
    if (error) {
      console.log(`    cms skip: ${error.message}`);
      break;
    }
    for (const row of data ?? []) {
      const n = normalizeNpn(row.npn);
      if (n) cmsHit.add(n);
    }
  }

  const decisions = new Map<string, HeldTypeDecision>();
  const census = {
    BUSINESS_ENTITY: 0,
    INDIVIDUAL: 0,
    OTHER: 0,
    REVIEW_REQUIRED: 0,
    UNRESOLVED: 0,
  };
  for (const npn of heldList) {
    const d = decideHeldEntityType(evidenceByNpn.get(npn) ?? []);
    decisions.set(npn, d);
    if (d.confidence === 'CONFIRMED' && d.class === 'BUSINESS_ENTITY') census.BUSINESS_ENTITY += 1;
    else if (d.confidence === 'CONFIRMED' && d.class === 'INDIVIDUAL') census.INDIVIDUAL += 1;
    else if (d.confidence === 'REVIEW_REQUIRED') census.REVIEW_REQUIRED += 1;
    else if (d.class === 'OTHER_REGULATED_ENTITY') census.OTHER += 1;
    else census.UNRESOLVED += 1;
  }

  const byNpnRow = new Map<string, MaParsedRow>();
  for (const r of heldRows) if (r.npn) byNpnRow.set(r.npn, r);

  const createAgencies: MaParsedRow[] = [];
  const createPersons: MaParsedRow[] = [];
  for (const npn of heldList) {
    const d = decisions.get(npn)!;
    const row = byNpnRow.get(npn);
    if (!row) continue;
    if (d.confidence === 'CONFIRMED' && d.class === 'BUSINESS_ENTITY') createAgencies.push(row);
    if (d.confidence === 'CONFIRMED' && d.class === 'INDIVIDUAL') createPersons.push(row);
  }

  const loaCount = (list: MaParsedRow[]) => {
    let n = 0;
    for (const r of list) {
      n += extractOfficialLoas({
        jurisdiction: 'MA',
        sourceDataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
        entityKind: 'agency',
        licenseTypes: [r.licenseClass],
        linesOfAuthority: r.loas,
      }).observations.length;
    }
    return n;
  };

  const contactCount = (list: MaParsedRow[]) => {
    const keys = new Set<string>();
    for (const r of list) {
      for (const c of maContactObservations(r)) keys.add(`${r.npn}|${c.kind}|${c.value}`);
    }
    return keys.size;
  };

  const heldCollisions = {
    email: collision(heldRows, (r) => r.emailRaw.toLowerCase()),
    phone: collision(heldRows, (r) => r.phoneRaw),
    address: collision(heldRows, (r) => `${r.address1}|${r.city}|${r.busState}`.toUpperCase()),
    name: collision(heldRows, (r) => r.name.toUpperCase()),
  };

  const resFp = fingerprintLines(
    heldList.map((n) => `${n}|${decisions.get(n)?.confidence}|${decisions.get(n)?.class}`)
  );

  const praRequired = census.UNRESOLVED + census.REVIEW_REQUIRED + census.OTHER > 200;
  const summary = {
    task: 'MA-INS-002',
    runId,
    execute,
    startedAt,
    sourceSha256: hash,
    baseline,
    held: {
      validNpn: heldNpn.size,
      malformed: malformed.map((r) => ({
        sourceRow: r.sourceRow,
        npnRaw: r.npnRaw,
        name: r.name,
        licenseNo: r.licenseNo,
        verdict: 'UNRESOLVED_SOURCE_IDENTIFIER',
        note: '4-digit value equals LICENSE_NO; not padded to NPN',
      })),
    },
    rawHits,
    cmsNpnHitsNotType: cmsHit.size,
    census,
    predicted: {
      newAgencies: createAgencies.length,
      newPersons: createPersons.length,
      newCredentials: createAgencies.length + createPersons.length,
      newLoasAgencies: loaCount(createAgencies),
      newLoasPersons: loaCount(createPersons),
      newContactsAgencies: contactCount(createAgencies),
      newContactsPersons: contactCount(createPersons),
      worksFor: 0,
      indexableWrites: 0,
      carrierChanges: 0,
    },
    collisionsHeld: heldCollisions,
    sourcesUsed: MA002_TYPE_SOURCES.map((s) => ({
      table: s.table,
      source: s.source,
      authority: s.authority,
      typeField: s.typeColumn,
      hits: rawHits[s.table] ?? 0,
    })),
    sbsBulk: false,
    nipr: false,
    publication: {
      newAgencyAutoIndex: false,
      personPublic: false,
      massachusettsRoute: false,
    },
    followUpPra: praRequired,
    fingerprints: { resolution: resFp },
  };
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'ma-ins-002-census.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'ma-ins-002-decisions.json'),
    JSON.stringify(
      heldList.map((n) => ({
        npn: n,
        name: byNpnRow.get(n)?.name,
        decision: decisions.get(n),
        cmsHit: cmsHit.has(n),
      })),
      null,
      2
    )
  );
  console.log(JSON.stringify(summary, null, 2));
  if (!execute) {
    console.log('DRY-RUN / CENSUS only. Re-run with --execute to create CONFIRMED entities.');
    return;
  }
  if (createAgencies.length + createPersons.length === 0) {
    console.log('No CONFIRMED creations. Held remain unresolved.');
    return;
  }

  async function insertEntities(
    list: MaParsedRow[],
    kind: 'agency' | 'person'
  ): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const part of chunk(list, 80)) {
      const npns = part.map((r) => r.npn!).filter(Boolean);
      const { data: race } = await sb
        .from('national_entities')
        .select('id,npn,entity_kind')
        .in('npn', npns);
      const raced = new Set<string>();
      for (const row of race ?? []) {
        const n = normalizeNpn(row.npn);
        if (!n) continue;
        raced.add(n);
        ids.set(n, String(row.id));
      }
      const fresh = part.filter((r) => r.npn && !raced.has(r.npn) && !npnStillCanonical(r.npn, raced));
      if (!fresh.length) continue;
      const payload = fresh.map((r) => ({
        entity_kind: kind,
        identity_kind: 'npn',
        npn: r.npn,
        legal_name: r.name,
        display_name: r.name,
        identity_confidence: 'CONFIRMED',
        identity_notes: JSON.stringify({
          task: 'MA-INS-002',
          runId,
          created_from_source: MA_DOI_REGULATORY_SOURCE.sourceDataset,
          nameSource: 'massachusetts_doi_regulatory',
          public: false,
          autoIndexed: false,
          decision: decisions.get(r.npn!)?.reason,
        }),
      }));
      const { data, error } = await sb.from('national_entities').insert(payload).select('id,npn');
      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          const { data: ex } = await sb
            .from('national_entities')
            .select('id,npn')
            .in('npn', fresh.map((r) => r.npn!));
          for (const row of ex ?? []) {
            const n = normalizeNpn(row.npn);
            if (n) ids.set(n, String(row.id));
          }
          continue;
        }
        console.error('entity insert fail', error.message);
        process.exit(1);
      }
      for (const row of data ?? []) {
        if (row.npn) ids.set(String(row.npn), String(row.id));
      }
    }
    return ids;
  }

  console.log(`Creating ${createAgencies.length} agencies, ${createPersons.length} persons…`);
  const agencyIds = await insertEntities(createAgencies, 'agency');
  const personIds = await insertEntities(createPersons, 'person');
  const entityId = new Map<string, { id: string; kind: 'agency' | 'person' }>();
  for (const r of createAgencies) {
    const id = agencyIds.get(r.npn!);
    if (id) entityId.set(r.npn!, { id, kind: 'agency' });
  }
  for (const r of createPersons) {
    const id = personIds.get(r.npn!);
    if (id) entityId.set(r.npn!, { id, kind: 'person' });
  }

  const toAttach = [...createAgencies, ...createPersons].filter((r) => r.npn && entityId.has(r.npn));
  let insertedCreds = 0;
  const credIdByLic = new Map<string, string>();
  for (const part of chunk(toAttach, 80)) {
    const payload = part.map((r) => {
      const e = entityId.get(r.npn!)!;
      return {
        entity_id: e.id,
        entity_kind: e.kind,
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
          task: 'MA-INS-002',
          runId,
          status_raw: r.licenseStatusRaw,
          domicile_state_raw: r.domicileRaw,
          domicile_state: r.domicile,
          domicile_label: 'Domicile state reported in Massachusetts licensing data',
          notHeadquarters: true,
          notResidence: true,
          notServiceArea: true,
          sourceFile: basename(CSV),
          sourceSha256: hash,
          sourceRow: r.sourceRow,
        },
      };
    });
    const { data, error } = await sb
      .from('license_credentials')
      .insert(payload)
      .select('id,license_number');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        const { data: ex } = await sb
          .from('license_credentials')
          .select('id,license_number')
          .eq('jurisdiction', 'MA')
          .in(
            'license_number',
            part.map((r) => r.licenseNo)
          );
        for (const row of ex ?? []) credIdByLic.set(String(row.license_number), String(row.id));
        continue;
      }
      console.error('cred fail', error.message);
      process.exit(1);
    }
    for (const row of data ?? []) credIdByLic.set(String(row.license_number), String(row.id));
    insertedCreds += data?.length ?? 0;
  }

  const loaPayloads = [];
  for (const r of toAttach) {
    const e = entityId.get(r.npn!);
    const credId = credIdByLic.get(r.licenseNo);
    if (!e || !credId) continue;
    const extracted = extractOfficialLoas({
      jurisdiction: 'MA',
      sourceDataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      entityKind: e.kind,
      licenseTypes: [r.licenseClass],
      linesOfAuthority: r.loas,
    });
    for (const o of extracted.observations) {
      loaPayloads.push({
        entity_id: e.id,
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
  for (const part of chunk(loaPayloads, 150)) {
    const { data, error } = await sb.from('loa_observations').insert(part).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('loa fail', error.message);
      process.exit(1);
    }
    insertedLoas += data?.length ?? 0;
  }

  const contactPayloads = [];
  const cseen = new Set<string>();
  for (const r of toAttach) {
    const e = entityId.get(r.npn!);
    if (!e) continue;
    for (const c of maContactObservations(r)) {
      const k = `${e.id}|${c.kind}|${c.value.toUpperCase()}`;
      if (cseen.has(k)) continue;
      cseen.add(k);
      contactPayloads.push({
        entity_id: e.id,
        contact_kind: c.kind,
        value: c.value,
        label: c.label,
        source_dataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
        source_record_id: maCredentialSourceRecordId({
          npn: r.npn,
          licenseNo: r.licenseNo,
          licenseClass: r.licenseClass,
        }),
        source_observed_at: SOURCE_OBSERVED_AT,
        attribution_confidence: 'CONFIRMED',
        public_eligible: false,
      });
    }
  }
  let insertedContacts = 0;
  for (const part of chunk(contactPayloads, 150)) {
    const { data, error } = await sb.from('contact_observations').insert(part).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      console.error('contact fail', error.message);
      process.exit(1);
    }
    insertedContacts += data?.length ?? 0;
  }

  const after = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    maCredentials: await count(sb, 'license_credentials', [['jurisdiction', 'MA']]),
    providers: await count(sb, 'providers'),
    associatedWith: await count(sb, 'national_relationships', [
      ['relationship_type', 'ASSOCIATED_WITH'],
    ]),
  };
  if (after.carriers !== baseline.carriers || after.providers !== baseline.providers) {
    console.error('safety gate', { baseline, after });
    process.exit(1);
  }
  if (after.agencies !== baseline.agencies + createAgencies.length && after.agencies < baseline.agencies) {
    console.error('agency count dropped', after);
    process.exit(1);
  }

  const execution = {
    executed: true,
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    census,
    insertedEntitiesAgency: after.agencies - baseline.agencies,
    insertedEntitiesPerson: after.persons - baseline.persons,
    insertedCreds,
    insertedLoas,
    insertedContacts,
    baseline,
    after,
    fingerprints: { resolution: resFp },
  };
  writeFileSync(resolve(OUTDIR, 'ma-ins-002-execution.json'), JSON.stringify(execution, null, 2));
  console.log(JSON.stringify(execution, null, 2));
}

function collision(rows: MaParsedRow[], keyFn: (r: MaParsedRow) => string): number {
  const m = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || k === '|' || k === '||') continue;
    const s = m.get(k) ?? new Set();
    if (r.npn) s.add(r.npn);
    m.set(k, s);
  }
  return [...m.values()].filter((s) => s.size > 1).length;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
