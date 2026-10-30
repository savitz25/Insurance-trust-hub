import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import {
  assertCompleteFloridaHubPage,
  compareFloridaHubOrder,
  mergeFloridaHubPage,
} from './florida-hub-merge';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  floridaHubIdPredicate,
  isFloridaHubMember,
  launchCountiesForHubSlug,
  uniqueProvidersById,
} from './launch-counties';

const root = process.cwd();

const CENSUS: Record<string, number> = {
  miami_dade: 9630,
  broward: 7936,
  palm_beach: 5147,
  duval: 2696,
  hillsborough: 4352,
  orange: 4723,
  osceola: 1086,
  seminole: 1509,
  pinellas: 2992,
  pasco: 1390,
};

const HUBS: Record<string, readonly string[]> = {
  'miami-dade': ['miami_dade'],
  'broward-county': ['broward'],
  broward: ['broward'],
  'palm-beach-county': ['palm_beach'],
  jacksonville: ['duval'],
  tampa: ['hillsborough', 'pinellas', 'pasco'],
  orlando: ['orange', 'osceola', 'seminole'],
  'miami-fort-lauderdale': ['miami_dade', 'broward', 'palm_beach'],
};

test('Florida hub census ids and company totals stay the recorded set', () => {
  assert.equal(
    Object.values(CENSUS).reduce((sum, count) => sum + count, 0),
    41461
  );
  assert.deepEqual(
    FL_LAUNCH_COUNTIES.map((county) => county.id).sort(),
    Object.keys(CENSUS).sort()
  );
  for (const [slug, ids] of Object.entries(HUBS)) {
    assert.deepEqual(
      launchCountiesForHubSlug(slug).map((county) => county.id),
      ids
    );
  }
  const sum = (ids: readonly string[]) => ids.reduce((total, id) => total + CENSUS[id], 0);
  assert.equal(sum(HUBS['miami-dade']), 9630);
  assert.equal(sum(HUBS.tampa), 8734);
  assert.equal(sum(HUBS.orlando), 7318);
  assert.equal(sum(HUBS['miami-fort-lauderdale']), 22713);
});

test('hub membership is the launch county id, not county text', () => {
  const miami = launchCountiesForHubSlug('miami-dade');
  const southFlorida = launchCountiesForHubSlug('miami-fort-lauderdale');
  assert.equal(floridaHubIdPredicate('miami_dade'), 'contact->>launch_county_id.eq.miami_dade');
  assert.equal(floridaHubIdPredicate('miami_dade').includes(','), false);
  assert.equal(isFloridaHubMember({ launchCountyId: 'miami_dade' }, miami), true);
  assert.equal(isFloridaHubMember({ launchCountyId: 'miami_dade' }, southFlorida), true);
  assert.equal(isFloridaHubMember({ launchCountyId: 'broward' }, miami), false);
  assert.equal(isFloridaHubMember({ launchCountyId: null }, miami), false);
  assert.equal(isFloridaHubMember({ launchCountyId: '   ' }, miami), false);
  const backfill = countyMatchOrParts(FL_LAUNCH_COUNTIES.find((county) => county.id === 'miami_dade')!);
  assert.ok(backfill.some((part) => part.startsWith('short_description.ilike.')));
});

test('merged pages do not drop or repeat providers', () => {
  const streams = [0, 1, 2].map((stream) =>
    Array.from({ length: 5 }, (_, index) => {
      const n = index * 3 + stream;
      return { id: `id-${n}`, name: `Agency ${String(n).padStart(2, '0')}` };
    })
  );
  const pages = [0, 5, 10].map((from) => mergeFloridaHubPage(streams, from, 5));
  const ids = pages.flat().map((row) => row.id);
  assert.deepEqual(
    ids,
    Array.from({ length: 15 }, (_, n) => `id-${n}`)
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(uniqueProvidersById(pages[0]).length, pages[0].length);
});

test('a short Florida hub page is a failed read', () => {
  assert.doesNotThrow(() =>
    assertCompleteFloridaHubPage({ total: 250, from: 200, pageSize: 100, rowCount: 50 })
  );
  assert.throws(
    () => assertCompleteFloridaHubPage({ total: 9630, from: 0, pageSize: 100, rowCount: 99 }),
    /Florida hub inventory page incomplete/
  );
  assert.throws(
    () => assertCompleteFloridaHubPage({ total: 9630, from: 0, pageSize: 100, rowCount: 0 }),
    /Florida hub inventory page incomplete/
  );
});

test('the hub read uses one county id and does not turn a failure into an empty listing', () => {
  const source = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const readStart = source.indexOf('async function readFloridaHubInventory');
  const readEnd = source.indexOf('const readFloridaHubInventoryCached');
  const readBody = source.slice(readStart, readEnd);
  const chunkStart = source.indexOf('async function readFloridaCountyChunk');
  const chunkEnd = source.indexOf('async function readFloridaCountyPrefix');
  const chunkBody = source.slice(chunkStart, chunkEnd);
  assert.ok(readBody.includes('countFloridaHubCounty'));
  assert.ok(readBody.includes('FLORIDA_HUB_DB_CONCURRENCY'));
  assert.ok(chunkBody.includes('floridaHubIdPredicate(countyId)'));
  assert.ok(chunkBody.includes(".order('name'"));
  assert.ok(chunkBody.includes(".order('id'"));
  assert.equal(chunkBody.includes('.join('), false);
  assert.equal(readBody.includes('hubMatchOrParts'), false);
  assert.equal(readBody.includes('countyMatchOrParts'), false);
  assert.equal(readBody.includes('floridaHubIdOrParts'), false);
  assert.equal(readBody.includes('providerMatchesLaunchCounties'), false);
  assert.equal(readBody.includes('provider_name_nfc'), false);
  assert.equal(readBody.includes('overFetch'), false);
  assert.equal(readBody.includes('countVerifiedForCounties'), false);
  assert.ok(readBody.includes('canShowAsVerified(resolveProviderTrustState(provider))'));
  assert.ok(readBody.includes('assertCompleteFloridaHubPage'));
  const catchBody = readBody.slice(readBody.lastIndexOf('} catch {'));
  assert.ok(catchBody.includes("throw new Error('Florida hub inventory unavailable')"));
  assert.equal(catchBody.includes('emptyInventory'), false);
  assert.equal(catchBody.includes('total: 0'), false);
  assert.ok(source.includes('cache(readFloridaHubInventory)'));

  const countStart = source.indexOf('async function countVerifiedForCounties');
  const countEnd = source.indexOf('function emptyInventory');
  const directoryCount = source.slice(countStart, countEnd);
  assert.ok(directoryCount.includes('hubMatchOrParts'));

  const helper = readFileSync(join(root, 'lib/dfs/launch-counties.ts'), 'utf8');
  assert.equal(helper.includes('floridaHubIdOrParts'), false);
  const queries = readFileSync(join(root, 'lib/providers/queries.ts'), 'utf8');
  assert.ok(queries.includes('countyMatchOrParts'));
  const backfill = readFileSync(join(root, 'scripts/dfs/backfill-provider-county.ts'), 'utf8');
  assert.ok(backfill.includes('countyMatchOrParts'));
});

test('multi-county name ties stay on id and the in-memory merge is under 1000 ms', () => {
  const tied = compareFloridaHubOrder(
    { id: '0002', name: 'Same Agency' },
    { id: '0001', name: 'Same Agency' }
  );
  assert.ok(tied > 0);
  const started = performance.now();
  const streams = [9630, 7936, 5147].map((count, stream) =>
    Array.from({ length: count }, (_, index) => {
      const n = index * 3 + stream;
      return { id: `id-${n}`, name: `Agency ${String(n).padStart(7, '0')}` };
    })
  );
  const page = mergeFloridaHubPage(streams, 22600, 100);
  const elapsed = performance.now() - started;
  assert.equal(page.length, 100);
  assert.equal(new Set(page.map((row) => row.id)).size, 100);
  assert.ok(elapsed < 1000, `in-memory merge took ${elapsed} ms`);
});
