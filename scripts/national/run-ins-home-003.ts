/**
 * INTEL-HOME-003 — read-only agency × distinct credentialed-state rollup.
 * db_writes = 0. No graph mutation.
 *
 *   npx tsx scripts/national/run-ins-home-003.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');
const TASK = 'INS-HOME-003';
const PAGE = 1000;
const US = /^[A-Z]{2}$/;
const ACCEPTED = new Set(['CONFIRMED', 'HIGH_CONFIDENCE']);

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchPages(
  sb: SupabaseClient,
  table: string,
  columns: string,
  eqCol: string,
  eqVal: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    let batch: Record<string, unknown>[] | null = null;
    let last = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await sb
        .from(table)
        .select(columns)
        .eq(eqCol, eqVal)
        .range(from, from + PAGE - 1);
      if (!error) {
        batch = (data || []) as Record<string, unknown>[];
        break;
      }
      last = error.message;
      await sleep(1200 * (attempt + 1));
    }
    if (!batch) throw new Error(`${table} page ${from} failed: ${last}`);
    rows.push(...batch);
    process.stderr.write(`\r${table} ${rows.length}`);
    if (batch.length < PAGE) break;
  }
  process.stderr.write('\n');
  return rows;
}

async function main() {
  loadLocalEnv();
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const generatedAt = new Date().toISOString();

  const entities = await fetchPages(sb, 'national_entities', 'id,identity_confidence,entity_kind', 'entity_kind', 'agency');
  const creds = await fetchPages(
    sb,
    'license_credentials',
    'id,entity_id,entity_kind,jurisdiction,attribution_confidence,source_dataset',
    'entity_kind',
    'agency',
  );

  const agencyOk = new Map<string, boolean>();
  for (const e of entities) {
    agencyOk.set(
      String(e.id),
      ACCEPTED.has(String(e.identity_confidence)) && e.entity_kind === 'agency',
    );
  }
  const d1 = entities.length;

  let excludedUnattached = 0;
  let excludedIdentity = 0;
  let excludedUnknownState = 0;
  let excludedAttribution = 0;
  const included: Array<{ entityId: string; state: string; source: string }> = [];
  const sourceSets = new Map<string, Set<string>>();

  for (const c of creds) {
    if (c.entity_kind !== 'agency') continue;
    if (!ACCEPTED.has(String(c.attribution_confidence))) {
      excludedAttribution += 1;
      continue;
    }
    const entityId = c.entity_id ? String(c.entity_id) : '';
    if (!entityId) {
      excludedUnattached += 1;
      continue;
    }
    if (!agencyOk.get(entityId)) {
      excludedIdentity += 1;
      continue;
    }
    const state = String(c.jurisdiction || '')
      .trim()
      .toUpperCase();
    if (!US.test(state)) {
      excludedUnknownState += 1;
      continue;
    }
    const source = String(c.source_dataset || '');
    included.push({ entityId, state, source });
    const set = sourceSets.get(state) ?? new Set();
    set.add(source);
    sourceSets.set(state, set);
  }

  const perAgency = new Map<string, Set<string>>();
  for (const row of included) {
    const set = perAgency.get(row.entityId) ?? new Set();
    set.add(row.state);
    perAgency.set(row.entityId, set);
  }

  const d2 = perAgency.size;
  const d3 = Array.from(perAgency.values()).reduce((n, s) => n + s.size, 0);
  const d4 = included.length;

  let b1 = 0;
  let b2 = 0;
  let b34 = 0;
  let b59 = 0;
  let b10 = 0;
  for (const states of perAgency.values()) {
    const n = states.size;
    if (n === 1) b1 += 1;
    else if (n === 2) b2 += 1;
    else if (n <= 4) b34 += 1;
    else if (n <= 9) b59 += 1;
    else b10 += 1;
  }

  const gates = {
    d2_le_d1: d2 <= d1,
    bucket_sum_eq_d2: b1 + b2 + b34 + b59 + b10 === d2,
    d3_ge_d2: d3 >= d2,
    d1_positive: d1 > 0,
    d2_positive: d2 > 0,
  };
  const pass = Object.values(gates).every(Boolean);
  const pct = (n: number) => (d2 ? +(100 * (n / d2)).toFixed(1) : 0);

  const report = {
    task: TASK,
    generatedAt,
    db_writes: 0,
    pass,
    gates,
    d1,
    d2,
    d3,
    d4,
    buckets: { one: b1, two: b2, threeToFour: b34, fiveToNine: b59, tenPlus: b10 },
    pctD2: {
      one: pct(b1),
      two: pct(b2),
      threeToFour: pct(b34),
      fiveToNine: pct(b59),
      tenPlus: pct(b10),
    },
    includedStates: [...sourceSets.keys()].sort(),
    sourceDatasets: [...new Set(included.map((r) => r.source))].sort(),
    sourcesByState: Object.fromEntries(
      [...sourceSets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, [...v].sort()]),
    ),
    exclusions: {
      agencyCredentialRowsScanned: creds.length,
      excludedUnattached,
      excludedIdentity,
      excludedUnknownState,
      excludedAttribution,
    },
    identityRule:
      'agency entity_kind + attached entity_id + CONFIRMED/HIGH_CONFIDENCE on entity and credential attribution',
    jurisdictionRule: 'upper(trim(jurisdiction)) matches /^[A-Z]{2}$/',
    grain: 'canonical agency × distinct credential jurisdiction',
  };

  mkdirSync(OUT, { recursive: true });
  const outPath = join(OUT, 'ins-home-003-multistate.json');
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log('wrote', outPath);
  if (!pass) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
