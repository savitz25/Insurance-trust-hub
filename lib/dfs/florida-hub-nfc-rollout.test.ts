import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import {
  applyFloridaHubOrder,
  compareFloridaHubOrder,
  compareFloridaHubOrderByNfc,
  FLORIDA_HUB_ORDER_COLUMN,
  mergeFloridaHubPage,
} from './florida-hub-merge';
import { floridaHubIdPredicate } from './launch-counties';

const root = process.cwd();
const precomposed = 'Zoé Order Lab';
const combining = 'Zoe\u0301 Order Lab';
const smallerId = '00000000-0000-4000-8000-000000000001';
const largerId = '00000000-0000-4000-8000-000000000002';

type SwitchFlags = { database: boolean; comparator: boolean };

function switchFlags(providersSource: string, mergeSource: string): SwitchFlags {
  const readStart = providersSource.indexOf('async function readFloridaCountyChunk');
  const readEnd = providersSource.indexOf('async function readFloridaCountyPrefix');
  const readBody = providersSource.slice(readStart, readEnd);
  const database =
    readBody.includes('applyFloridaHubOrder(') &&
    !readBody.includes(".order('name'") &&
    mergeSource.includes("export const FLORIDA_HUB_ORDER_COLUMN = 'provider_name_nfc'");
  const mergeStart = mergeSource.indexOf('export function mergeFloridaHubPage');
  const mergeHead = mergeSource.slice(mergeStart, mergeSource.indexOf('): T[]', mergeStart));
  const comparator = /=\s*compareFloridaHubOrderByNfc\b/.test(mergeHead);
  return { database, comparator };
}

test('both sides use the NFC contract, and either side alone fails', () => {
  const providers = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const merge = readFileSync(join(root, 'lib/dfs/florida-hub-merge.ts'), 'utf8');
  const live = switchFlags(providers, merge);
  assert.equal(live.database, true);
  assert.equal(live.comparator, true);
  assert.equal(live.database, live.comparator);
  assert.equal(FLORIDA_HUB_ORDER_COLUMN, 'provider_name_nfc');

  const databaseOnly = switchFlags(
    providers.replace('await applyFloridaHubOrder(', "await legacyNameOrder("),
    merge
  );
  assert.equal(databaseOnly.database, false);
  assert.equal(databaseOnly.comparator, true);
  assert.notEqual(databaseOnly.database, databaseOnly.comparator);

  const nameFallback = switchFlags(
    providers.replace(
      'await applyFloridaHubOrder(',
      "await applyFloridaHubOrder( /* .order('name' */ "
    ),
    merge
  );
  assert.equal(nameFallback.database, false);
  assert.equal(nameFallback.comparator, true);

  const columnOnly = switchFlags(
    providers,
    merge.replace(
      "export const FLORIDA_HUB_ORDER_COLUMN = 'provider_name_nfc'",
      "export const FLORIDA_HUB_ORDER_COLUMN = 'name'"
    )
  );
  assert.equal(columnOnly.database, false);
  assert.equal(columnOnly.comparator, true);

  const comparatorOnly = switchFlags(
    providers,
    merge.replace('= compareFloridaHubOrderByNfc', '= compareFloridaHubOrder')
  );
  assert.equal(comparatorOnly.database, true);
  assert.equal(comparatorOnly.comparator, false);
  assert.notEqual(comparatorOnly.database, comparatorOnly.comparator);

  const rawStart = merge.indexOf('export function compareFloridaHubOrder(');
  const nfcStart = merge.indexOf('export function compareFloridaHubOrderByNfc(');
  const rawBody = merge.slice(rawStart, nfcStart);
  const nfcBody = merge.slice(nfcStart, merge.indexOf('export function assertCompleteFloridaHubPage'));
  assert.equal(rawBody.includes(".normalize('NFC')"), false);
  assert.ok(nfcBody.includes(".normalize('NFC')"));
  assert.ok(providers.includes(".order('name'"));
});

test('the default merge follows NFC for the swapped Zoe ids', () => {
  const combiningRow = { id: smallerId, name: combining };
  const precomposedRow = { id: largerId, name: precomposed };
  assert.equal(combining.normalize('NFC'), precomposed.normalize('NFC'));
  assert.notEqual(combining, precomposed);
  const nfc = [combiningRow, precomposedRow].sort(compareFloridaHubOrderByNfc);
  const raw = [combiningRow, precomposedRow].sort(compareFloridaHubOrder);
  const merged = mergeFloridaHubPage([[precomposedRow], [combiningRow]], 0, 2);
  assert.deepEqual(
    merged.map((row) => row.id),
    nfc.map((row) => row.id)
  );
  assert.deepEqual(nfc.map((row) => row.id), [smallerId, largerId]);
  // This Node ties the NFC-equivalent names, so both comparators follow the smaller id.
  // A runtime that ranks the raw names apart must not let that raw order win.
  if (raw.map((row) => row.id).join() !== nfc.map((row) => row.id).join()) {
    assert.notDeepEqual(
      merged.map((row) => row.id),
      raw.map((row) => row.id)
    );
  } else {
    assert.equal(
      compareFloridaHubOrder(combiningRow, precomposedRow),
      compareFloridaHubOrderByNfc(combiningRow, precomposedRow)
    );
  }
  assert.equal(merged.find((row) => row.id === smallerId)?.name, combining);
  assert.equal(merged.find((row) => row.id === largerId)?.name, precomposed);
});

test('a missing computed field fails closed and does not fall back to name order', async () => {
  let calls = 0;
  let url = '';
  const supabase = createClient('http://postgrest.test', 'public-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        calls += 1;
        url = input instanceof Request ? input.url : String(input);
        return new Response(
          JSON.stringify({
            code: 'PGRST204',
            message: "Could not find the 'provider_name_nfc' column of 'providers' in the schema cache",
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      },
    },
  });
  const { data, error } = await applyFloridaHubOrder(
    supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .or(floridaHubIdPredicate('miami_dade'))
  ).range(0, 99);
  assert.equal(calls, 1);
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/rest/v1/providers');
  assert.equal(parsed.searchParams.get('order'), 'provider_name_nfc.asc,id.asc');
  assert.equal(parsed.searchParams.get('select'), '*');
  assert.ok(error);
  assert.equal(data, null);
  assert.equal(url.includes('order=name'), false);

  const source = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const chunkStart = source.indexOf('async function readFloridaCountyChunk');
  const chunkEnd = source.indexOf('async function readFloridaCountyPrefix');
  const chunk = source.slice(chunkStart, chunkEnd);
  assert.ok(chunk.includes("throw new Error('Florida hub inventory rows unavailable')"));
  assert.equal(chunk.includes(".order('name'"), false);
  assert.ok(chunk.includes(".select('*'"));
  assert.equal(chunk.includes('publication_'), false);
  const inventoryStart = source.indexOf('async function readFloridaHubInventory');
  const inventoryEnd = source.indexOf('export async function getVerifiedProvidersForHub');
  const inventory = source.slice(inventoryStart, inventoryEnd);
  assert.ok(inventory.includes("throw new Error('Florida hub inventory unavailable')"));
  const catchBody = inventory.slice(inventory.lastIndexOf('} catch {'));
  assert.equal(catchBody.includes('emptyInventory'), false);
  assert.equal(catchBody.includes(".order('name'"), false);
});

test('the rollout sequence, rollback order, and unrun checklist stay explicit', () => {
  const doc = readFileSync(join(root, 'lib/dfs/ins-nfc-rollout-006.md'), 'utf8');
  assert.ok(doc.includes('Computed-field GO'));
  assert.ok(doc.includes('Independent verification'));
  assert.ok(doc.includes('Application switch'));
  assert.ok(doc.includes('Performance acceptance'));
  assert.ok(doc.includes('revert the application before DROP FUNCTION'));
  assert.ok(doc.includes('NOT RUN'));
  assert.ok(doc.includes('Insurance Security Packet 1'));
  assert.ok(doc.includes('Packet 2 are not altered'));
  assert.ok(doc.includes('publication writer'));
  assert.equal(doc.includes('gojyhmbojbwbpiamoktq'), false);

  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
    ignoreCommand?: string;
  };
  assert.equal(
    vercel.ignoreCommand,
    '[ "$VERCEL_GIT_COMMIT_REF" = "ins-nfc-rollout-006" ]'
  );

  const proof = JSON.parse(
    readFileSync(join(root, 'lib/dfs/ins-ordering-computed-field-proof-005.json'), 'utf8')
  ) as {
    result: string;
    apiSyntax: { order: string };
    security: { publicExecute: boolean; securityDefiner: boolean; anonUnverifiedRows: number };
    apiCostMs: { significantRegression: boolean; idNameNfcDeepMedian: number };
    separation: { hubReadStillOrdersByNameThenId: boolean; sqlPacketRemainsNotApplied: boolean };
    pages: { miami_dade: { missing: number; repeated: number } };
  };
  assert.equal(proof.result, 'PASS');
  assert.equal(proof.apiSyntax.order, 'provider_name_nfc.asc,id.asc');
  assert.equal(proof.security.publicExecute, false);
  assert.equal(proof.security.securityDefiner, false);
  assert.equal(proof.security.anonUnverifiedRows, 0);
  assert.equal(proof.apiCostMs.significantRegression, false);
  assert.equal(proof.apiCostMs.idNameNfcDeepMedian, 63.414);
  assert.equal(proof.separation.hubReadStillOrdersByNameThenId, true);
  assert.equal(proof.separation.sqlPacketRemainsNotApplied, true);
  assert.equal(proof.pages.miami_dade.missing, 0);
  assert.equal(proof.pages.miami_dade.repeated, 0);

  const packet = readFileSync(join(root, 'lib/dfs/ins-ordering-integration-004.not-applied.sql'), 'utf8');
  assert.ok(packet.includes('DO NOT APPLY'));
  assert.equal(packet.includes('CREATE FUNCTION'), false);
  assert.equal(packet.includes('CREATE INDEX'), false);
  assert.equal(packet.includes('ALTER TABLE'), false);
  const migrationName = '20261030160000_provider_name_nfc.sql';
  const migrations = readdirSync(join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
  assert.equal(migrations.filter((name) => name.includes('provider_name_nfc')).length, 1);
  for (const name of migrations) {
    if (name === migrationName) continue;
    const text = readFileSync(join(root, 'supabase/migrations', name), 'utf8');
    assert.equal(text.includes('provider_name_nfc'), false, name);
  }
  const migration = readFileSync(join(root, 'supabase/migrations', migrationName), 'utf8');
  assert.equal(migration.includes('DROP FUNCTION'), false);
  const rollback = readFileSync(join(root, 'supabase/rollbacks', migrationName), 'utf8');
  assert.ok(rollback.includes('DROP FUNCTION IF EXISTS public.provider_name_nfc(public.providers);'));
  assert.equal(rollback.includes('CREATE FUNCTION'), false);

  const repair = JSON.parse(
    readFileSync(join(root, 'lib/dfs/ins-provider-name-nfc-migration-008.json'), 'utf8')
  ) as {
    supabasePerformanceValidated: boolean;
    rows: { verifiedMiamiDade: number };
    thresholds: { statementTimeoutBudgetMs: number; nfcDeepMaxMs: number; significantRegressionDeepDeltaMs: number };
    performance: {
      selectStar: { rawDeepMedianMs: number; nfcDeepMedianMs: number };
      deepDeltaMs: number;
      significantRegression: boolean;
      withinStatementBudget: boolean;
    };
    schemaCache: { notifyReceived: boolean; secondLoadLogged: boolean; orderWaitsForReload: boolean };
    functionAbsentAtEnd: boolean;
  };
  assert.equal(repair.supabasePerformanceValidated, false);
  assert.equal(repair.rows.verifiedMiamiDade, 167000);
  assert.equal(repair.thresholds.statementTimeoutBudgetMs, 3000);
  assert.equal(repair.thresholds.nfcDeepMaxMs, 3000);
  assert.equal(repair.thresholds.significantRegressionDeepDeltaMs, 500);
  assert.equal(repair.performance.selectStar.rawDeepMedianMs, 191.083);
  assert.equal(repair.performance.selectStar.nfcDeepMedianMs, 310.496);
  assert.equal(repair.performance.deepDeltaMs, 119.413);
  assert.equal(repair.performance.significantRegression, false);
  assert.equal(repair.performance.withinStatementBudget, true);
  assert.equal(repair.schemaCache.notifyReceived, true);
  assert.equal(repair.schemaCache.secondLoadLogged, true);
  assert.equal(repair.schemaCache.orderWaitsForReload, false);
  assert.equal(repair.functionAbsentAtEnd, true);
});
