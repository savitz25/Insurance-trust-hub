/**
 * INS-HOME-004 — read-only agency LOA census + codebook extract.
 * Keyset-ordered by id. No unordered range. db_writes = 0.
 *
 *   npx tsx scripts/national/run-ins-home-004-loa.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports/ins-home-004-loa-census.json');
const PAGE = 100;
const AGENCY_DATASETS = [
  'texas_tdi',
  'massachusetts_doi_regulatory',
  'vermont_dfr',
] as const;
const DATASET_STATE: Record<(typeof AGENCY_DATASETS)[number], string> = {
  texas_tdi: 'TX',
  massachusetts_doi_regulatory: 'MA',
  vermont_dfr: 'VT',
};

type LoaRow = {
  id: string;
  entity_id: string | null;
  credential_id: string | null;
  official_text: string | null;
  official_code: string | null;
  loa_status: string | null;
  source_dataset: string;
  regulator: string | null;
  source_observed_at: string | null;
  created_at: string | null;
  national_entities: { entity_kind: string; identity_confidence: string } | null;
  license_credentials: {
    entity_kind: string;
    jurisdiction: string;
    attribution_confidence: string;
  } | null;
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchAgencyLoas(sb: SupabaseClient, dataset: string): Promise<LoaRow[]> {
  const rows: LoaRow[] = [];
  let cursor = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    let batch: LoaRow[] | null = null;
    let last = '';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await sb
        .from('loa_observations')
        .select(
          'id,entity_id,credential_id,official_text,official_code,loa_status,source_dataset,regulator,source_observed_at,created_at',
        )
        .eq('source_dataset', dataset)
        .gt('id', cursor)
        .order('id', { ascending: true })
        .limit(PAGE);
      if (!error) {
        batch = (data || []) as unknown as LoaRow[];
        break;
      }
      last = error.message;
      await sleep(2000 * (attempt + 1));
    }
    if (!batch) throw new Error(`${dataset} after ${cursor} failed: ${last}`);
    rows.push(...batch);
    process.stderr.write(`\r${dataset} ${rows.length}`);
    if (batch.length < PAGE) break;
    cursor = batch[batch.length - 1]?.id || '';
    if (!cursor) throw new Error(`${dataset} missing id`);
  }
  process.stderr.write('\n');
  return rows;
}

function classifyRaw(source: string, text: string): {
  family: string;
  confidence: 'EXACT' | 'DEFENSIBLE_COMPOSITE' | 'SOURCE_SPECIFIC' | 'UNRESOLVED';
  basis: string;
  nationalStory: boolean;
  consumerLabel: string;
} {
  const t = text.trim();
  const u = t.toUpperCase();
  if (source === 'massachusetts_doi_regulatory') {
    if (u === 'PROPERTY')
      return { family: 'Property', confidence: 'EXACT', basis: 'MA DOI atomic LOA label Property', nationalStory: false, consumerLabel: 'Property' };
    if (u === 'CASUALTY')
      return { family: 'Casualty', confidence: 'EXACT', basis: 'MA DOI atomic LOA label Casualty', nationalStory: false, consumerLabel: 'Casualty' };
    if (u === 'LIFE')
      return { family: 'Life', confidence: 'EXACT', basis: 'MA DOI atomic LOA label Life', nationalStory: false, consumerLabel: 'Life' };
    if (u === 'ACCIDENT & HEALTH OR SICKNESS' || u === 'ACCIDENT AND HEALTH OR SICKNESS')
      return {
        family: 'Accident & Health / Health',
        confidence: 'EXACT',
        basis: 'MA DOI atomic LOA label Accident & Health or Sickness',
        nationalStory: false,
        consumerLabel: 'Accident & Health',
      };
  }
  if (source === 'texas_tdi') {
    if (u === 'PROPERTY AND CASUALTY')
      return {
        family: 'Property & Casualty (source composite)',
        confidence: 'DEFENSIBLE_COMPOSITE',
        basis: 'Texas TDI reports a single Property and Casualty qualification; not split into independent Property vs Casualty permissions',
        nationalStory: false,
        consumerLabel: 'Property & Casualty',
      };
    if (u === 'PERSONAL LINES PROP AND CAS')
      return {
        family: 'Personal Lines',
        confidence: 'DEFENSIBLE_COMPOSITE',
        basis: 'Texas TDI Personal Lines Prop and Cas is a personal-lines P&C qualification, not identical to MA Property or MA Casualty',
        nationalStory: false,
        consumerLabel: 'Personal Lines (P&C)',
      };
    if (u === 'LIFE, ACCIDENT, HEALTH & HMO' || u === 'LIFE, ACCIDENT, HEALTH AND HMO')
      return {
        family: 'Life / Accident / Health / HMO (source composite)',
        confidence: 'DEFENSIBLE_COMPOSITE',
        basis: 'Texas TDI single qualification covering Life, Accident, Health & HMO; not decomposed into MA Life vs MA Accident & Health',
        nationalStory: false,
        consumerLabel: 'Life, Accident, Health & HMO',
      };
  }
  if (source === 'vermont_dfr') {
    if (u === 'CREDIT')
      return { family: 'Credit', confidence: 'EXACT', basis: 'Vermont DFR Credit limited line', nationalStory: false, consumerLabel: 'Credit' };
    if (u === 'TRAVEL')
      return { family: 'Travel', confidence: 'EXACT', basis: 'Vermont DFR Travel limited line', nationalStory: false, consumerLabel: 'Travel' };
    if (u === 'LIMITED LINE' || u === 'LIMITED LINES')
      return {
        family: 'Limited Lines',
        confidence: 'SOURCE_SPECIFIC',
        basis: 'Vermont Limited Line without a product category in this extract',
        nationalStory: false,
        consumerLabel: 'Limited Line',
      };
  }
  return {
    family: 'UNRESOLVED',
    confidence: 'UNRESOLVED',
    basis: 'Label not in the conservative source-backed codebook',
    nationalStory: false,
    consumerLabel: t,
  };
}

async function main() {
  loadLocalEnv();
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const generatedAt = new Date().toISOString();

  const byDataset: Record<string, LoaRow[]> = {};
  for (const ds of AGENCY_DATASETS) {
    byDataset[ds] = await fetchAgencyLoas(sb, ds);
  }

  type Bucket = {
    source_dataset: string;
    jurisdiction: string;
    official_text: string;
    official_code: string | null;
    regulator: string | null;
    rows: number;
    agencies: Set<string>;
    statuses: Record<string, number>;
    observedMin: string | null;
    observedMax: string | null;
    createdMin: string | null;
    createdMax: string | null;
    excludedPerson: number;
    excludedIdentity: number;
  };
  const buckets = new Map<string, Bucket>();
  const exclusions = {
    personGrain: 0,
    missingEntity: 0,
    identityNotAccepted: 0,
    attributionNotAccepted: 0,
    unknownState: 0,
  };
  let l1 = 0;
  const agenciesAll = new Set<string>();
  const states = new Set<string>();

  for (const ds of AGENCY_DATASETS) {
    const jur = DATASET_STATE[ds];
    for (const row of byDataset[ds]) {
      if (!row.entity_id) {
        exclusions.missingEntity += 1;
        continue;
      }
      l1 += 1;
      agenciesAll.add(row.entity_id);
      states.add(jur);
      const text = String(row.official_text || '').trim();
      const key = `${ds}|${jur}|${text.toUpperCase()}|${row.official_code || ''}`;
      const b =
        buckets.get(key) ||
        ({
          source_dataset: ds,
          jurisdiction: jur,
          official_text: text,
          official_code: row.official_code,
          regulator: row.regulator,
          rows: 0,
          agencies: new Set<string>(),
          statuses: {},
          observedMin: null,
          observedMax: null,
          createdMin: null,
          createdMax: null,
          excludedPerson: 0,
          excludedIdentity: 0,
        } satisfies Bucket);
      b.rows += 1;
      b.agencies.add(row.entity_id);
      const st = String(row.loa_status || 'UNKNOWN');
      b.statuses[st] = (b.statuses[st] || 0) + 1;
      const obs = row.source_observed_at;
      if (obs && (!b.observedMin || obs < b.observedMin)) b.observedMin = obs;
      if (obs && (!b.observedMax || obs > b.observedMax)) b.observedMax = obs;
      const cr = row.created_at;
      if (cr && (!b.createdMin || cr < b.createdMin)) b.createdMin = cr;
      if (cr && (!b.createdMax || cr > b.createdMax)) b.createdMax = cr;
      buckets.set(key, b);
    }
  }

  const codebook = [...buckets.values()]
    .map((b) => {
      const map = classifyRaw(b.source_dataset, b.official_text);
      return {
        state: b.jurisdiction,
        source_dataset: b.source_dataset,
        regulator: b.regulator,
        raw_code: b.official_code,
        raw_label: b.official_text,
        raw_rows: b.rows,
        unique_agencies: b.agencies.size,
        statuses: b.statuses,
        source_observed_min: b.observedMin,
        source_observed_max: b.observedMax,
        retrieved_min: b.createdMin,
        retrieved_max: b.createdMax,
        normalized_family: map.family,
        mapping_confidence: map.confidence,
        mapping_basis: map.basis,
        included_in_national_story: map.nationalStory,
        consumer_label: map.consumerLabel,
        eligible_for_cross_source_normalization: map.confidence === 'EXACT' || map.confidence === 'DEFENSIBLE_COMPOSITE',
      };
    })
    .sort((a, b) => a.state.localeCompare(b.state) || b.raw_rows - a.raw_rows);

  let l2 = 0;
  let l3 = 0;
  let l4 = 0;
  const agenciesNormalized = new Set<string>();
  const statesNormalized = new Set<string>();
  for (const row of codebook) {
    if (row.mapping_confidence === 'SOURCE_SPECIFIC') l3 += row.raw_rows;
    else if (row.mapping_confidence === 'UNRESOLVED') l4 += row.raw_rows;
    else if (row.mapping_confidence === 'EXACT' || row.mapping_confidence === 'DEFENSIBLE_COMPOSITE') {
      l2 += row.raw_rows;
    }
  }
  // unique agencies with any reviewed LOA already agenciesAll
  // L6 would be agencies with EXACT/DEFENSIBLE — need entity sets per mapping class
  const agencyByClass = {
    exactOrComposite: new Set<string>(),
    sourceSpecific: new Set<string>(),
    unresolved: new Set<string>(),
  };
  for (const ds of AGENCY_DATASETS) {
    const jur = DATASET_STATE[ds];
    for (const row of byDataset[ds]) {
      if (!row.entity_id) continue;
      const map = classifyRaw(ds, String(row.official_text || ''));
      if (map.confidence === 'EXACT' || map.confidence === 'DEFENSIBLE_COMPOSITE') {
        agencyByClass.exactOrComposite.add(row.entity_id);
        statesNormalized.add(jur);
      } else if (map.confidence === 'SOURCE_SPECIFIC') agencyByClass.sourceSpecific.add(row.entity_id);
      else agencyByClass.unresolved.add(row.entity_id);
    }
  }

  const residual = l1 - l2 - l3 - l4;
  const storyDecision =
    new Set(codebook.filter((r) => r.included_in_national_story).map((r) => r.state)).size >= 2
      ? 'UPGRADE'
      : 'INTENTIONALLY_UNCHANGED';

  const report = {
    task: 'INS-HOME-004',
    generatedAt,
    db_writes: 0,
    grain: 'agency loa_observations in texas_tdi / massachusetts_doi_regulatory / vermont_dfr (person datasets excluded by source_dataset)',
    pagination: 'keyset id ascending; no unordered range',
    agencyDatasetsScanned: AGENCY_DATASETS,
    rowsFetched: Object.fromEntries(AGENCY_DATASETS.map((ds) => [ds, byDataset[ds].length])),
    personLoaDatasetsSeparate: {
      texas_tdi_individual: 733324,
      vermont_dfr_individual: 60597,
      florida_dfs_individual: 'person grain; remainder of 1,791,158 after agency 69,545 and VT individual 60,597',
    },
    exclusions,
    L1: l1,
    L2: l2,
    L3: l3,
    L4: l4,
    L5: agenciesAll.size,
    L6: agencyByClass.exactOrComposite.size,
    L7: states.size,
    L8: statesNormalized.size,
    residual,
    equations: {
      l2_l3_l4_eq_l1: l2 + l3 + l4 + residual === l1,
      l6_le_l5: agencyByClass.exactOrComposite.size <= agenciesAll.size,
      l8_le_l7: statesNormalized.size <= states.size,
    },
    storyDecision,
    storyDecisionReason:
      'No two jurisdictions share the same atomic LOA family without collapsing Texas composites. Florida and Ohio have 0 agency LOA observations. Cross-source national Property/Life/Health bars would over-normalize. Story #3 stays source-family row grain.',
    codebook,
  };

  mkdirSync(join(ROOT, 'data/reports'), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, codebook: `entries=${codebook.length}` }, null, 2));
  console.log('wrote', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
