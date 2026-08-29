/**
 * INS-HOME-003B — read-only Postgres lock of agency × distinct-state rollup.
 * Grouping happens in SQL. db_writes = 0.
 *
 *   npx tsx scripts/national/run-ins-home-003b-sql.ts
 *
 * Requires DATABASE_URL (session or transaction pooler). Does not create
 * functions, views, or migrations. Homepage is not updated by this script.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Client } from 'pg';
import { loadLocalEnv } from '../lib/load-local-env';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports/ins-home-003b-sql-lock.json');
const ACCEPTED_SOURCES = [
  'florida_dfs',
  'texas_tdi',
  'vermont_dfr',
  'massachusetts_doi_regulatory',
  'ohio_odi',
] as const;

const EXTRA_SOURCE_SQL = `
SELECT
  c.source_dataset,
  upper(trim(c.jurisdiction)) AS jurisdiction,
  COUNT(*)::bigint AS credential_rows
FROM license_credentials c
WHERE c.entity_kind = 'agency'
  AND c.entity_id IS NOT NULL
  AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
  AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
  AND c.source_dataset NOT IN (${ACCEPTED_SOURCES.map((s) => `'${s}'`).join(', ')})
GROUP BY 1, 2
ORDER BY 1, 2`;

const SOURCE_CENSUS_SQL = `
SELECT
  c.source_dataset,
  upper(trim(c.jurisdiction)) AS jurisdiction,
  c.entity_kind::text AS entity_kind,
  COUNT(*)::bigint AS credential_rows,
  COUNT(DISTINCT c.entity_id)::bigint AS unique_entities
FROM license_credentials c
INNER JOIN national_entities e ON e.id = c.entity_id
WHERE c.entity_kind = 'agency'
  AND e.entity_kind = 'agency'
  AND c.entity_id IS NOT NULL
  AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
  AND e.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
  AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
GROUP BY c.source_dataset, upper(trim(c.jurisdiction)), c.entity_kind
ORDER BY jurisdiction, source_dataset`;

const D1_SQL = `
SELECT COUNT(*)::bigint AS d1
FROM national_entities
WHERE entity_kind = 'agency'`;

const D1_ACCEPTED_SQL = `
SELECT COUNT(*)::bigint AS d1_accepted
FROM national_entities
WHERE entity_kind = 'agency'
  AND identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')`;

const LOCK_SQL = `
WITH eligible AS (
  SELECT
    c.entity_id,
    upper(trim(c.jurisdiction)) AS jurisdiction
  FROM license_credentials c
  INNER JOIN national_entities e ON e.id = c.entity_id
  WHERE c.entity_kind = 'agency'
    AND e.entity_kind = 'agency'
    AND c.entity_id IS NOT NULL
    AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND e.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
    AND c.source_dataset IN (${ACCEPTED_SOURCES.map((s) => `'${s}'`).join(', ')})
),
agency_states AS (
  SELECT
    entity_id,
    COUNT(DISTINCT jurisdiction) AS state_count
  FROM eligible
  GROUP BY entity_id
),
pairs AS (
  SELECT DISTINCT entity_id, jurisdiction
  FROM eligible
),
summary AS (
  SELECT
    COUNT(*)::bigint AS d2,
    COUNT(*) FILTER (WHERE state_count = 1)::bigint AS one_state,
    COUNT(*) FILTER (WHERE state_count = 2)::bigint AS two_states,
    COUNT(*) FILTER (WHERE state_count BETWEEN 3 AND 4)::bigint AS three_four_states,
    COUNT(*) FILTER (WHERE state_count BETWEEN 5 AND 9)::bigint AS five_nine_states,
    COUNT(*) FILTER (WHERE state_count >= 10)::bigint AS ten_plus_states
  FROM agency_states
)
SELECT
  s.d2,
  s.one_state,
  s.two_states,
  s.three_four_states,
  s.five_nine_states,
  s.ten_plus_states,
  (SELECT COUNT(*) FROM pairs)::bigint AS d3,
  (SELECT COUNT(*) FROM eligible)::bigint AS d4
FROM summary s`;

const EQUIV_SQL = `
WITH eligible AS (
  SELECT
    c.entity_id,
    upper(trim(c.jurisdiction)) AS jurisdiction
  FROM license_credentials c
  INNER JOIN national_entities e ON e.id = c.entity_id
  WHERE c.entity_kind = 'agency'
    AND e.entity_kind = 'agency'
    AND c.entity_id IS NOT NULL
    AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND e.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
    AND c.source_dataset IN (${ACCEPTED_SOURCES.map((s) => `'${s}'`).join(', ')})
)
SELECT
  COUNT(*)::bigint AS d4,
  COUNT(DISTINCT entity_id)::bigint AS d2,
  COUNT(DISTINCT ROW(entity_id, jurisdiction))::bigint AS d3
FROM eligible`;

const CLOCK_SQL = `
SELECT
  source_dataset,
  COUNT(*)::bigint AS rows,
  MIN(source_observed_at) AS source_observed_min,
  MAX(source_observed_at) AS source_observed_max,
  MIN(ingested_at) AS ingested_min,
  MAX(ingested_at) AS ingested_max,
  MIN(updated_at) AS updated_min,
  MAX(updated_at) AS updated_max
FROM license_credentials
WHERE entity_kind = 'agency'
GROUP BY source_dataset
ORDER BY source_dataset`;

type LockRow = {
  d2: string;
  d3: string;
  d4: string;
  one_state: string;
  two_states: string;
  three_four_states: string;
  five_nine_states: string;
  ten_plus_states: string;
};

function n(v: string | number): number {
  return Number(v);
}

function databaseUrl(): string {
  const constructedPassword = (process.env.SUPABASE_DB_PASSWORD || '').trim();
  const constructed = constructedPassword
    ? `postgresql://postgres.gojyhmbojbwbpiamoktq:${encodeURIComponent(constructedPassword)}@aws-1-ca-central-1.pooler.supabase.com:5432/postgres?sslmode=require`
    : '';
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DIRECT_URL ||
    process.env.SUPABASE_DB_URL ||
    constructed
  ).trim();
}

async function readOnlyQuery<T extends Record<string, unknown>>(
  client: Client,
  sql: string,
): Promise<T[]> {
  const res = await client.query<T>(sql);
  return res.rows;
}

async function lockOnce(client: Client, label: string) {
  const started = new Date().toISOString();
  const extra = await readOnlyQuery<{
    source_dataset: string;
    jurisdiction: string;
    credential_rows: string;
  }>(client, EXTRA_SOURCE_SQL);
  const census = await readOnlyQuery<{
    source_dataset: string;
    jurisdiction: string;
    entity_kind: string;
    credential_rows: string;
    unique_entities: string;
  }>(client, SOURCE_CENSUS_SQL);
  const d1 = n((await readOnlyQuery<{ d1: string }>(client, D1_SQL))[0].d1);
  const d1Accepted = n(
    (await readOnlyQuery<{ d1_accepted: string }>(client, D1_ACCEPTED_SQL))[0].d1_accepted,
  );
  const lock = (await readOnlyQuery<LockRow>(client, LOCK_SQL))[0];
  const equiv = (
    await readOnlyQuery<{ d2: string; d3: string; d4: string }>(client, EQUIV_SQL)
  )[0];
  const clocks = await readOnlyQuery<Record<string, unknown>>(client, CLOCK_SQL);
  const finished = new Date().toISOString();
  return {
    label,
    started,
    finished,
    extraSources: extra,
    census: census.map((row) => ({
      source_dataset: row.source_dataset,
      jurisdiction: row.jurisdiction,
      entity_kind: row.entity_kind,
      credential_rows: n(row.credential_rows),
      unique_entities: n(row.unique_entities),
    })),
    d1,
    d1Accepted,
    lock: {
      d2: n(lock.d2),
      d3: n(lock.d3),
      d4: n(lock.d4),
      one: n(lock.one_state),
      two: n(lock.two_states),
      threeToFour: n(lock.three_four_states),
      fiveToNine: n(lock.five_nine_states),
      tenPlus: n(lock.ten_plus_states),
    },
    equiv: { d2: n(equiv.d2), d3: n(equiv.d3), d4: n(equiv.d4) },
    clocks,
  };
}

function payload(run: Awaited<ReturnType<typeof lockOnce>>) {
  return {
    d1: run.d1,
    d1Accepted: run.d1Accepted,
    lock: run.lock,
    equiv: run.equiv,
    census: run.census,
    extra: run.extraSources,
  };
}

async function main() {
  loadLocalEnv();
  const url = databaseUrl();
  if (!url) {
    console.error(
      'INS-HOME-003B needs a Postgres URL. Set DATABASE_URL or SUPABASE_DB_PASSWORD. PostgREST aggregates are disabled (PGRST123); SQL must run in PostgreSQL.',
    );
    process.exit(2);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '120s'");
    const run1 = await lockOnce(client, 'run1');
    await client.query('COMMIT');
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '120s'");
    const run2 = await lockOnce(client, 'run2');
    await client.query('COMMIT');

    const L = run1.lock;
    const gates = {
      extra_sources_zero: run1.extraSources.length === 0,
      d2_le_d1: L.d2 <= run1.d1,
      bucket_sum_eq_d2: L.one + L.two + L.threeToFour + L.fiveToNine + L.tenPlus === L.d2,
      d3_ge_d2: L.d3 >= L.d2,
      d4_ge_d3: L.d4 >= L.d3,
      run1_eq_run2: JSON.stringify(payload(run1)) === JSON.stringify(payload(run2)),
      lock_eq_equiv_d2: L.d2 === run1.equiv.d2,
      lock_eq_equiv_d3: L.d3 === run1.equiv.d3,
      lock_eq_equiv_d4: L.d4 === run1.equiv.d4,
    };
    const pass = Object.values(gates).every(Boolean);
    const report = {
      task: 'INS-HOME-003B',
      db_writes: 0,
      pass,
      gates,
      acceptedSources: ACCEPTED_SOURCES,
      queries: {
        extraSource: EXTRA_SOURCE_SQL.trim(),
        sourceCensus: SOURCE_CENSUS_SQL.trim(),
        d1: D1_SQL.trim(),
        lock: LOCK_SQL.trim(),
        equivalent: EQUIV_SQL.trim(),
      },
      run1,
      run2,
    };
    mkdirSync(join(ROOT, 'data/reports'), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    console.log('wrote', OUT);
    if (!pass) process.exit(3);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
