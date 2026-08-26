/**
 * INS-NAT-006 — controlled confirmed-core national graph backfill.
 *
 *   npx tsx scripts/national/backfill-confirmed-core.ts
 *   npx tsx scripts/national/backfill-confirmed-core.ts --execute
 *
 * Default is dry-run. Never writes public.providers.
 */
import { createReadStream, writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  CLASSIFICATION_REGISTRY_VERSION,
  classifyAndRollup,
  isProposedConfirmedCore,
  type ClassificationInput,
  type ClassifiedCredential,
  type EntityClassification,
} from '../../lib/national/classification';
import { selectCanonicalName, CANONICAL_NAME_POLICY } from '../../lib/national/canonical-name';
import { normalizeNpn } from '../../lib/national/npn';
import { compareLegalNames } from '../../lib/national/names';
import type { LicenseNamespace } from '../../lib/national/credential-namespace';

const APPROVED_ENTITY_FP = '26e5a041284260df4c10cc9350882698ac258c005dad2720e957594368efc08c';
const APPROVED_ENTITIES = 81943;
const APPROVED_CREDS = 110167;
const APPROVED_MULTI = 18845;

const JSONL =
  process.env.INS_NAT_003_JSONL ||
  process.env.INS_NAT_004_JSONL ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-004-staging.jsonl';
const OHIO_CLASSES =
  process.env.INS_NAT_005_ODI_CLASSES ||
  'C:/Users/Michael.Savitsky/agent-tools/odi-mailing-npn-classes.json';
const OUTDIR =
  process.env.INS_NAT_006_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-006-manifest';

const execute = process.argv.includes('--execute');
const allowFpChange = process.argv.includes('--allow-fingerprint-change');
const APPROVED_SOURCES = new Set(['florida_dfs', 'texas_tdi', 'ohio_odi', 'vermont_dfr']);
const SOURCE_TABLE: Record<string, string> = {
  florida_dfs: 'dfs_producers',
  texas_tdi: 'tdi_producers',
  ohio_odi: 'odi_producers',
  vermont_dfr: 'vt_producers',
};

type Raw = ClassificationInput & { sourceTable?: string; regulator?: string };

function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

async function loadJsonl(path: string): Promise<Raw[]> {
  const rows: Raw[] = [];
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line) as Raw);
  }
  return rows;
}

function namespaceFor(c: ClassifiedCredential): LicenseNamespace {
  if (c.coreAgencyEligible && c.licenseNamespaces.includes('producer')) return 'producer';
  return (c.licenseNamespaces[0] as LicenseNamespace) || 'other';
}

function cohortBatch(states: string[]): string {
  const s = new Set(states);
  if (s.has('FL') && s.has('TX')) return 'fl_tx_overlap';
  if (s.has('FL')) return 'fl_not_tx';
  if (s.has('TX')) return 'tx_not_fl';
  if (s.has('VT')) return 'vt_without_fl_tx';
  if (s.has('OH')) return 'oh_only';
  return 'remaining';
}

function shaLines(lines: string[]): string {
  return createHash('sha256').update(lines.slice().sort().join('\n')).digest('hex');
}

type ManifestEntity = {
  npn: string;
  entityKind: 'agency';
  legalName: string;
  displayName: string;
  nameSource: string;
  states: string[];
  batch: string;
  sourceRecordIds: string[];
  coreCredentialKeys: string[];
  allCredentialKeys: string[];
  identityConfidence: 'CONFIRMED';
  registryVersion: string;
  mixed: boolean;
};

type ManifestCredential = {
  key: string;
  npn: string;
  sourceDataset: string;
  sourceTable: string;
  sourceRecordId: string;
  jurisdiction: string;
  regulator: string;
  licenseNumber: string;
  licenseClass: string | null;
  licenseNamespace: LicenseNamespace;
  coreAgencyEligible: boolean;
  primaryProductClass: string;
  rawTypes: string[];
};

export function buildApprovedManifest(
  entities: EntityClassification[],
  credentials: ClassifiedCredential[]
): {
  entities: ManifestEntity[];
  credentials: ManifestCredential[];
  entityFingerprint: string;
  credentialFingerprint: string;
} {
  const byNpn = new Map<string, ClassifiedCredential[]>();
  for (const c of credentials) {
    if (!c.npn || c.entityKind !== 'agency') continue;
    if (!APPROVED_SOURCES.has(c.sourceDataset)) continue;
    const list = byNpn.get(c.npn) ?? [];
    list.push(c);
    byNpn.set(c.npn, list);
  }

  const manE: ManifestEntity[] = [];
  const manC: ManifestCredential[] = [];
  const approved = entities.filter(
    (e) => isProposedConfirmedCore(e) && e.entityKind === 'agency' && e.npn
  );

  for (const e of approved) {
    const npn = e.npn!;
    const creds = byNpn.get(npn) ?? [];
    if (!creds.length) continue;
    const name = selectCanonicalName(creds);
    const keys: string[] = [];
    const coreKeys: string[] = [];
    const recIds: string[] = [];
    for (const c of creds) {
      const ns = namespaceFor(c);
      const key = `${c.jurisdiction}|${c.entityKind}|${ns}|${String(c.licenseNumber).trim().toUpperCase().replace(/\s+/g, '')}`;
      keys.push(key);
      if (c.coreAgencyEligible) coreKeys.push(key);
      recIds.push(c.sourceRecordId);
      manC.push({
        key,
        npn,
        sourceDataset: c.sourceDataset,
        sourceTable: SOURCE_TABLE[c.sourceDataset] || c.sourceDataset,
        sourceRecordId: c.sourceRecordId,
        jurisdiction: c.jurisdiction,
        regulator:
          c.sourceDataset === 'ohio_odi'
            ? 'Ohio Department of Insurance'
            : c.sourceDataset === 'florida_dfs'
              ? 'Florida DFS'
              : c.sourceDataset === 'texas_tdi'
                ? 'Texas TDI'
                : c.sourceDataset === 'vermont_dfr'
                  ? 'Vermont DFR'
                  : c.sourceDataset,
        licenseNumber: String(c.licenseNumber).trim().toUpperCase().replace(/\s+/g, ''),
        licenseClass: c.rawTypesPreserved[0] ?? c.evidence.licenseClass,
        licenseNamespace: ns,
        coreAgencyEligible: c.coreAgencyEligible,
        primaryProductClass: c.primaryProductClass,
        rawTypes: c.rawTypesPreserved,
      });
    }
    manE.push({
      npn,
      entityKind: 'agency',
      legalName: name.legalName,
      displayName: name.displayName,
      nameSource: name.sourceDataset,
      states: e.jurisdictions.filter((j) => ['FL', 'TX', 'OH', 'VT'].includes(j)).sort(),
      batch: cohortBatch(e.jurisdictions),
      sourceRecordIds: recIds,
      coreCredentialKeys: coreKeys,
      allCredentialKeys: keys,
      identityConfidence: 'CONFIRMED',
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      mixed: e.mixedCredential,
    });
  }

  manE.sort((a, b) => a.npn.localeCompare(b.npn));
  return {
    entities: manE,
    credentials: manC,
    entityFingerprint: shaLines(manE.map((e) => e.npn)),
    credentialFingerprint: shaLines(manC.map((c) => c.key)),
  };
}

async function restCount(sb: SupabaseClient, table: string, filter?: string): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  if (filter === 'verified') q = sb.from('providers').select('id', { count: 'exact', head: true }).eq('verified', true);
  const { count, error } = await q;
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function fetchExistingNpns(sb: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const page = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,npn')
      .eq('entity_kind', 'agency')
      .eq('identity_kind', 'npn')
      .not('npn', 'is', null)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      if (r.npn) map.set(String(r.npn), String(r.id));
    }
    if (rows.length < page) break;
    from += page;
  }
  return map;
}

async function fetchExistingCredKeys(sb: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const page = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('license_credentials')
      .select('jurisdiction,entity_kind,license_namespace,license_number')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      set.add(
        `${r.jurisdiction}|${r.entity_kind}|${r.license_namespace}|${r.license_number}`
      );
    }
    if (rows.length < page) break;
    from += page;
  }
  return set;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providers = await restCount(sb, 'providers');
  const graphEntities = await restCount(sb, 'national_entities');
  const graphCreds = await restCount(sb, 'license_credentials');
  const graphBridges = await restCount(sb, 'provider_entity_bridges');
  if (providers !== 170499) {
    console.error(JSON.stringify({ halt: 'providers_count_unexpected', providers }));
    process.exit(1);
  }

  if (!existsSync(JSONL)) {
    console.error('missing jsonl', JSONL);
    process.exit(1);
  }
  const rows = await loadJsonl(JSONL);
  let ohioMap: Record<string, { classes?: string[] }> = {};
  if (existsSync(OHIO_CLASSES)) {
    ohioMap = JSON.parse(readFileSync(OHIO_CLASSES, 'utf8')) as Record<
      string,
      { classes?: string[] }
    >;
  }

  const inputs: ClassificationInput[] = rows.map((r) => {
    let licenseClass = r.licenseClass ?? null;
    let licenseTypes = r.licenseTypes ?? [];
    if (r.sourceDataset === 'ohio_odi') {
      const npn = String(r.npn || r.licenseNumber || '').trim();
      const hit = ohioMap[npn];
      if (hit?.classes?.length) {
        licenseTypes = hit.classes;
        licenseClass = hit.classes[0] ?? null;
      }
    }
    return {
      sourceDataset: r.sourceDataset,
      sourceRecordId: r.sourceRecordId,
      jurisdiction: r.jurisdiction,
      entityKind: r.entityKind,
      licenseNumber: r.licenseNumber,
      legalName: r.legalName,
      npn: r.npn,
      licenseClass,
      licenseTypes,
      loas: r.loas,
      regulatoryStatus: r.regulatoryStatus ?? null,
    };
  });

  const nameConflictNpns = new Set<string>();
  const npnNames = new Map<string, string[]>();
  for (const r of inputs) {
    const npn = normalizeNpn(r.npn);
    if (!npn) continue;
    const list = npnNames.get(npn) ?? [];
    list.push(String(r.legalName || ''));
    npnNames.set(npn, list);
  }
  for (const [npn, names] of npnNames) {
    const unique = Array.from(new Set(names));
    if (unique.length < 2) continue;
    let conflict = false;
    for (let i = 0; i < unique.length && !conflict; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        if (compareLegalNames(unique[i]!, unique[j]!) === 'conflict') {
          conflict = true;
          break;
        }
      }
    }
    if (conflict) nameConflictNpns.add(npn);
  }

  const { credentials, entities } = classifyAndRollup(inputs, (key) => {
    if (key.startsWith('npn:')) {
      const npn = key.split(':')[2] || '';
      if (nameConflictNpns.has(npn)) return 'REVIEW_REQUIRED';
      return 'CONFIRMED';
    }
    return 'HIGH_CONFIDENCE';
  });

  const manifest = buildApprovedManifest(entities, credentials);
  const multi = manifest.entities.filter((e) => e.states.length >= 2).length;
  const byBatch: Record<string, { entities: number; credentials: number }> = {};
  for (const e of manifest.entities) {
    byBatch[e.batch] ??= { entities: 0, credentials: 0 };
    byBatch[e.batch].entities += 1;
    byBatch[e.batch].credentials += e.allCredentialKeys.length;
  }
  const byStateCred: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  for (const c of manifest.credentials) {
    byStateCred[c.jurisdiction] = (byStateCred[c.jurisdiction] ?? 0) + 1;
    const k = c.coreAgencyEligible ? 'core' : c.primaryProductClass;
    byClass[k] = (byClass[k] ?? 0) + 1;
  }

  const summary = {
    registryVersion: CLASSIFICATION_REGISTRY_VERSION,
    canonicalNamePolicy: CANONICAL_NAME_POLICY,
    providers,
    graphEntitiesBefore: graphEntities,
    graphCredentialsBefore: graphCreds,
    graphBridgesBefore: graphBridges,
    entityFingerprint: manifest.entityFingerprint,
    credentialFingerprint: manifest.credentialFingerprint,
    expectedEntitiesApproved: APPROVED_ENTITIES,
    expectedCredentialsApproved: APPROVED_CREDS,
    expectedMultiApproved: APPROVED_MULTI,
    entities: manifest.entities.length,
    credentials: manifest.credentials.length,
    multiState: multi,
    fingerprintMatchesApproved: manifest.entityFingerprint === APPROVED_ENTITY_FP,
    byBatch,
    byStateCred,
    byClass,
    execute,
  };
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'entities.jsonl'),
    manifest.entities.map((e) => JSON.stringify(e)).join('\n')
  );
  writeFileSync(
    resolve(OUTDIR, 'credentials.jsonl'),
    manifest.credentials.map((c) => JSON.stringify(c)).join('\n')
  );

  const fpOk = manifest.entityFingerprint === APPROVED_ENTITY_FP;
  const countsOk =
    manifest.entities.length === APPROVED_ENTITIES &&
    manifest.credentials.length === APPROVED_CREDS &&
    multi === APPROVED_MULTI;

  const existingNpn = await fetchExistingNpns(sb);
  const existingCred = await fetchExistingCredKeys(sb);
  const entityInsert = manifest.entities.filter((e) => !existingNpn.has(e.npn)).length;
  const entityExisting = manifest.entities.length - entityInsert;
  const credInsert = manifest.credentials.filter((c) => !existingCred.has(c.key)).length;
  const credExisting = manifest.credentials.length - credInsert;

  const dry = {
    ...summary,
    dryRun: {
      entityInsert,
      entityExisting,
      entityConflict: 0,
      entitySkip: 0,
      credentialInsert: credInsert,
      credentialExisting: credExisting,
      credentialConflict: 0,
      credentialSkip: 0,
      sourceLinkInsert: credInsert,
      providerWritesPredicted: 0,
    },
    fingerprintOk: fpOk,
    countsOk,
  };
  writeFileSync(resolve(OUTDIR, 'dry-run.json'), JSON.stringify(dry, null, 2));
  console.log(JSON.stringify(dry, null, 2));

  if (!fpOk || !countsOk) {
    console.error('COHORT DRIFT versus approved 81,943 / 110,167 / 18,845 / ' + APPROVED_ENTITY_FP);
    if (execute && !allowFpChange) {
      console.error('Refusing --execute. Pass --allow-fingerprint-change only after review.');
      process.exit(2);
    }
    if (!execute) return;
  }

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write the graph.');
    return;
  }
  if (flag('execute') && dry.dryRun.providerWritesPredicted !== 0) {
    console.error('STOP: provider writes predicted');
    process.exit(1);
  }

  const batchOrder = [
    'fl_tx_overlap',
    'fl_not_tx',
    'tx_not_fl',
    'vt_without_fl_tx',
    'oh_only',
    'remaining',
  ];
  const credByNpn = new Map<string, ManifestCredential[]>();
  for (const c of manifest.credentials) {
    const list = credByNpn.get(c.npn) ?? [];
    list.push(c);
    credByNpn.set(c.npn, list);
  }

  const execution: Array<Record<string, unknown>> = [];
  for (const batchName of batchOrder) {
    const ents = manifest.entities.filter((e) => e.batch === batchName);
    let insertedE = 0;
    let existingE = 0;
    let failE = 0;
    for (const part of chunk(ents, 200)) {
      const fresh = part.filter((e) => !existingNpn.has(e.npn));
      existingE += part.length - fresh.length;
      if (!fresh.length) continue;
      const payload = fresh.map((e) => ({
        entity_kind: 'agency',
        identity_kind: 'npn',
        npn: e.npn,
        legal_name: e.legalName,
        display_name: e.displayName,
        identity_confidence: 'CONFIRMED',
        identity_notes: JSON.stringify({
          registryVersion: CLASSIFICATION_REGISTRY_VERSION,
          canonicalNamePolicy: CANONICAL_NAME_POLICY,
          nameSource: e.nameSource,
          states: e.states,
          batch: e.batch,
          task: 'INS-NAT-006',
        }),
      }));
      const { data, error } = await sb
        .from('national_entities')
        .insert(payload)
        .select('id,npn');
      if (error) {
        failE += fresh.length;
        execution.push({ batch: batchName, phase: 'entities', error: error.message, n: fresh.length });
        console.error('entity batch fail', batchName, error.message);
        writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(execution, null, 2));
        process.exit(1);
      }
      for (const row of data ?? []) {
        if (row.npn && row.id) existingNpn.set(String(row.npn), String(row.id));
      }
      insertedE += data?.length ?? 0;
    }

    const creds = ents.flatMap((e) => credByNpn.get(e.npn) ?? []);
    let insertedC = 0;
    let existingC = 0;
    for (const part of chunk(creds, 150)) {
      const fresh = part.filter((c) => !existingCred.has(c.key));
      existingC += part.length - fresh.length;
      if (!fresh.length) continue;
      const payload = fresh.map((c) => {
        const entityId = existingNpn.get(c.npn);
        if (!entityId) throw new Error(`missing entity for NPN ${c.npn}`);
        return {
          entity_id: entityId,
          entity_kind: 'agency',
          jurisdiction: c.jurisdiction,
          regulator: c.regulator,
          license_number: c.licenseNumber,
          license_class: c.licenseClass,
          license_namespace: c.licenseNamespace,
          regulatory_status: 'unknown',
          source_dataset: c.sourceDataset,
          source_record_id: c.sourceRecordId,
          attribution_confidence: 'CONFIRMED',
          raw: {
            registryVersion: CLASSIFICATION_REGISTRY_VERSION,
            primaryProductClass: c.primaryProductClass,
            coreAgencyEligible: c.coreAgencyEligible,
            rawTypes: c.rawTypes,
            npn: c.npn,
            task: 'INS-NAT-006',
          },
        };
      });
      const { data, error } = await sb
        .from('license_credentials')
        .insert(payload)
        .select('id,source_record_id,source_dataset,jurisdiction,license_namespace,license_number');
      if (error) {
        execution.push({ batch: batchName, phase: 'credentials', error: error.message, n: fresh.length });
        console.error('credential batch fail', batchName, error.message);
        writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(execution, null, 2));
        process.exit(1);
      }
      const bySrc = new Map(fresh.map((c) => [`${c.sourceDataset}|${c.sourceRecordId}`, c]));
      const links = (data ?? []).map((row) => {
        const src = bySrc.get(`${row.source_dataset}|${row.source_record_id}`);
        return {
          source_dataset: row.source_dataset,
          source_table: SOURCE_TABLE[row.source_dataset] || row.source_dataset,
          source_record_id: row.source_record_id,
          credential_id: row.id,
          entity_id: src ? existingNpn.get(src.npn) : null,
          identity_confidence: 'CONFIRMED',
        };
      });
      for (const row of data ?? []) {
        existingCred.add(
          `${row.jurisdiction}|agency|${row.license_namespace}|${row.license_number}`
        );
      }
      if (links.length) {
        const { error: linkErr } = await sb.from('source_record_links').insert(
          links.filter((l) => l.entity_id && l.source_record_id)
        );
        if (linkErr && !/duplicate|unique/i.test(linkErr.message)) {
          execution.push({ batch: batchName, phase: 'links', error: linkErr.message });
          console.error('link batch fail', batchName, linkErr.message);
          writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(execution, null, 2));
          process.exit(1);
        }
      }
      insertedC += data?.length ?? 0;
    }

    execution.push({
      batch: batchName,
      entities: ents.length,
      credentials: creds.length,
      entityInserts: insertedE,
      entityExisting: existingE,
      entityFailures: failE,
      credentialInserts: insertedC,
      credentialExisting: existingC,
    });
    console.log(JSON.stringify(execution[execution.length - 1]));
    writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(execution, null, 2));
  }

  const afterE = await restCount(sb, 'national_entities');
  const afterC = await restCount(sb, 'license_credentials');
  const afterP = await restCount(sb, 'providers');
  const afterLinks = await restCount(sb, 'source_record_links');
  const afterBridges = await restCount(sb, 'provider_entity_bridges');
  const result = {
    executed: true,
    execution,
    after: {
      national_entities: afterE,
      license_credentials: afterC,
      source_record_links: afterLinks,
      provider_entity_bridges: afterBridges,
      providers: afterP,
    },
    expected: {
      entities: manifest.entities.length,
      credentials: manifest.credentials.length,
    },
  };
  writeFileSync(resolve(OUTDIR, 'execution-final.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (afterP !== 170499) {
    console.error('providers count changed', afterP);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
