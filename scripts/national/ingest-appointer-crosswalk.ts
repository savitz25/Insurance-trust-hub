/**
 * INS-NAT-FINAL-003 — CONFIRMED appointer → legal-insurer bridges.
 *
 *   npx tsx scripts/national/ingest-appointer-crosswalk.ts
 *   npx tsx scripts/national/ingest-appointer-crosswalk.ts --execute
 *
 * Default dry-run. Never writes providers. Never merges appointer entities.
 * Never writes REVIEW_REQUIRED / HIGH_CONFIDENCE / UNRESOLVED bridges.
 */
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  CARRIER_RELATIONSHIP_TYPE,
  CROSSWALK_OBSERVED_AT,
  CROSSWALK_SOURCE_DATASET,
  CROSSWALK_TASK,
  CROSSWALK_TRANSFORM,
  TX_MATCH_BASIS,
  TX_UNRESOLVED_IDS,
  classifyFlBridge,
  classifyTxBridge,
  confirmedMappingUsesNameAddressContactBrand,
  crosswalkSourceRecordId,
  productionBridgeAllowed,
  type CrosswalkRow,
} from '../../lib/national/appointer-crosswalk';
import {
  listingDirFromZipParent,
  parseNaicListingDir,
  sha256File,
  NAIC_LOC_SOURCE,
} from '../../lib/national/naic-listing';
import { APPROVED as SPINE } from './ingest-carrier-identity';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPublishEntityKind,
} from '../../lib/national/publication';

const ROOT = resolve(process.cwd());
const execute = process.argv.includes('--execute');
const OUT = join(ROOT, 'data/reports');

function chunk<T>(arr: T[], n: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < arr.length; i += n) parts.push(arr.slice(i, i + n));
  return parts;
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function pageKeys(sb: SupabaseClient, kind: string): Promise<Map<string, string>> {
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

async function existingBridgeKeys(sb: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from('national_relationships')
      .select('from_entity_id,to_entity_id,source_record_id')
      .eq('relationship_type', CARRIER_RELATIONSHIP_TYPE.APPOINTER_RESOLVES_TO)
      .range(from, from + page - 1);
    if (error) throw new Error(`bridges: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      set.add(`${r.from_entity_id}|${r.to_entity_id}|${r.source_record_id}`);
    }
    if (rows.length < page) break;
  }
  return set;
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
    if (!/duplicate|unique/i.test(error.message)) throw new Error(`rel batch: ${error.message}`);
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
        throw new Error(`rel: ${e2.message}`);
      }
      inserted += 1;
    }
  }
  return { inserted, skipped };
}

function fingerprint(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const runId = `${CROSSWALK_TASK.toLowerCase()}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '')
    .slice(0, 15)}Z`;

  const locDir =
    listingDirFromZipParent(join(ROOT, 'data/naic-raw')) ||
    join(ROOT, 'data/naic-raw/loc-jun-2026');
  const zipSha = sha256File(join(ROOT, 'data/naic-raw', NAIC_LOC_SOURCE.zipFileName));
  if (zipSha !== SPINE.zipSha256) throw new Error(`naic zip mismatch ${zipSha}`);
  const listing = parseNaicListingDir(locDir);
  if (listing.fingerprint !== SPINE.parserFingerprint) {
    throw new Error(`parser fingerprint mismatch ${listing.fingerprint}`);
  }

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const baseline = {
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    naicCocode: await count(sb, 'national_entity_identifiers', [['scheme', 'naic_cocode']]),
    naicGroup: await count(sb, 'national_entity_identifiers', [['scheme', 'naic_group_code']]),
    memberOfGroup: await count(sb, 'national_relationships', [
      ['relationship_type', 'MEMBER_OF_GROUP'],
    ]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    usesBrand: await count(sb, 'national_relationships', [['relationship_type', 'USES_BRAND']]),
    agency: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    person: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
  };
  const expectedBaseline = {
    legalInsurer: 6185,
    insuranceGroup: 720,
    consumerBrand: 14,
    naicCocode: 6185,
    naicGroup: 720,
    memberOfGroup: 3844,
    usesBrand: 0,
    agency: 82071,
    person: 1029860,
    credentials: 1531158,
    providers: 170499,
  };
  for (const [k, v] of Object.entries(expectedBaseline)) {
    if ((baseline as Record<string, number>)[k] !== v) {
      throw new Error(`preflight_spine_mismatch ${k}=${(baseline as Record<string, number>)[k]} expected ${v}`);
    }
  }

  const carrierKeys = await pageKeys(sb, 'carrier');
  const legalKeys = await pageKeys(sb, 'legal_insurer');
  const flKeys: string[] = [];
  const txKeys: string[] = [];
  for (const k of carrierKeys.keys()) {
    if (k.startsWith('carrier:fl-dfs:')) flKeys.push(k);
    else if (k.startsWith('carrier:tx-tdi-naic:')) txKeys.push(k);
  }
  flKeys.sort();
  txKeys.sort();
  if (flKeys.length !== 11944) throw new Error(`fl appointers ${flKeys.length}`);
  if (txKeys.length !== 1517) throw new Error(`tx appointers ${txKeys.length}`);

  const coSet = new Set(listing.distinctCoCodes);
  const groupSet = new Set(listing.distinctGroupCodes);
  const legalSet = new Set(legalKeys.keys());

  const txRows = txKeys.map((k) =>
    classifyTxBridge({
      txKey: k,
      officialCoCodes: coSet,
      officialGroupCodes: groupSet,
      legalInsurerKeys: legalSet,
    })
  );
  const flRows = flKeys.map((k) => classifyFlBridge({ flKey: k, officialCoCodes: coSet }));
  const allRows: CrosswalkRow[] = [...txRows, ...flRows];

  const txConfirmed = txRows.filter(productionBridgeAllowed);
  const txUnresolved = txRows.filter((r) => r.status === 'UNRESOLVED_NAIC_CROSSWALK');
  const txHolds = txRows.filter((r) => r.status === 'HOLD');
  const flConfirmed = flRows.filter(productionBridgeAllowed);
  const flReview = flRows.filter((r) => r.confidence === 'REVIEW_REQUIRED');
  const flUnresolved = flRows.filter((r) => r.status === 'UNRESOLVED_NAIC_CROSSWALK');
  const flHigh = flRows.filter((r) => r.confidence === 'HIGH_CONFIDENCE');

  if (txConfirmed.length !== 1510) throw new Error(`tx confirmed ${txConfirmed.length}`);
  if (txUnresolved.length !== 7) throw new Error(`tx unresolved ${txUnresolved.length}`);
  const unresolvedIds = txUnresolved.map((r) => r.rawStateIdentifier).sort();
  if (unresolvedIds.join(',') !== [...TX_UNRESOLVED_IDS].sort().join(',')) {
    throw new Error(`tx unresolved drift ${unresolvedIds.join(',')}`);
  }
  if (txHolds.length) throw new Error(`tx unexpected holds ${txHolds.length}`);
  if (flConfirmed.length !== 0) {
    throw new Error(`fl confirmed unexpected ${flConfirmed.length} without official same-record source`);
  }

  const predictedBridges = [...txConfirmed, ...flConfirmed];
  const byTarget = new Map<string, string[]>();
  for (const r of predictedBridges) {
    const t = r.targetLegalInsurerKey!;
    const list = byTarget.get(t) ?? [];
    list.push(r.appointerProvisionalKey);
    byTarget.set(t, list);
  }
  const collisions = {
    oneAppointerMultipleCoCodes: 0,
    multipleAppointersSameCoCode: [...byTarget.values()].filter((v) => v.length > 1).length,
    missingTargetLegalInsurer: allRows.filter((r) => r.holdReason === 'target_legal_insurer_missing_from_spine')
      .length,
    groupCompanyAmbiguity: allRows.filter((r) => r.holdReason === 'group_target_held_legal_insurer_preferred')
      .length,
    identifierFormatAnomalies: {
      txNotFiveDigit: txRows.filter((r) => r.rawStateIdentifier.length !== 5).length,
      flSixDigit: flRows.filter((r) => r.rawStateIdentifier.length === 6).length,
      flFiveDigit: flRows.filter((r) => r.rawStateIdentifier.length === 5).length,
    },
    flDigitCoincidence: flReview.length,
  };

  const canonical = {
    txConfirmedKeys: txConfirmed.map((r) => r.appointerProvisionalKey).sort(),
    txUnresolvedIds: unresolvedIds,
    flConfirmedKeys: flConfirmed.map((r) => r.appointerProvisionalKey).sort(),
    flReviewKeys: flReview.map((r) => r.appointerProvisionalKey).sort(),
  };
  const fp = fingerprint(canonical);

  const report = {
    task: CROSSWALK_TASK,
    runId,
    execute,
    at: new Date().toISOString(),
    transform: CROSSWALK_TRANSFORM,
    schema: { applied: false, alreadyPresent: true },
    publication: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishCarrier: mayPublishEntityKind('carrier'),
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
    },
    confirmedSignalsForbidden: confirmedMappingUsesNameAddressContactBrand() === false,
    baseline,
    source: {
      locProduct: NAIC_LOC_SOURCE.product,
      parserFingerprint: listing.fingerprint,
      zipSha256: zipSha,
    },
    tx: {
      appointers: txRows.length,
      confirmed: txConfirmed.length,
      unresolved: txUnresolved.length,
      unresolvedIds,
      holds: txHolds.length,
    },
    fl: {
      appointers: flRows.length,
      confirmed: flConfirmed.length,
      highConfidence: flHigh.length,
      reviewRequired: flReview.length,
      unresolved: flUnresolved.length,
      officialSameRecordNaicField: false,
      sourcesInvestigated: [
        'DFS All Active Appointments Individual/Business CSVs — Appointing Entity Number + Name only',
        'dfs_appointments staging — no NAIC column',
        'Official DFS glossary — Appointing Entity Number ≠ Florida Company Code ≠ NAIC Company Code',
        'OIR companysearch.floir.gov — Florida Company Code or NAIC Company Code (not DFS appointing number)',
        'No OIR/DFS bulk file in-repo with appointing_entity_number + NAIC on the same record',
      ],
    },
    predicted: {
      appointerResolvesTo: predictedBridges.length,
      newEntities: 0,
      newIdentifiers: 0,
      providerWrites: 0,
      usesBrand: 0,
    },
    collisions,
    fingerprint: fp,
    writes: { inserted: 0, skipped: 0 },
    after: {} as Record<string, unknown>,
    qa: {} as Record<string, unknown>,
    errors: [] as string[],
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'ins-nat-final-003-crosswalk.json'), JSON.stringify({ fingerprint: fp, rows: allRows }));
  writeFileSync(join(OUT, 'ins-nat-final-003-collision-census.json'), JSON.stringify({ task: CROSSWALK_TASK, collisions, at: report.at }, null, 2));

  if (!execute) {
    writeFileSync(join(OUT, 'ins-nat-final-003-dry-run.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, note: 'DRY-RUN only. Re-run with --execute.' }, null, 2));
    return;
  }

  const existing = await existingBridgeKeys(sb);
  const payloads: Array<Record<string, unknown>> = [];
  for (const row of predictedBridges) {
    const fromId = carrierKeys.get(row.appointerProvisionalKey);
    const toId = legalKeys.get(row.targetLegalInsurerKey!);
    if (!fromId || !toId) {
      report.errors.push(`missing entity ${row.appointerProvisionalKey}`);
      continue;
    }
    const sid = crosswalkSourceRecordId(row);
    const dedupe = `${fromId}|${toId}|${sid}`;
    if (existing.has(dedupe)) continue;
    existing.add(dedupe);
    payloads.push({
      from_entity_id: fromId,
      to_entity_id: toId,
      relationship_type: CARRIER_RELATIONSHIP_TYPE.APPOINTER_RESOLVES_TO,
      status: 'CONFIRMED',
      source_dataset: CROSSWALK_SOURCE_DATASET,
      source_record_id: sid,
      source_observed_at: CROSSWALK_OBSERVED_AT,
      raw: {
        task: CROSSWALK_TASK,
        transform: CROSSWALK_TRANSFORM,
        runId,
        identityConfidence: 'CONFIRMED',
        matchBasis: TX_MATCH_BASIS,
        tdiNaicId: row.rawStateIdentifier,
        locCoCode: row.targetNaic,
        tdiDataset: 'texas_tdi_individual_appointments',
        locProduct: NAIC_LOC_SOURCE.product,
        notNameMatch: true,
        notDigitCoincidence: true,
        notBrandRegex: true,
        notAddressPhoneEmail: true,
        appointerKeyUnchanged: true,
      },
    });
  }

  const wr = await insertRels(sb, payloads);
  report.writes = wr;

  report.after = {
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    agency: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    person: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    usesBrand: await count(sb, 'national_relationships', [['relationship_type', 'USES_BRAND']]),
    memberOfGroup: await count(sb, 'national_relationships', [
      ['relationship_type', 'MEMBER_OF_GROUP'],
    ]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
    fl: (await pageKeys(sb, 'carrier')).size,
  };

  const carrierAfter = await pageKeys(sb, 'carrier');
  let flAfter = 0;
  let txAfter = 0;
  for (const k of carrierAfter.keys()) {
    if (k.startsWith('carrier:fl-dfs:')) flAfter += 1;
    if (k.startsWith('carrier:tx-tdi-naic:')) txAfter += 1;
  }
  report.after.fl = flAfter;
  report.after.tx = txAfter;

  async function qaPair(fromKey: string, toKey: string) {
    const fromId = carrierKeys.get(fromKey);
    const toId = legalKeys.get(toKey);
    if (!fromId || !toId) return { found: false };
    const { data } = await sb
      .from('national_relationships')
      .select('id,relationship_type,status')
      .eq('from_entity_id', fromId)
      .eq('to_entity_id', toId)
      .eq('relationship_type', 'APPOINTER_RESOLVES_TO')
      .maybeSingle();
    return { found: Boolean(data), relationship_type: data?.relationship_type, status: data?.status };
  }

  report.qa = {
    tx60488: await qaPair('carrier:tx-tdi-naic:60488', 'legal-insurer:naic:60488'),
    tx19232: await qaPair('carrier:tx-tdi-naic:19232', 'legal-insurer:naic:19232'),
    tx73288: await qaPair('carrier:tx-tdi-naic:73288', 'legal-insurer:naic:73288'),
    tx65935: await qaPair('carrier:tx-tdi-naic:65935', 'legal-insurer:naic:65935'),
    txUnresolved14348: txUnresolved.some((r) => r.rawStateIdentifier === '14348'),
    flUnbridged02932: !(await qaPair('carrier:fl-dfs:02932', 'legal-insurer:naic:02932')).found,
    flCoincidence10003: flReview.some((r) => r.rawStateIdentifier === '10003'),
  };

  if (report.after.legalInsurer !== 6185) report.errors.push('legal changed');
  if (report.after.insuranceGroup !== 720) report.errors.push('groups changed');
  if (report.after.consumerBrand !== 14) report.errors.push('brands changed');
  if (report.after.agency !== 82071) report.errors.push('agencies changed');
  if (report.after.person !== 1029860) report.errors.push('persons changed');
  if (report.after.credentials !== 1531158) report.errors.push('credentials changed');
  if (report.after.providers !== 170499) report.errors.push('providers changed');
  if (report.after.fl !== 11944) report.errors.push('fl appointers changed');
  if (report.after.tx !== 1517) report.errors.push('tx appointers changed');
  if (report.after.usesBrand !== 0) report.errors.push('USES_BRAND');
  if (report.after.appointerResolvesTo !== predictedBridges.length && wr.inserted + wr.skipped !== predictedBridges.length) {
    /* after total should equal existing + new; first run existing 0 */
  }
  const expectedTotal = baseline.appointerResolvesTo + wr.inserted;
  if (report.after.appointerResolvesTo !== expectedTotal) {
    report.errors.push(
      `bridge total ${report.after.appointerResolvesTo} expected ${expectedTotal}`
    );
  }

  writeFileSync(join(OUT, 'ins-nat-final-003-execution.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
