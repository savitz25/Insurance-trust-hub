/**
 * INS-DB-PREPRODUCTION-PROOF-001
 * Isolated PostgreSQL 17.6. Synthetic rows only. No Production connection.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import { resolveProviderTrustState, canShowAsVerified } from '@/lib/insurance/trust/provider-trust-state';
import { classifyBailBondDirectoryPublication } from '@/lib/directory/bail-bond-publication';
import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import { hasFreshCheckedAt } from '@/lib/provenance/promotion';
import { compareFloridaHubOrder, mergeFloridaHubPage } from '@/lib/dfs/florida-hub-merge';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAY_MS = 365 * 24 * 60 * 60 * 1000;
const asOfMs = Date.now();
const asOfIso = new Date(asOfMs).toISOString();
const freshIso = new Date(asOfMs - 24 * 60 * 60 * 1000).toISOString();
const exactIso = new Date(asOfMs - DAY_MS).toISOString();
const staleIso = new Date(asOfMs - DAY_MS - 1).toISOString();
const PORT = 55432;
const PASSWORD = 'proof-local-only';

const COUNTY_COUNTS: Array<[string, number]> = [
  ['miami_dade', 9630],
  ['broward', 7936],
  ['palm_beach', 5147],
  ['duval', 2696],
  ['hillsborough', 4352],
  ['orange', 4723],
  ['osceola', 1086],
  ['seminole', 1509],
  ['pinellas', 2992],
  ['pasco', 1390],
];

const COUNT_WHERE = `
  verified = true
  AND states_licensed @> ARRAY['FL']::text[]
  AND publication_county_id = $1
  AND publication_license_ok = true
  AND publication_source_ok = true
  AND publication_identity_accepted = true
  AND publication_bail_excluded = false
  AND publication_license_state IS NOT NULL
  AND publication_checked_at IS NOT NULL
  AND publication_checked_at >= $2::timestamptz
  AND publication_checked_at <= $3::timestamptz
  AND slug <> ''
  AND name <> ''
`;

type DbShape = {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  states: string[];
  license_info: { licenses: Array<Record<string, unknown>> };
  contact: Record<string, unknown>;
  updated_at: string;
};

function license(over: Record<string, unknown> = {}) {
  return {
    license_number: 'L1002003',
    state: 'FL',
    source: 'Florida DFS',
    checkedAt: freshIso,
    identityMatchAccepted: true,
    type: 'agent',
    notes: 'property and casualty',
    verification_url: 'https://example.invalid/lookup',
    method: 'automated',
    status: 'verified',
    ...over,
  };
}

function baseRow(over: Partial<DbShape> & { licenses?: Array<Record<string, unknown>> }): DbShape {
  const licenses = over.licenses ?? [license()];
  return {
    id: over.id ?? randomUUID(),
    slug: over.slug ?? `slug-${randomUUID()}`,
    name: over.name ?? 'Synthetic Agency LLC',
    verified: over.verified ?? true,
    states: over.states ?? ['FL'],
    license_info: { licenses },
    contact: over.contact ?? { launch_county_id: 'palm_beach', county: 'Palm Beach', phone: '3052014488' },
    updated_at: over.updated_at ?? '2024-06-01T00:00:00.000Z',
  };
}

function columnsFromRow(row: DbShape) {
  const provider = mapRowToProvider({
    ...row,
    cities: [],
    categories: ['auto'],
    specialties: [],
    states_licensed: row.states,
    short_description: null,
    description: null,
    years_in_business: null,
    created_at: asOfIso,
    updated_at: row.updated_at,
  } as never);
  const trust = resolveProviderTrustState(provider);
  const evidence = [
    provider.license_notes,
    ...(provider.licenses ?? []).map((item) => item.type),
    ...(provider.licenses ?? []).map((item) => item.notes),
  ];
  const bail = classifyBailBondDirectoryPublication({
    businessNames: [provider.name],
    licenseEvidence: evidence,
  });
  const stateInput = (provider.license_state ?? provider.state ?? '').trim();
  const checkedRaw = (provider.license_checked_at ?? '').trim();
  const checkedDate = checkedRaw ? new Date(checkedRaw) : null;
  const checkedOk = Boolean(checkedDate && !Number.isNaN(checkedDate.getTime()));
  const countyRaw = String(row.contact.launch_county_id ?? '').trim();
  const checkedAt = checkedOk ? checkedDate!.toISOString() : null;
  const checkedMs = checkedOk ? checkedDate!.getTime() : null;
  const freshAtSharedAsOf = checkedMs != null && asOfMs - checkedMs >= 0 && asOfMs - checkedMs <= DAY_MS;
  const tsVerified = canShowAsVerified(trust);
  const hub = row.verified
    && row.states.includes('FL')
    && countyRaw === 'palm_beach'
    && row.slug !== ''
    && row.name !== ''
    && stateInput !== ''
    && Boolean(cleanLicenseNumber(provider.license_number))
    && Boolean((provider.license_source ?? '').trim())
    && Boolean(provider.license_identity_match_accepted)
    && !bail.excludeFromConsumerDirectory
    && freshAtSharedAsOf;
  return {
    trust,
    tsVerified,
    hubPalmBeach: hub,
    publication_county_id: countyRaw || null,
    publication_license_ok: Boolean(cleanLicenseNumber(provider.license_number)),
    publication_source_ok: Boolean((provider.license_source ?? '').trim()),
    publication_identity_accepted: Boolean(provider.license_identity_match_accepted),
    publication_bail_excluded: bail.excludeFromConsumerDirectory,
    publication_license_state: stateInput || null,
    publication_checked_at: checkedAt,
  };
}

function osceolaName(index: number): string {
  if (index === 0) return 'A_1 AUTO SALES OF TAMPA INC';
  if (index === 1) return 'A-1 B COOL HEAT & AIR, LLC';
  if (index === 2) return 'a-1 b cool heat & air, llc';
  if (index === 3 || index === 4) return 'Duplicate Name Agency';
  if (index === 5) return "O'Brien Agency";
  if (index === 6) return 'Obrien Agency';
  if (index === 7) return 'BAILEY INSURANCE LLC';
  return `Osceola Agency ${String(index).padStart(5, '0')}`;
}

function planUses(plan: string, indexName: string): boolean {
  return plan.includes(indexName);
}

function scanKind(plan: string): string {
  const line = plan.split('\n').find((item) => /Scan/.test(item) && !/Disabled/.test(item)) ?? plan.split('\n')[0];
  return line.trim();
}

async function insertBatch(client: pg.Client, rows: Array<Record<string, unknown>>) {
  const width = 15;
  const chunkSize = 400;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const params: unknown[] = [];
    const values = chunk.map((row, index) => {
      const base = index * width;
      params.push(
        row.id, row.slug, row.name, row.verified, row.states,
        JSON.stringify(row.license_info), JSON.stringify(row.contact), row.updated_at,
        row.publication_county_id, row.publication_license_ok, row.publication_source_ok,
        row.publication_identity_accepted, row.publication_bail_excluded,
        row.publication_license_state, row.publication_checked_at
      );
      const marks = Array.from({ length: width }, (_, n) => `$${base + n + 1}`);
      marks[0] += '::uuid';
      marks[4] += '::text[]';
      marks[5] += '::jsonb';
      marks[6] += '::jsonb';
      marks[7] += '::timestamptz';
      marks[14] += '::timestamptz';
      return `(${marks.join(',')})`;
    });
    await client.query(
      `INSERT INTO public.providers (
        id, slug, name, verified, states_licensed, license_info, contact, updated_at,
        publication_county_id, publication_license_ok, publication_source_ok,
        publication_identity_accepted, publication_bail_excluded,
        publication_license_state, publication_checked_at
      ) VALUES ${values.join(',')}`,
      params
    );
  }
}

async function explainText(client: pg.Client, sql: string, params: unknown[] = []): Promise<string> {
  const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, params);
  return result.rows.map((row) => String(row['QUERY PLAN'])).join('\n');
}

async function roleCall(client: pg.Client, role: string, sql: string, params: unknown[] = []) {
  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL ROLE ${role}`);
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    return { ok: true, rowCount: result.rowCount, rows: result.rows, code: null as string | null, message: null as string | null };
  } catch (error) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string; message?: string };
    return { ok: false, rowCount: 0, rows: [], code: pgError.code ?? null, message: pgError.message ?? String(error) };
  }
}

function libcVersion(): string | null {
  if (process.platform !== 'linux') return null;
  try {
    return execFileSync('getconf', ['GNU_LIBC_VERSION'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function sameOrder(left: Array<{ id: string; name?: string }>, right: Array<{ id: string; name?: string }>): number {
  const length = Math.max(left.length, right.length);
  let mismatches = 0;
  for (let i = 0; i < length; i += 1) {
    if (left[i]?.id !== right[i]?.id) mismatches += 1;
  }
  return mismatches;
}

function orderSamples(left: Array<{ id: string; name?: string }>, right: Array<{ id: string; name?: string }>): string[] {
  const samples: string[] = [];
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length && samples.length < 5; i += 1) {
    if (left[i]?.id !== right[i]?.id) samples.push(`${left[i]?.name ?? ''} => ${right[i]?.name ?? ''}`);
  }
  return samples;
}

async function sitemapContract() {
  const appRoot = process.env.PROOF_APP_ROOT || 'C:\\Users\\Michael.Savitsky\\insurance-ins-seo-fl-integration-001';
  const previousCwd = process.cwd();
  process.chdir(appRoot);
  const { buildSitemapEntries } = await import('@/app/sitemap');
  const { INSURANCE_HUBS } = await import('@/lib/hubs/registry');
  const { isFlLaunchHub } = await import('@/lib/dfs/launch-counties');
  const florida = INSURANCE_HUBS.filter((hub) => isFlLaunchHub(hub.slug));
  const signals = new Map(florida.map((hub) => [hub.slug, { hubSlug: hub.slug, lookupSucceeded: true, verifiedTotal: 10 }]));
  const failedSlug = florida[0]?.slug ?? 'miami';
  signals.set(failedSlug, { hubSlug: failedSlug, lookupSucceeded: false, verifiedTotal: 0 });
  let threw = false;
  let entries: Array<{ url: string }> = [];
  try {
    entries = buildSitemapEntries(new Date(asOfMs), signals) as Array<{ url: string }>;
  } catch {
    threw = true;
  }
  const floridaUrls = entries.filter((entry) => entry.url.includes('/hubs/florida/')).map((entry) => entry.url);
  const failedUrlPresent = floridaUrls.some((url) => url.endsWith(`/${failedSlug}`));
  const otherProductionUrls = entries.filter((entry) => !entry.url.includes('/hubs/florida/')).length;

  let unconfiguredThrew = false;
  let unconfiguredEntries = 0;
  try {
    unconfiguredEntries = (buildSitemapEntries(new Date(asOfMs), new Map()) as Array<{ url: string }>).length;
  } catch {
    unconfiguredThrew = true;
  }

  function authoritative(mode: 'unconfigured' | 'configured', snapshot: Map<string, { lookupSucceeded: boolean }>) {
    if (mode === 'unconfigured') {
      return { label: 'LOCAL_FIXTURE_BUILD', productionAuthoritative: false, floridaHubs: 0 };
    }
    const missing = florida.filter((hub) => snapshot.get(hub.slug)?.lookupSucceeded !== true).map((hub) => hub.slug);
    if (missing.length) {
      const error = new Error(`SitemapPublicationIncomplete:${missing.join(',')}`);
      error.name = 'SitemapPublicationIncomplete';
      throw error;
    }
    return { label: 'PRODUCTION_AUTHORITATIVE', productionAuthoritative: true, floridaHubs: florida.length };
  }

  let contractThrew = false;
  let contractMessage = '';
  try {
    authoritative('configured', signals);
  } catch (error) {
    contractThrew = true;
    contractMessage = error instanceof Error ? error.message : String(error);
  }
  const unconfigured = authoritative('unconfigured', new Map());
  process.chdir(previousCwd);
  return {
    currentBuildThrowsWhenRequiredCountFails: threw,
    currentFailedHubStillPublished: failedUrlPresent,
    currentOtherProductionUrls: otherProductionUrls,
    currentFloridaUrls: floridaUrls.length,
    currentUnconfiguredThrows: unconfiguredThrew,
    currentUnconfiguredEntryCount: unconfiguredEntries,
    currentUnconfiguredLabeledFixture: false,
    requiredContractThrows: contractThrew,
    requiredContractMessage: contractMessage,
    unconfiguredContract: unconfigured,
    item9CurrentCodePasses: threw && !failedUrlPresent,
  };
}

async function main() {
  await mkdir(path.join(root, 'results'), { recursive: true });
  const tightNow = Date.now();
  const boundary = {
    exact: hasFreshCheckedAt(new Date(tightNow - DAY_MS).toISOString()),
    stale: hasFreshCheckedAt(new Date(tightNow - DAY_MS - 1).toISOString()),
    elapsedMs: Date.now() - tightNow,
  };

  const linux = process.platform === 'linux';
  const databaseDir = path.join(root, 'data', linux ? 'db-linux' : 'db');
  const logs: string[] = [];
  const { access } = await import('node:fs/promises');
  let alreadyInitialised = false;
  try {
    await access(path.join(databaseDir, 'PG_VERSION'));
    alreadyInitialised = true;
  } catch {
    alreadyInitialised = false;
  }
  const initdbFlags = linux
    ? ['--encoding=UTF8', '--locale=en_US.UTF-8', '--locale-provider=icu', '--icu-locale=en-US']
    : ['--encoding=UTF8', '--locale-provider=icu', '--icu-locale=en-US'];
  let initMode = alreadyInitialised ? 'existing-cluster' : (linux ? 'linux-icu-en-US-glibc-locale' : 'icu-en-US');
  let embedded = new EmbeddedPostgres({
    databaseDir,
    port: PORT,
    user: 'postgres',
    password: PASSWORD,
    persistent: true,
    initdbFlags,
    onLog: (message) => logs.push(String(message)),
    onError: (message) => logs.push(String(message)),
  });
  if (!alreadyInitialised) {
    try {
      await embedded.initialise();
    } catch (error) {
      if (linux) throw error;
      initMode = `icu-failed-then-libc:${error instanceof Error ? error.message : String(error)}`;
      const { rm } = await import('node:fs/promises');
      await rm(databaseDir, { recursive: true, force: true });
      embedded = new EmbeddedPostgres({
        databaseDir,
        port: PORT,
        user: 'postgres',
        password: PASSWORD,
        persistent: true,
        initdbFlags: ['--encoding=UTF8', '--locale=C'],
        onLog: (message) => logs.push(String(message)),
        onError: (message) => logs.push(String(message)),
      });
      await embedded.initialise();
    }
  }
  await embedded.start();
  console.error('postgres started');
  const maint = embedded.getPgClient('postgres');
  await maint.connect();
  await maint.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'proof' AND pid <> pg_backend_pid()`);
  await maint.query('DROP DATABASE IF EXISTS proof');
  await maint.query('DROP ROLE IF EXISTS column_probe');
  await maint.query('DROP ROLE IF EXISTS proof_app');
  await maint.query('DROP ROLE IF EXISTS service_role');
  await maint.query('DROP ROLE IF EXISTS authenticated');
  await maint.query('DROP ROLE IF EXISTS anon');
  await maint.end();
  await embedded.createDatabase('proof');
  const admin = embedded.getPgClient('proof');
  await admin.connect();

  const version = await admin.query<{
    server_version: string;
    datcollate: string;
    datctype: string;
    datlocprovider: string;
    datlocale: string | null;
    server_encoding: string;
    version_string: string;
  }>(
    `SELECT current_setting('server_version') AS server_version,
            d.datcollate,
            d.datctype,
            d.datlocprovider::text AS datlocprovider,
            d.datlocale,
            current_setting('server_encoding') AS server_encoding,
            version() AS version_string
     FROM pg_database d
     WHERE d.datname = current_database()`
  );

  const schemaSql = await readFile(path.join(root, 'sql', '01-live-shape-plus-columns.sql'), 'utf8');
  await admin.query(schemaSql);
  await admin.query('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, proof_app');

  const expected = new Map<string, number>();
  const bulk: Array<Record<string, unknown>> = [];
  let seq = 0;
  for (const [county, count] of COUNTY_COUNTS) {
    expected.set(county, count);
    for (let i = 0; i < count; i += 1) {
      const name = county === 'osceola' ? osceolaName(i) : `${county} Agency ${i}`;
      const row = baseRow({
        slug: `bulk-${county}-${i}`,
        name,
        contact: { launch_county_id: county, county: county, phone: '3052014488' },
        licenses: [license({ license_number: `L${String(seq).padStart(7, '0')}`, checkedAt: freshIso })],
      });
      seq += 1;
      const cols = columnsFromRow(row);
      if (!cols.tsVerified || cols.publication_county_id !== county) {
        throw new Error(`bulk row failed the TypeScript gate at ${row.slug}`);
      }
      bulk.push({ ...row, ...cols });
    }
  }

  const fixtures: Array<{ label: string; row: DbShape; expectHub: boolean }> = [
    { label: 'eligible', row: baseRow({ slug: 'fx-eligible' }), expectHub: true },
    { label: 'bailey', row: baseRow({ slug: 'fx-bailey', name: 'BAILEY INSURANCE LLC' }), expectHub: true },
    { label: 'phone-placeholder', row: baseRow({ slug: 'fx-phone', contact: { launch_county_id: 'palm_beach', phone: '000-000-0000' } }), expectHub: true },
    { label: 'exact-365', row: baseRow({ slug: 'fx-exact', licenses: [license({ checkedAt: exactIso })] }), expectHub: true },
    { label: 'state-fallback', row: baseRow({ slug: 'fx-fallback', licenses: [license({ state: undefined })] }), expectHub: true },
    { label: 'bail-name', row: baseRow({ slug: 'fx-bail-name', name: 'PALM BAIL AGENCY' }), expectHub: false },
    { label: 'second-license-bail', row: baseRow({ slug: 'fx-mixed', licenses: [license(), license({ license_number: 'B1002003', type: 'Surety Bail', notes: 'surety' })] }), expectHub: false },
    { label: 'dirty-na', row: baseRow({ slug: 'fx-na', licenses: [license({ license_number: 'n/a' })] }), expectHub: false },
    { label: 'identity-false', row: baseRow({ slug: 'fx-identity', licenses: [license({ identityMatchAccepted: false })] }), expectHub: false },
    { label: 'stale', row: baseRow({ slug: 'fx-stale', licenses: [license({ checkedAt: staleIso })] }), expectHub: false },
    { label: 'future', row: baseRow({ slug: 'fx-future', licenses: [license({ checkedAt: new Date(asOfMs + 60000).toISOString() })] }), expectHub: false },
    { label: 'verified-false', row: baseRow({ slug: 'fx-unverified', verified: false }), expectHub: false },
    { label: 'display-county', row: baseRow({ slug: 'fx-display', contact: { launch_county_id: 'Palm Beach', county: 'Palm Beach', phone: '3052014488' } }), expectHub: false },
    { label: 'empty-slug', row: baseRow({ slug: '', name: 'Empty Slug LLC' }), expectHub: false },
    { label: 'null-booleans', row: baseRow({ slug: 'fx-null-bool' }), expectHub: false },
  ];
  const fixtureRows = fixtures.map((fixture) => {
    const cols = columnsFromRow(fixture.row);
    const stored = fixture.label === 'null-booleans'
      ? { ...cols, publication_license_ok: null, publication_source_ok: null, publication_identity_accepted: null, publication_bail_excluded: null }
      : cols;
    return { ...fixture.row, ...stored, label: fixture.label, expectHub: fixture.expectHub, tsHub: cols.hubPalmBeach };
  });
  if (fixtureRows.some((row) => row.label !== 'null-booleans' && row.tsHub !== row.expectHub)) {
    throw new Error(`fixture TypeScript expectation mismatch ${JSON.stringify(fixtureRows.filter((row) => row.label !== 'null-booleans' && row.tsHub !== row.expectHub).map((row) => row.label))}`);
  }

  const orderNames = [
    'A_1 ORDER LAB',
    'A-1 ORDER LAB',
    'a-1 order lab',
    'Duplicate Order Lab',
    'Duplicate Order Lab',
    "O'Brien Order Lab",
    'Obrien Order Lab',
    'Ávila Order Lab',
    'Avila Order Lab',
    'Müller Order Lab',
    'Muller Order Lab',
    'Zoé Order Lab',
    'Zoe\u0301 Order Lab',
    'Ñoño Order Lab',
    'Noño Order Lab',
    'Agency · Middle Dot',
  ];
  const orderRows = orderNames.map((name, index) => {
    const row = baseRow({
      slug: `ord-${index}`,
      name,
      contact: { launch_county_id: 'order_lab', county: 'order_lab', phone: '3052014488' },
    });
    return { ...row, ...columnsFromRow(row) };
  });

  const startedLoad = Date.now();
  await insertBatch(admin, bulk);
  await insertBatch(admin, fixtureRows);
  await insertBatch(admin, orderRows);
  const loadMs = Date.now() - startedLoad;
  console.error(`loaded ${bulk.length} rows in ${loadMs}ms`);

  const indexStarted = Date.now();
  await admin.query(await readFile(path.join(root, 'sql', '02-index-concurrently.sql'), 'utf8'));
  const indexMs = Date.now() - indexStarted;
  console.error(`index ${indexMs}ms`);
  const indexHealth = await admin.query<{ indisvalid: boolean; indisready: boolean }>(
    `SELECT i.indisvalid, i.indisready
     FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
     WHERE c.relname = 'idx_providers_fl_hub_publication'`
  );
  await admin.query('ANALYZE public.providers');

  const countyCounts = await admin.query<{ county: string; n: number }>(
    `SELECT publication_county_id AS county, count(*)::int AS n
     FROM public.providers
     WHERE verified = true
       AND states_licensed @> ARRAY['FL']::text[]
       AND publication_license_ok = true
       AND publication_source_ok = true
       AND publication_identity_accepted = true
       AND publication_bail_excluded = false
       AND publication_license_state IS NOT NULL
       AND publication_checked_at IS NOT NULL
       AND publication_checked_at >= $1::timestamptz
       AND publication_checked_at <= $2::timestamptz
       AND slug <> ''
       AND name <> ''
       AND slug NOT LIKE 'fx-%'
     GROUP BY publication_county_id`,
    [exactIso, asOfIso]
  );
  const countMap = new Map(countyCounts.rows.map((row) => [row.county, row.n]));
  const countDiffs = COUNTY_COUNTS.map(([county, n]) => ({
    county,
    expected: n,
    sql: countMap.get(county) ?? 0,
    match: (countMap.get(county) ?? 0) === n,
  }));

  const palm = await admin.query<{ slug: string }>(
    `SELECT slug FROM public.providers WHERE slug LIKE 'fx-%' AND ${COUNT_WHERE}`,
    ['palm_beach', exactIso, asOfIso]
  );
  const palmSlugs = new Set(palm.rows.map((row) => row.slug));
  const fixtureSql = fixtureRows.map((row) => ({
    label: row.label,
    inSql: palmSlugs.has(String(row.slug)),
    expectHub: row.expectHub,
    match: palmSlugs.has(String(row.slug)) === row.expectHub,
  }));

  const countPlan = await explainText(
    admin,
    `SELECT count(*) FROM public.providers WHERE ${COUNT_WHERE}`,
    ['miami_dade', exactIso, asOfIso]
  );
  const pagePlan = await explainText(
    admin,
    `SELECT id, name FROM public.providers WHERE ${COUNT_WHERE} ORDER BY name, id LIMIT 100`,
    ['osceola', exactIso, asOfIso]
  );
  const deepPlan = await explainText(
    admin,
    `SELECT id, name FROM public.providers WHERE ${COUNT_WHERE} ORDER BY name, id LIMIT 100 OFFSET 9600`,
    ['miami_dade', exactIso, asOfIso]
  );

  await admin.query(`
    PREPARE hub_count (text, timestamptz, timestamptz) AS
    SELECT count(*) FROM public.providers WHERE ${COUNT_WHERE.replaceAll('$1', '$1').replaceAll('::timestamptz', '')}
  `);
  await admin.query(`SET plan_cache_mode = force_generic_plan`);
  const genericPlan = (await admin.query(
    `EXPLAIN EXECUTE hub_count('${'miami_dade'}', '${exactIso}', '${asOfIso}')`
  )).rows.map((row) => String(row['QUERY PLAN'])).join('\n');
  await admin.query('RESET plan_cache_mode');

  await admin.query('SET enable_seqscan = off');
  await admin.query('SET enable_bitmapscan = off');
  const missingBoolPlan = await explainText(
    admin,
    `SELECT count(*) FROM public.providers
     WHERE verified = true
       AND states_licensed @> ARRAY['FL']::text[]
       AND publication_county_id = $1
       AND publication_source_ok = true
       AND publication_identity_accepted = true
       AND publication_bail_excluded = false
       AND publication_license_state IS NOT NULL
       AND publication_checked_at IS NOT NULL
       AND publication_checked_at >= $2::timestamptz
       AND publication_checked_at <= $3::timestamptz
       AND slug <> '' AND name <> ''`,
    ['miami_dade', exactIso, asOfIso]
  );
  await admin.query('RESET enable_seqscan');
  await admin.query('RESET enable_bitmapscan');

  const ordered = await admin.query<{ name: string; id: string }>(
    `SELECT name, id::text AS id FROM public.providers
     WHERE ${COUNT_WHERE}
     ORDER BY name, id`,
    ['osceola', exactIso, asOfIso]
  );
  const collator = new Intl.Collator('en-US', { usage: 'sort', sensitivity: 'variant' });
  let collatorMismatches = 0;
  let codeUnitMismatches = 0;
  const sampleMismatches: string[] = [];
  const codeUnitSamples: string[] = [];
  for (let i = 1; i < ordered.rows.length; i += 1) {
    const prev = ordered.rows[i - 1];
    const curr = ordered.rows[i];
    const collatorOrder = collator.compare(prev.name, curr.name) || (prev.id < curr.id ? -1 : prev.id > curr.id ? 1 : 0);
    if (collatorOrder > 0) {
      collatorMismatches += 1;
      if (sampleMismatches.length < 5) sampleMismatches.push(`${prev.name} -> ${curr.name}`);
    }
    const code = prev.name < curr.name ? -1 : prev.name > curr.name ? 1 : (prev.id < curr.id ? -1 : 1);
    if (code > 0) {
      codeUnitMismatches += 1;
      if (codeUnitSamples.length < 3) codeUnitSamples.push(`${prev.name} -> ${curr.name}`);
    }
  }

  const labOrdered = await admin.query<{ name: string; id: string }>(
    `SELECT name, id::text AS id FROM public.providers
     WHERE ${COUNT_WHERE}
     ORDER BY name, id`,
    ['order_lab', exactIso, asOfIso]
  );
  const labSorted = [...labOrdered.rows].sort(compareFloridaHubOrder);
  const unicodeMismatches = sameOrder(labOrdered.rows, labSorted);

  const seminole = await admin.query<{ name: string; id: string }>(
    `SELECT name, id::text AS id FROM public.providers
     WHERE ${COUNT_WHERE}
     ORDER BY name, id`,
    ['seminole', exactIso, asOfIso]
  );
  const merged = mergeFloridaHubPage(
    [ordered.rows, seminole.rows],
    0,
    ordered.rows.length + seminole.rows.length
  );
  const collatorMerged = [...ordered.rows, ...seminole.rows].sort(compareFloridaHubOrder);
  const mergeMismatches = sameOrder(merged, collatorMerged);
  const sqlMerged = await admin.query<{ name: string; id: string }>(
    `SELECT name, id::text AS id FROM public.providers
     WHERE verified = true
       AND states_licensed @> ARRAY['FL']::text[]
       AND publication_county_id = ANY($1::text[])
       AND publication_license_ok = true
       AND publication_source_ok = true
       AND publication_identity_accepted = true
       AND publication_bail_excluded = false
       AND publication_license_state IS NOT NULL
       AND publication_checked_at IS NOT NULL
       AND publication_checked_at >= $2::timestamptz
       AND publication_checked_at <= $3::timestamptz
       AND slug <> ''
       AND name <> ''
     ORDER BY name, id`,
    [['osceola', 'seminole'], exactIso, asOfIso]
  );
  const sqlMergeMismatches = sameOrder(sqlMerged.rows, collatorMerged);

  const miamiOrdered = await admin.query<{ name: string; id: string }>(
    `SELECT name, id::text AS id FROM public.providers
     WHERE ${COUNT_WHERE}
     ORDER BY name, id`,
    ['miami_dade', exactIso, asOfIso]
  );
  const deepRows = await admin.query<{ name: string; id: string }>(
    `SELECT name, id::text AS id FROM public.providers
     WHERE ${COUNT_WHERE}
     ORDER BY name, id
     LIMIT 100 OFFSET 9600`,
    ['miami_dade', exactIso, asOfIso]
  );
  const deepSlice = miamiOrdered.rows.slice(9600, 9700);
  const deepPageMatches = sameOrder(deepRows.rows, deepSlice) === 0 && deepRows.rows.length === deepSlice.length;

  const timings: number[] = [];
  const pool = new pg.Pool({ host: '127.0.0.1', port: PORT, user: 'postgres', password: PASSWORD, database: 'proof', max: 3 });
  const work = COUNTY_COUNTS.flatMap(([county]) => [county, county, county]);
  let nextJob = 0;
  let concurrentErrors = 0;
  async function worker() {
    const client = await pool.connect();
    try {
      while (nextJob < work.length) {
        const county = work[nextJob];
        nextJob += 1;
        const started = Date.now();
        try {
          await client.query(`SELECT count(*) FROM public.providers WHERE ${COUNT_WHERE}`, [county, exactIso, asOfIso]);
        } catch {
          concurrentErrors += 1;
        }
        timings.push(Date.now() - started);
      }
    } finally {
      client.release();
    }
  }
  const burstStarted = Date.now();
  await Promise.all([worker(), worker(), worker()]);
  const burstMs = Date.now() - burstStarted;
  await pool.end();
  const sortedTimes = [...timings].sort((a, b) => a - b);
  const p95 = sortedTimes[Math.min(sortedTimes.length - 1, Math.ceil(sortedTimes.length * 0.95) - 1)] ?? null;

  const staleTarget = 'bulk-palm_beach-0';
  const beforeStale = await admin.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.providers WHERE slug = $4 AND ${COUNT_WHERE}`,
    ['palm_beach', exactIso, asOfIso, staleTarget]
  );
  await admin.query(
    `UPDATE public.providers
     SET license_info = $2::jsonb
     WHERE slug = $1`,
    [staleTarget, JSON.stringify({ licenses: [license({ type: 'Surety Bail', notes: 'surety bail' })] })]
  );
  const staleStillCounted = await admin.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.providers WHERE slug = $4 AND ${COUNT_WHERE}`,
    ['palm_beach', exactIso, asOfIso, staleTarget]
  );
  const staleRow = baseRow({
    slug: staleTarget,
    contact: { launch_county_id: 'palm_beach', phone: '3052014488' },
    licenses: [license({ type: 'Surety Bail', notes: 'surety bail' })],
  });
  const staleCols = columnsFromRow(staleRow);
  await admin.query(
    `UPDATE public.providers SET
       publication_bail_excluded = $2,
       publication_license_ok = $3,
       publication_source_ok = $4,
       publication_identity_accepted = $5,
       publication_license_state = $6,
       publication_checked_at = $7::timestamptz,
       publication_county_id = $8
     WHERE slug = $1`,
    [staleTarget, staleCols.publication_bail_excluded, staleCols.publication_license_ok, staleCols.publication_source_ok, staleCols.publication_identity_accepted, staleCols.publication_license_state, staleCols.publication_checked_at, staleCols.publication_county_id]
  );
  const staleAfterHelper = await admin.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.providers WHERE slug = $4 AND ${COUNT_WHERE}`,
    ['palm_beach', exactIso, asOfIso, staleTarget]
  );

  const countySlug = 'bulk-broward-0';
  await admin.query(
    `UPDATE public.providers SET contact = contact || '{"launch_county_id":"palm_beach"}'::jsonb WHERE slug = $1`,
    [countySlug]
  );
  const countyStale = await admin.query<{ publication_county_id: string; n: number }>(
    `SELECT publication_county_id,
            (SELECT count(*)::int FROM public.providers p WHERE p.slug = $1 AND p.publication_county_id = 'broward') AS n
     FROM public.providers WHERE slug = $1`,
    [countySlug]
  );
  await admin.query(`UPDATE public.providers SET publication_county_id = 'palm_beach' WHERE slug = $1`, [countySlug]);
  const countyRefreshed = await admin.query<{ publication_county_id: string }>(
    `SELECT publication_county_id FROM public.providers WHERE slug = $1`,
    [countySlug]
  );

  const { formToDbInsert } = await import('@/lib/admin/provider-mapper');
  const form = formToDbInsert({
    slug: 'admin-save',
    name: 'Admin Save LLC',
    providerType: 'independent_agent',
    city: 'West Palm Beach',
    state: 'FL',
    zip: '33401',
    phone: '3052014488',
    website: '',
    licenseNumber: 'L1002003',
    licenseSource: 'Florida DFS',
    licenseSourceUrl: '',
    licenseCheckedAt: freshIso,
    licenseMethod: 'manual',
    licenseNotes: '',
    identityMatchAccepted: true,
    insuranceTypes: ['auto'],
    specialties: [],
    yearsInBusiness: null,
    relocationExperience: false,
    verified: true,
    shortDescription: '',
    description: '',
  });
  const formContact = form.contact as { launch_county_id?: string } | null;
  await admin.query(
    `UPDATE public.providers SET contact = $2::jsonb, publication_county_id = $3 WHERE slug = $1`,
    ['fx-eligible', JSON.stringify(form.contact ?? {}), formContact?.launch_county_id ?? null]
  );
  const afterAdminSave = await admin.query<{ publication_county_id: string | null; n: number }>(
    `SELECT publication_county_id,
            (SELECT count(*)::int FROM public.providers WHERE slug = 'fx-eligible' AND ${COUNT_WHERE}) AS n
     FROM public.providers WHERE slug = 'fx-eligible'`,
    ['palm_beach', exactIso, asOfIso]
  );

  const ratingBefore = await admin.query(`SELECT publication_county_id, publication_bail_excluded FROM public.providers WHERE slug = 'bulk-pasco-0'`);
  await admin.query(`UPDATE public.providers SET rating = 4.5, review_count = 2 WHERE slug = 'bulk-pasco-0'`);
  const ratingAfter = await admin.query(`SELECT publication_county_id, publication_bail_excluded, rating FROM public.providers WHERE slug = 'bulk-pasco-0'`);

  const updated = await admin.query<{ before: string; after_plain: string; after_trigger: string }>(`
    SELECT updated_at AS before FROM public.providers WHERE slug = 'bulk-duval-0'
  `);
  const beforeUpdated = updated.rows[0];
  await admin.query(`UPDATE public.providers SET publication_source_ok = true WHERE slug = 'bulk-duval-0'`);
  const afterPlain = await admin.query<{ updated_at: string }>(`SELECT updated_at FROM public.providers WHERE slug = 'bulk-duval-0'`);
  await admin.query(`
    CREATE TRIGGER trg_providers_updated_at
    BEFORE UPDATE ON public.providers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
  `);
  await admin.query(`UPDATE public.providers SET publication_source_ok = true WHERE slug = 'bulk-duval-0'`);
  const afterTrigger = await admin.query<{ updated_at: string }>(`SELECT updated_at FROM public.providers WHERE slug = 'bulk-duval-0'`);
  await admin.query('DROP TRIGGER trg_providers_updated_at ON public.providers');

  const app = new pg.Client({ host: '127.0.0.1', port: PORT, user: 'proof_app', password: PASSWORD, database: 'proof' });
  await app.connect();
  const anonVerified = await roleCall(app, 'anon', `SELECT count(*)::int AS n FROM public.providers WHERE verified = true`);
  const anonHidden = await roleCall(app, 'anon', `SELECT count(*)::int AS n FROM public.providers WHERE verified = false`);
  const anonUpdate = await roleCall(app, 'anon', `UPDATE public.providers SET publication_county_id = 'changed' WHERE slug = 'bulk-orange-0'`);
  const authenticatedUpdate = await roleCall(app, 'authenticated', `UPDATE public.providers SET publication_county_id = 'changed' WHERE slug = 'bulk-orange-0'`);
  const serviceUpdate = await roleCall(app, 'service_role', `UPDATE public.providers SET review_count = 7 WHERE slug = 'bulk-orange-1' RETURNING review_count`);
  const orangeUnchanged = await admin.query<{ publication_county_id: string }>(
    `SELECT publication_county_id FROM public.providers WHERE slug = 'bulk-orange-0'`
  );
  const grantsBefore = await admin.query<{ anon_update: boolean; authenticated_update: boolean }>(
    `SELECT has_table_privilege('anon','public.providers','UPDATE') AS anon_update,
            has_table_privilege('authenticated','public.providers','UPDATE') AS authenticated_update`
  );

  await admin.query(`
    CREATE ROLE column_probe NOLOGIN BYPASSRLS;
    GRANT column_probe TO proof_app;
    GRANT ALL ON public.providers TO column_probe;
    REVOKE UPDATE (publication_county_id) ON public.providers FROM column_probe;
  `);
  const columnRevoke = await roleCall(app, 'column_probe', `UPDATE public.providers SET publication_county_id = 'broward' WHERE slug = 'bulk-orange-2' RETURNING publication_county_id`);
  await admin.query('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.providers FROM column_probe');
  const tableRevoke = await roleCall(app, 'column_probe', `UPDATE public.providers SET publication_county_id = 'duval' WHERE slug = 'bulk-orange-2'`);
  const columnSelect = await roleCall(app, 'column_probe', `SELECT publication_county_id FROM public.providers WHERE slug = 'bulk-orange-2'`);

  await admin.query(await readFile(path.join(root, 'sql', '03-least-privilege-local-only.sql'), 'utf8'));
  const anonSelectAfter = await roleCall(app, 'anon', `SELECT count(*)::int AS n FROM public.providers WHERE verified = true`);
  const anonUpdateAfter = await roleCall(app, 'anon', `UPDATE public.providers SET rating = 1 WHERE slug = 'bulk-orange-3'`);
  const authenticatedUpdateAfter = await roleCall(app, 'authenticated', `UPDATE public.providers SET rating = 1 WHERE slug = 'bulk-orange-3'`);
  const serviceAfter = await roleCall(app, 'service_role', `UPDATE public.providers SET review_count = 8 WHERE slug = 'bulk-orange-3' RETURNING review_count`);
  const grantsAfter = await admin.query<{ anon_update: boolean; anon_select: boolean; authenticated_update: boolean; service_update: boolean }>(
    `SELECT has_table_privilege('anon','public.providers','UPDATE') AS anon_update,
            has_table_privilege('anon','public.providers','SELECT') AS anon_select,
            has_table_privilege('authenticated','public.providers','UPDATE') AS authenticated_update,
            has_table_privilege('service_role','public.providers','UPDATE') AS service_update`
  );
  await app.end();

  const restored = await admin.query<{ publication_county_id: string }>(
    `SELECT publication_county_id FROM public.providers WHERE slug = 'bulk-orange-2'`
  );

  let sitemap: Awaited<ReturnType<typeof sitemapContract>> | { error: string };
  try {
    sitemap = await sitemapContract();
  } catch (error) {
    sitemap = { error: error instanceof Error ? error.message : String(error) };
  }
  const versionRow = version.rows[0];
  const performancePass = countPlan.includes('idx_providers_fl_hub_publication')
    && !countPlan.includes('Seq Scan')
    && genericPlan.includes('idx_providers_fl_hub_publication')
    && indexHealth.rows[0]?.indisvalid === true
    && concurrentErrors === 0
    && versionRow?.server_version.startsWith('17.6');
  const productionCollationMatch = versionRow?.datcollate === 'en_US.UTF-8'
    && versionRow?.datctype === 'en_US.UTF-8'
    && versionRow?.datlocprovider === 'i'
    && versionRow?.datlocale === 'en-US';
  const collationMatch = productionCollationMatch;
  const parityPass = countDiffs.every((row) => row.match) && fixtureSql.every((row) => row.match) && boundary.exact && !boundary.stale;
  const orderingPass = collatorMismatches === 0
    && unicodeMismatches === 0
    && mergeMismatches === 0
    && sqlMergeMismatches === 0
    && deepPageMatches;
  const linuxProofPass = process.platform === 'linux'
    && versionRow?.server_version.startsWith('17.6') === true
    && productionCollationMatch
    && parityPass
    && orderingPass
    && indexHealth.rows[0]?.indisvalid === true
    && concurrentErrors === 0;

  const report = {
    task: 'INS-DB-PREPRODUCTION-PROOF-001',
    asOf: asOfIso,
    initMode,
    version: versionRow,
    runtime: {
      platform: process.platform,
      node: process.version,
      icu: process.versions.icu ?? null,
      libc: libcVersion(),
    },
    productionCollation: {
      server_version: '17.6',
      datlocprovider: 'i',
      datlocale: 'en-US',
      datcollate: 'en_US.UTF-8',
      datctype: 'en_US.UTF-8',
      server_encoding: 'UTF8',
      compile_target: 'x86_64-pc-linux-gnu',
    },
    collationMatch,
    loadMs,
    bulkRows: bulk.length,
    indexMs,
    indexHealth: indexHealth.rows[0] ?? null,
    boundary,
    countDiffs,
    censusExcludesFixtureSlugs: true,
    fixtureSql,
    plans: { countPlan, pagePlan, deepPlan, genericPlan, missingBoolPlan },
    scan: {
      count: scanKind(countPlan),
      page: scanKind(pagePlan),
      deep: scanKind(deepPlan),
      generic: scanKind(genericPlan),
      countUsesIndex: planUses(countPlan, 'idx_providers_fl_hub_publication'),
      genericUsesIndex: planUses(genericPlan, 'idx_providers_fl_hub_publication'),
      missingBoolUsesIndex: planUses(missingBoolPlan, 'idx_providers_fl_hub_publication'),
      pageHasNoSort: !pagePlan.includes('Sort Key'),
      deepPageSorts: deepPlan.includes('Sort Key'),
      seqscanDisabledOnlyForMissingPredicate: true,
    },
    ordering: {
      rows: ordered.rows.length,
      collatorMismatches,
      codeUnitMismatches,
      sampleMismatches,
      codeUnitSamples,
      unicodeRows: labOrdered.rows.length,
      unicodeMismatches,
      unicodeSamples: orderSamples(labOrdered.rows, labSorted),
      mergeRows: collatorMerged.length,
      mergeMismatches,
      sqlMergeMismatches,
      deepPageMatches,
      deepPageRows: deepRows.rows.length,
      deepPageSortJudgedByCorrectness: true,
    },
    concurrency: { queries: timings.length, errors: concurrentErrors, burstMs, p95, max: sortedTimes[sortedTimes.length - 1] ?? null, min: sortedTimes[0] ?? null },
    writers: {
      beforeStale: beforeStale.rows[0]?.n,
      staleStillCounted: staleStillCounted.rows[0]?.n,
      staleAfterHelper: staleAfterHelper.rows[0]?.n,
      helperBailExcluded: staleCols.publication_bail_excluded,
      countyStale: countyStale.rows[0],
      countyRefreshed: countyRefreshed.rows[0],
      adminFormDropsCounty: formContact?.launch_county_id ?? null,
      afterAdminSave: afterAdminSave.rows[0],
      ratingBefore: ratingBefore.rows[0],
      ratingAfter: ratingAfter.rows[0],
    },
    updatedAt: {
      liveTrigger: false,
      before: beforeUpdated,
      afterPlainUpdate: afterPlain.rows[0]?.updated_at,
      afterTriggerInstalled: afterTrigger.rows[0]?.updated_at,
      plainChanged: new Date(beforeUpdated?.before ?? 0).getTime() !== new Date(afterPlain.rows[0]?.updated_at ?? 0).getTime(),
      triggerChanged: new Date(afterPlain.rows[0]?.updated_at ?? 0).getTime() !== new Date(afterTrigger.rows[0]?.updated_at ?? 0).getTime(),
    },
    permissions: {
      grantsBefore: grantsBefore.rows[0],
      anonVerified: anonVerified.ok ? anonVerified.rows[0] : anonVerified,
      anonHidden: anonHidden.ok ? anonHidden.rows[0] : anonHidden,
      anonUpdate: { ok: anonUpdate.ok, rowCount: anonUpdate.rowCount, code: anonUpdate.code, message: anonUpdate.message },
      authenticatedUpdate: { ok: authenticatedUpdate.ok, rowCount: authenticatedUpdate.rowCount, code: authenticatedUpdate.code, message: authenticatedUpdate.message },
      serviceUpdate: { ok: serviceUpdate.ok, rowCount: serviceUpdate.rowCount, rows: serviceUpdate.rows, code: serviceUpdate.code, message: serviceUpdate.message },
      orangeCountyUnchanged: orangeUnchanged.rows[0],
      columnRevokeUnderTableGrant: { ok: columnRevoke.ok, rowCount: columnRevoke.rowCount, rows: columnRevoke.rows, code: columnRevoke.code },
      tableDmlRevoke: { ok: tableRevoke.ok, code: tableRevoke.code, message: tableRevoke.message },
      selectAfterTableRevoke: { ok: columnSelect.ok, rows: columnSelect.rows, code: columnSelect.code },
      restoredCounty: restored.rows[0],
      anonSelectAfterLeastPrivilege: anonSelectAfter.ok ? anonSelectAfter.rows[0] : anonSelectAfter,
      anonUpdateAfterLeastPrivilege: { ok: anonUpdateAfter.ok, code: anonUpdateAfter.code, message: anonUpdateAfter.message },
      authenticatedUpdateAfterLeastPrivilege: { ok: authenticatedUpdateAfter.ok, code: authenticatedUpdateAfter.code, message: authenticatedUpdateAfter.message },
      serviceAfterLeastPrivilege: { ok: serviceAfter.ok, rows: serviceAfter.rows, code: serviceAfter.code, message: serviceAfter.message },
      grantsAfter: grantsAfter.rows[0],
    },
    sitemap,
    gates: { performancePass, parityPass, orderingPass, linuxProofPass, supabasePerformanceValidated: false },
  };
  await writeFile(path.join(root, 'results', 'proof-result.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(root, 'results', 'postgres.log'), logs.join('\n'));
  console.log(JSON.stringify({
    version: report.version,
    gates: report.gates,
    scan: report.scan,
    indexMs: report.indexMs,
    concurrency: report.concurrency,
    ordering: report.ordering,
    writers: report.writers,
    updatedAt: report.updatedAt,
    permissions: {
      anonUpdate: report.permissions.anonUpdate,
      authenticatedUpdate: report.permissions.authenticatedUpdate,
      serviceUpdate: report.permissions.serviceUpdate,
      columnRevokeUnderTableGrant: report.permissions.columnRevokeUnderTableGrant,
      tableDmlRevoke: report.permissions.tableDmlRevoke,
      grantsBefore: report.permissions.grantsBefore,
      grantsAfter: report.permissions.grantsAfter,
      anonSelectAfter: report.permissions.anonSelectAfterLeastPrivilege,
      anonUpdateAfter: report.permissions.anonUpdateAfterLeastPrivilege,
      serviceAfter: report.permissions.serviceAfterLeastPrivilege,
    },
    sitemap: report.sitemap,
    countMismatch: countDiffs.filter((row) => !row.match),
    fixtureMismatch: fixtureSql.filter((row) => !row.match),
  }, null, 2));
  await admin.end();
  await embedded.stop();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
