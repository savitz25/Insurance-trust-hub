import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { assertCompleteFloridaHubPage } from './florida-hub-merge';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  floridaHubIdPredicate,
  isFloridaHubMember,
  launchCountiesForHubSlug,
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

const IMPROVED_HUBS = [
  'miami-dade',
  'broward',
  'broward-county',
  'palm-beach-county',
  'jacksonville',
] as const;

const RETAINED_HUBS = ['tampa', 'orlando', 'miami-fort-lauderdale'] as const;

const precomposed = 'Zoé Order Lab';
const combining = 'Zoe\u0301 Order Lab';
const precomposedId = '00000000-0000-4000-8000-000000000001';
const combiningId = '00000000-0000-4000-8000-000000000002';
const alphaId = 'aaaaaaaa-0000-4000-8000-000000000010';
const zuluId = 'ffffffff-0000-4000-8000-0000000000ff';

type Row = { id: string; name: string };

/**
 * Comparator removed from the live hub read after it was run at 2443ad6.
 * Raw en-US collation, then id. It is not provider_name_nfc.
 */
const rejectedCollator = new Intl.Collator('en-US', { usage: 'sort', sensitivity: 'variant' });

function rejectedCompareFloridaHubOrder(left: Row, right: Row): number {
  const byName = rejectedCollator.compare(left.name, right.name);
  if (byName !== 0) return byName;
  return rejectedCollator.compare(left.id, right.id);
}

function rejectedMergeFloridaHubPage(streams: readonly (readonly Row[])[], from: number, pageSize: number): Row[] {
  const indexes = streams.map(() => 0);
  const merged: Row[] = [];
  const need = Math.max(0, from) + Math.max(0, pageSize);
  while (merged.length < need) {
    let bestStream = -1;
    for (let stream = 0; stream < streams.length; stream += 1) {
      const row = streams[stream][indexes[stream]];
      if (!row) continue;
      if (
        bestStream < 0 ||
        rejectedCompareFloridaHubOrder(row, streams[bestStream][indexes[bestStream]]) < 0
      ) {
        bestStream = stream;
      }
    }
    if (bestStream < 0) break;
    merged.push(streams[bestStream][indexes[bestStream]]);
    indexes[bestStream] += 1;
  }
  return merged.slice(from, from + pageSize);
}

/** Recorded Linux PostgreSQL 17.6 order: combining acute before precomposed. */
function simulatedPostgresRawOrder(left: Row, right: Row): number {
  const nfcEqual = left.name.normalize('NFC') === right.name.normalize('NFC');
  const leftCombining = left.name.includes('\u0301');
  const rightCombining = right.name.includes('\u0301');
  if (nfcEqual && left.name !== right.name && leftCombining !== rightCombining) {
    return leftCombining ? -1 : 1;
  }
  return rejectedCompareFloridaHubOrder(left, right);
}

function nfcNameThenId(left: Row, right: Row): number {
  const byName = rejectedCollator.compare(left.name.normalize('NFC'), right.name.normalize('NFC'));
  if (byName !== 0) return byName;
  return rejectedCollator.compare(left.id, right.id);
}

function sortPg(rows: readonly Row[]): Row[] {
  return [...rows].sort(simulatedPostgresRawOrder);
}

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
  for (const slug of IMPROVED_HUBS) assert.equal(launchCountiesForHubSlug(slug).length, 1);
  for (const slug of RETAINED_HUBS) assert.ok(launchCountiesForHubSlug(slug).length > 1);
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

test('forced Zoe ids fail full-order equality on the removed multi-county merge', () => {
  const pre: Row = { id: precomposedId, name: precomposed };
  const comb: Row = { id: combiningId, name: combining };
  const alpha: Row = { id: alphaId, name: 'Alpha Order Lab' };
  const zulu: Row = { id: zuluId, name: 'Zulu Order Lab' };
  assert.equal(precomposed.normalize('NFC'), combining.normalize('NFC'));
  assert.notEqual(precomposed, combining);
  assert.equal(rejectedCollator.compare(precomposed, combining), 0);
  assert.equal(rejectedCompareFloridaHubOrder(pre, comb), -1);
  assert.equal(simulatedPostgresRawOrder(comb, pre), -1);
  assert.equal(simulatedPostgresRawOrder(pre, comb), 1);
  assert.equal(nfcNameThenId(pre, comb), rejectedCompareFloridaHubOrder(pre, comb));

  const countyA = sortPg([alpha, comb]);
  const countyB = sortPg([pre, zulu]);
  const authoritative = sortPg([alpha, comb, pre, zulu]);
  assert.deepEqual(countyA.map((row) => row.id), [alphaId, combiningId]);
  assert.deepEqual(countyB.map((row) => row.id), [precomposedId, zuluId]);
  assert.deepEqual(
    authoritative.map((row) => row.id),
    [alphaId, combiningId, precomposedId, zuluId]
  );

  const walk = (pageSize: number) => {
    const total = authoritative.length;
    const seen = new Set<string>();
    let repeated = 0;
    const collected: string[] = [];
    const pages: string[][] = [];
    for (let from = 0; from < total; from += pageSize) {
      const need = from + pageSize;
      const page = rejectedMergeFloridaHubPage(
        [countyA.slice(0, need), countyB.slice(0, need)],
        from,
        pageSize
      );
      pages.push(page.map((row) => row.id));
      for (const row of page) {
        if (seen.has(row.id)) repeated += 1;
        seen.add(row.id);
        collected.push(row.id);
      }
    }
    let missing = 0;
    for (const row of authoritative) if (!seen.has(row.id)) missing += 1;
    return {
      missing,
      repeated,
      pages,
      collected,
      fullOrderEqual: collected.join(',') === authoritative.map((row) => row.id).join(','),
    };
  };

  const pageSize2 = walk(2);
  assert.equal(pageSize2.missing, 0);
  assert.equal(pageSize2.repeated, 0);
  assert.equal(pageSize2.fullOrderEqual, false);
  assert.deepEqual(pageSize2.pages[0], [alphaId, precomposedId]);
  assert.deepEqual(pageSize2.pages[1], [combiningId, zuluId]);
  assert.deepEqual(authoritative.slice(0, 2).map((row) => row.id), [alphaId, combiningId]);
  assert.deepEqual(pageSize2.collected, [alphaId, precomposedId, combiningId, zuluId]);

  const pageSize1 = walk(1);
  assert.equal(pageSize1.missing, 0);
  assert.equal(pageSize1.repeated, 0);
  assert.equal(pageSize1.fullOrderEqual, false);
  assert.deepEqual(pageSize1.pages.map((page) => page[0]), [
    alphaId,
    precomposedId,
    combiningId,
    zuluId,
  ]);

  const nfcMerged = [...authoritative]
    .sort(nfcNameThenId)
    .map((row) => row.id);
  assert.deepEqual(nfcMerged, pageSize2.collected);
  assert.notDeepEqual(nfcMerged, authoritative.map((row) => row.id));

  const duplicateA: Row = { id: 'm-2', name: 'Duplicate Order Lab' };
  const duplicateB: Row = { id: 'm-1', name: 'Duplicate Order Lab' };
  assert.ok(rejectedCompareFloridaHubOrder(duplicateA, duplicateB) > 0);
  assert.ok(simulatedPostgresRawOrder(duplicateA, duplicateB) > 0);
  assert.deepEqual(
    rejectedMergeFloridaHubPage([sortPg([duplicateA]), sortPg([duplicateB])], 0, 2).map((row) => row.id),
    ['m-1', 'm-2']
  );
  assert.deepEqual(sortPg([duplicateA, duplicateB]).map((row) => row.id), ['m-1', 'm-2']);
});

test('a short Florida hub page is a failed read and a real zero is complete', () => {
  assert.doesNotThrow(() =>
    assertCompleteFloridaHubPage({ total: 250, from: 200, pageSize: 100, rowCount: 50 })
  );
  assert.doesNotThrow(() =>
    assertCompleteFloridaHubPage({ total: 0, from: 0, pageSize: 100, rowCount: 0 })
  );
  assert.throws(
    () => assertCompleteFloridaHubPage({ total: 9630, from: 0, pageSize: 100, rowCount: 99 }),
    /Florida hub inventory page incomplete/
  );
  assert.throws(
    () => assertCompleteFloridaHubPage({ total: 9630, from: 0, pageSize: 100, rowCount: 0 }),
    /Florida hub inventory page incomplete/
  );
  assert.throws(
    () => assertCompleteFloridaHubPage({ total: 0, from: 0, pageSize: 100, rowCount: 1 }),
    /Florida hub inventory page incomplete/
  );
});

test('single-county pages use one id and multi-county pages keep the wide match', () => {
  const source = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const mergeSource = readFileSync(join(root, 'lib/dfs/florida-hub-merge.ts'), 'utf8');
  assert.equal(mergeSource.includes('mergeFloridaHubPage'), false);
  assert.equal(mergeSource.includes('Intl.Collator'), false);
  assert.equal(source.includes('mergeFloridaHubPage'), false);
  assert.equal(source.includes('compareFloridaHubOrder'), false);
  assert.equal(source.includes('readFloridaCountyPrefix'), false);
  assert.equal(source.includes('provider_name_nfc'), false);
  assert.equal(source.includes('floridaHubIdOrParts'), false);
  assert.equal(source.includes("normalize('NFC')"), false);

  for (const slug of [...IMPROVED_HUBS, ...RETAINED_HUBS]) {
    assert.ok(source.includes(slug));
  }
  assert.ok(source.includes('those five single-county hub page reads'));

  const readStart = source.indexOf('async function readFloridaHubInventory');
  const readEnd = source.indexOf('const readFloridaHubInventoryCached');
  const readBody = source.slice(readStart, readEnd);
  const singleStart = readBody.indexOf('if (counties.length === 1)');
  const multiStart = readBody.indexOf('const or = hubMatchOrParts(counties)');
  const catchStart = readBody.lastIndexOf('} catch {');
  const singleBranch = readBody.slice(singleStart, multiStart);
  const multiBranch = readBody.slice(multiStart, catchStart);
  const catchBody = readBody.slice(catchStart);

  assert.ok(singleBranch.includes('countFloridaHubCounty'));
  assert.ok(singleBranch.includes('readFloridaCountyChunk'));
  assert.ok(singleBranch.includes('canShowAsVerified(resolveProviderTrustState(provider))'));
  assert.ok(singleBranch.includes('assertCompleteFloridaHubPage'));
  assert.ok(singleBranch.includes("throw new Error('Florida hub inventory eligibility unavailable')"));
  assert.equal(singleBranch.includes('hubMatchOrParts'), false);
  assert.equal(singleBranch.includes('providerMatchesLaunchCounties'), false);
  assert.equal(singleBranch.includes('filterVerifiedProviders'), false);
  assert.equal(singleBranch.includes('overFetch'), false);

  assert.ok(multiBranch.includes('hubMatchOrParts(counties)'));
  assert.ok(multiBranch.includes('countVerifiedForCounties(counties, true)'));
  assert.ok(multiBranch.includes('overFetch'));
  assert.ok(multiBranch.includes(".order('name'"));
  assert.equal(multiBranch.includes(".order('id'"), false);
  assert.ok(multiBranch.includes('filterVerifiedProviders(mapped)'));
  assert.ok(multiBranch.includes('canShowAsVerified(resolveProviderTrustState(p))'));
  assert.ok(multiBranch.includes('providerMatchesLaunchCounties(p, counties)'));
  assert.ok(multiBranch.includes('if (!data.length)'));
  assert.ok(multiBranch.includes('...emptyInventory'));
  assert.equal(multiBranch.includes('assertCompleteFloridaHubPage'), false);
  assert.equal(multiBranch.includes('readFloridaCountyChunk'), false);
  assert.equal(multiBranch.includes('countFloridaHubCounty'), false);

  assert.ok(catchBody.includes("throw new Error('Florida hub inventory unavailable')"));
  assert.equal(catchBody.includes('emptyInventory'), false);
  assert.equal(catchBody.includes('total: 0'), false);
  assert.ok(source.includes('cache(readFloridaHubInventory)'));

  const chunkStart = source.indexOf('async function readFloridaCountyChunk');
  const chunkEnd = source.indexOf('async function readFloridaHubInventory');
  const chunkBody = source.slice(chunkStart, chunkEnd);
  assert.ok(chunkBody.includes('floridaHubIdPredicate(countyId)'));
  assert.ok(chunkBody.includes(".order('name'"));
  assert.ok(chunkBody.includes(".order('id'"));
  assert.equal(chunkBody.includes('.join('), false);
  assert.ok(chunkBody.includes('Florida hub inventory rows unavailable'));
  assert.ok(chunkBody.includes('rows.length !== data.length'));

  const countStart = source.indexOf('async function countFloridaHubCounty');
  const countBody = source.slice(countStart, chunkStart);
  assert.ok(countBody.includes('floridaHubIdPredicate(countyId)'));
  assert.ok(countBody.includes("throw new Error('Florida hub inventory count unavailable')"));
  assert.ok(countBody.includes('count == null'));

  const wideCountStart = source.indexOf('async function countVerifiedForCounties');
  const wideCountEnd = source.indexOf('function emptyInventory');
  const wideCount = source.slice(wideCountStart, wideCountEnd);
  assert.ok(wideCount.includes('hubMatchOrParts'));
  assert.ok(wideCount.includes("throw new Error('Florida hub inventory count unavailable')"));
  assert.ok(wideCount.includes('if (error) return 0'));

  const directoryStart = source.indexOf('export async function countVerifiedProvidersForHub');
  const directoryEnd = source.indexOf('export type LaunchNavLiveRow');
  const directoryCount = source.slice(directoryStart, directoryEnd);
  assert.ok(directoryCount.includes('return countVerifiedForCounties(launchCountiesForHubSlug(hubSlug));'));
  assert.equal(directoryCount.includes('countVerifiedForCounties(launchCountiesForHubSlug(hubSlug), true)'), false);

  const helper = readFileSync(join(root, 'lib/dfs/launch-counties.ts'), 'utf8');
  assert.equal(helper.includes('floridaHubIdOrParts'), false);
  const queries = readFileSync(join(root, 'lib/providers/queries.ts'), 'utf8');
  assert.ok(queries.includes('countyMatchOrParts'));
  const backfill = readFileSync(join(root, 'scripts/dfs/backfill-provider-county.ts'), 'utf8');
  assert.ok(backfill.includes('countyMatchOrParts'));
});
