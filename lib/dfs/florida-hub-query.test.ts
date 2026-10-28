import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { mergeFloridaHubPage } from './florida-hub-merge';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  floridaHubIdOrParts,
  floridaHubIdPredicate,
  isFloridaHubMember,
  launchCountiesForHubSlug,
  sumFloridaCountyCounts,
  uniqueProvidersById,
} from './launch-counties';
import { foldPublicationSignals, publicationCountTasks } from '../hubs/publication-plan';
import { mapWithConcurrency, PUBLICATION_DB_CONCURRENCY } from '../map-with-concurrency';

const root = process.cwd();

const expectedIds: Record<string, readonly string[]> = {
  'miami-dade': ['miami_dade'],
  'broward-county': ['broward'],
  'palm-beach-county': ['palm_beach'],
  tampa: ['hillsborough', 'pinellas', 'pasco'],
  orlando: ['orange', 'osceola', 'seminole'],
  jacksonville: ['duval'],
  'miami-fort-lauderdale': ['miami_dade', 'broward', 'palm_beach'],
};

test('Florida hub SQL uses one launch_county_id equality per county', () => {
  for (const [slug, ids] of Object.entries(expectedIds)) {
    const counties = launchCountiesForHubSlug(slug);
    assert.deepEqual(counties.map((county) => county.id), ids);
    for (const id of ids) {
      const predicate = floridaHubIdPredicate(id);
      assert.equal(predicate, `contact->>launch_county_id.eq.${id}`);
      assert.equal(predicate.includes(','), false);
      assert.equal(predicate.includes('ilike'), false);
      assert.equal(predicate.includes('short_description'), false);
      assert.equal(predicate.includes('county_normalized'), false);
      assert.equal(predicate.includes('states_licensed'), false);
      assert.equal(predicate.includes('contact->>county.eq.'), false);
    }
    const combined = floridaHubIdOrParts(counties);
    assert.equal(combined.split(',').length, ids.length);
  }
});

test('backfill county matcher still includes description ilike', () => {
  const miami = FL_LAUNCH_COUNTIES.find((county) => county.id === 'miami_dade');
  assert.ok(miami);
  const parts = countyMatchOrParts(miami);
  assert.equal(parts[0], 'contact->>launch_county_id.eq.miami_dade');
  assert.ok(parts.some((part) => part.startsWith('short_description.ilike.')));
});

test('launch county id decides hub membership when county text disagrees', () => {
  const miami = launchCountiesForHubSlug('miami-dade');
  const broward = launchCountiesForHubSlug('broward-county');
  const southFlorida = launchCountiesForHubSlug('miami-fort-lauderdale');
  const mismatched = { launchCountyId: 'miami_dade' };
  assert.equal(isFloridaHubMember(mismatched, miami), true);
  assert.equal(isFloridaHubMember(mismatched, southFlorida), true);
  assert.equal(isFloridaHubMember(mismatched, broward), false);
  assert.equal(isFloridaHubMember({ launchCountyId: null }, miami), false);
  assert.equal(isFloridaHubMember({ launchCountyId: '   ' }, miami), false);
  assert.equal(isFloridaHubMember({ launchCountyId: 'not_a_county' }, miami), false);

  for (const county of FL_LAUNCH_COUNTIES) {
    const homes = FL_LAUNCH_COUNTIES.filter((candidate) =>
      isFloridaHubMember({ launchCountyId: county.id }, [candidate])
    );
    assert.deepEqual(homes.map((home) => home.id), [county.id]);
  }
});

test('multi-county pages keep one card per provider id', () => {
  const rows = uniqueProvidersById([
    { id: 'hillsborough-agency', name: 'Alpha' },
    { id: 'hillsborough-agency', name: 'Alpha duplicate' },
    { id: 'pinellas-agency', name: 'Beta' },
    { id: '', name: 'Missing' },
  ]);
  assert.deepEqual(rows.map((row) => row.id), ['hillsborough-agency', 'pinellas-agency']);
});

test('a failed county count does not become a smaller total', () => {
  assert.equal(sumFloridaCountyCounts([9630, 7936, 5147], true), 22713);
  assert.equal(sumFloridaCountyCounts([8734], true), 8734);
  assert.equal(sumFloridaCountyCounts([], true), 0);
  assert.equal(sumFloridaCountyCounts([1, null], false), 0);
  assert.equal(sumFloridaCountyCounts([null], false), 0);
  assert.throws(
    () => sumFloridaCountyCounts([9630, null], true),
    /Florida hub inventory count unavailable/
  );
});

test('Florida hub inventory read stays fail-closed on per-id streams', () => {
  const source = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const readStart = source.indexOf('async function readFloridaCountyChunk');
  const readEnd = source.indexOf('export async function getVerifiedProvidersForHub');
  const readBody = source.slice(readStart, readEnd);
  assert.ok(readBody.includes('floridaHubIdPredicate('));
  assert.ok(readBody.includes('mergeFloridaHubPage('));
  assert.ok(readBody.includes(".contains('states_licensed', ['FL'])"));
  assert.ok(readBody.includes(".order('name'"));
  assert.ok(readBody.includes(".order('id'"));
  assert.equal(readBody.includes('floridaHubIdOrParts'), false);
  assert.equal(readBody.includes('canShowAsVerified'), false);
  assert.equal(readBody.includes('filterVerifiedProviders'), false);
  assert.equal(readBody.includes('providerMatchesLaunchCounties'), false);
  assert.equal(readBody.includes('countyMatchOrParts'), false);
  assert.equal(readBody.includes('hubMatchOrParts'), false);
  assert.equal(readBody.includes('overFetch'), false);
  assert.equal(readBody.includes('safeTotal'), false);
  assert.ok(readBody.includes("throw new Error('Florida hub inventory unavailable')"));
  const catchBody = readBody.slice(readBody.lastIndexOf('} catch {'));
  assert.equal(catchBody.includes('emptyInventory'), false);
  assert.equal(catchBody.includes('total: 0'), false);

  const countStart = source.indexOf('export async function countVerifiedFloridaCounty');
  const countEnd = source.indexOf('function emptyInventory');
  const countBody = source.slice(countStart, countEnd);
  assert.ok(countBody.includes('floridaHubIdPredicate(countyId)'));
  assert.ok(countBody.includes('countVerifiedFloridaCounty(county.id, requireSuccessfulLookup)'));
  assert.ok(countBody.includes('sumFloridaCountyCounts(counts, requireSuccessfulLookup)'));
  assert.ok(countBody.includes('PUBLICATION_DB_CONCURRENCY'));
  assert.equal(countBody.includes('countyMatchOrParts'), false);
  assert.equal(countBody.includes('hubMatchOrParts'), false);
  assert.ok(countBody.includes(".contains('states_licensed', ['FL'])"));
  const helper = readFileSync(join(root, 'lib/dfs/launch-counties.ts'), 'utf8');
  assert.ok(helper.includes("throw new Error('Florida hub inventory count unavailable')"));
  assert.equal(source.includes('cache(readFloridaHubInventory)'), false);
});

test('multi-county pages merge name then id and do not skip a later county', () => {
  const hillsborough = [
    { id: 'c', name: 'Charlie' },
    { id: 'a', name: 'Alpha' },
  ].sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : left.id < right.id ? -1 : 1));
  const pinellas = [{ id: 'b', name: 'Bravo' }];
  const pasco = [
    { id: 'd', name: 'Delta' },
    { id: 'e', name: 'Echo' },
  ];
  const page = mergeFloridaHubPage([hillsborough, pinellas, pasco], 0, 2);
  const next = mergeFloridaHubPage([hillsborough, pinellas, pasco], 2, 2);
  const last = mergeFloridaHubPage([hillsborough, pinellas, pasco], 4, 2);
  assert.deepEqual(page.map((row) => row.id), ['a', 'b']);
  assert.deepEqual(next.map((row) => row.id), ['c', 'd']);
  assert.deepEqual(last.map((row) => row.id), ['e']);
  const tied = mergeFloridaHubPage(
    [
      [{ id: 'm-2', name: 'Same' }],
      [{ id: 'm-1', name: 'Same' }],
    ],
    0,
    2
  );
  assert.deepEqual(tied.map((row) => row.id), ['m-1', 'm-2']);
});

test('publication counts each Florida id once and keeps a failed id off every hub', async () => {
  const slugs = [
    'miami-dade',
    'tampa',
    'orlando',
    'miami-fort-lauderdale',
    'fort-lauderdale',
    'houston',
  ];
  const tasks = publicationCountTasks(slugs);
  const countyTasks = tasks.filter((task) => task.kind === 'fl-county');
  assert.deepEqual(
    countyTasks.map((task) => (task.kind === 'fl-county' ? task.countyId : '')),
    ['miami_dade', 'hillsborough', 'pinellas', 'pasco', 'orange', 'osceola', 'seminole', 'broward', 'palm_beach']
  );
  assert.equal(tasks.filter((task) => task.kind === 'hub').length, 1);
  assert.equal(tasks.some((task) => task.kind === 'hub' && task.hubSlug === 'fort-lauderdale'), false);

  let inFlight = 0;
  let peak = 0;
  await mapWithConcurrency(tasks, PUBLICATION_DB_CONCURRENCY, async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
  });
  assert.equal(PUBLICATION_DB_CONCURRENCY, 3);
  assert.ok(peak <= PUBLICATION_DB_CONCURRENCY);
  assert.ok(peak > 1);

  const counts = new Map<string, number | null>([
    ['fl:miami_dade', 9630],
    ['fl:broward', 7936],
    ['fl:palm_beach', 5147],
    ['fl:hillsborough', 4352],
    ['fl:pinellas', null],
    ['fl:pasco', 1390],
    ['fl:orange', 4723],
    ['fl:osceola', 1086],
    ['fl:seminole', 1509],
    ['hub:houston', 10],
  ]);
  const signals = foldPublicationSignals(
    ['miami-dade', 'tampa', 'orlando', 'miami-fort-lauderdale', 'fort-lauderdale', 'houston', 'jacksonville'],
    counts
  );
  const bySlug = new Map(signals.map((signal) => [signal.hubSlug, signal]));
  assert.deepEqual(bySlug.get('miami-dade'), {
    hubSlug: 'miami-dade',
    lookupSucceeded: true,
    verifiedTotal: 9630,
  });
  assert.deepEqual(bySlug.get('tampa'), {
    hubSlug: 'tampa',
    lookupSucceeded: false,
    verifiedTotal: 0,
  });
  assert.deepEqual(bySlug.get('orlando'), {
    hubSlug: 'orlando',
    lookupSucceeded: true,
    verifiedTotal: 7318,
  });
  assert.deepEqual(bySlug.get('miami-fort-lauderdale'), {
    hubSlug: 'miami-fort-lauderdale',
    lookupSucceeded: true,
    verifiedTotal: 22713,
  });
  assert.deepEqual(bySlug.get('fort-lauderdale'), {
    hubSlug: 'fort-lauderdale',
    lookupSucceeded: true,
    verifiedTotal: 0,
  });
  assert.deepEqual(bySlug.get('houston'), {
    hubSlug: 'houston',
    lookupSucceeded: true,
    verifiedTotal: 10,
  });
  assert.deepEqual(bySlug.get('jacksonville'), {
    hubSlug: 'jacksonville',
    lookupSucceeded: false,
    verifiedTotal: 0,
  });
});
