import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  floridaHubIdOrParts,
  floridaHubIdPredicate,
  launchCountiesForHubSlug,
  sumFloridaCountyCounts,
} from './launch-counties';

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

test('Florida hub SQL uses launch_county_id equalities only', () => {
  for (const [slug, ids] of Object.entries(expectedIds)) {
    const counties = launchCountiesForHubSlug(slug);
    assert.deepEqual(counties.map((county) => county.id), ids);
    const predicate = floridaHubIdOrParts(counties);
    assert.equal(
      predicate,
      ids.map((id) => `contact->>launch_county_id.eq.${id}`).join(',')
    );
    assert.equal(predicate.includes('ilike'), false);
    assert.equal(predicate.includes('short_description'), false);
    assert.equal(predicate.includes('county_normalized'), false);
    assert.equal(predicate.includes('states_licensed'), false);
    assert.equal(predicate.includes('contact->>county.eq.'), false);
  }
  assert.equal(
    floridaHubIdPredicate('miami_dade'),
    'contact->>launch_county_id.eq.miami_dade'
  );
});

test('backfill county matcher still includes description ilike', () => {
  const miami = FL_LAUNCH_COUNTIES.find((county) => county.id === 'miami_dade');
  assert.ok(miami);
  const parts = countyMatchOrParts(miami);
  assert.equal(parts[0], 'contact->>launch_county_id.eq.miami_dade');
  assert.ok(parts.some((part) => part.startsWith('short_description.ilike.')));
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

test('Florida hub inventory read stays fail-closed on the id predicate', () => {
  const source = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const readStart = source.indexOf('async function readFloridaHubInventory');
  const readEnd = source.indexOf('const readFloridaHubInventoryCached');
  const readBody = source.slice(readStart, readEnd);
  assert.ok(readBody.includes('floridaHubIdOrParts(counties)'));
  assert.equal(readBody.includes('countyMatchOrParts'), false);
  assert.equal(readBody.includes('hubMatchOrParts'), false);
  assert.equal(readBody.includes(".contains('states_licensed'"), false);
  assert.ok(readBody.includes("throw new Error('Florida hub inventory unavailable')"));
  const catchBody = readBody.slice(readBody.lastIndexOf('} catch {'));
  assert.equal(catchBody.includes('emptyInventory'), false);
  assert.equal(catchBody.includes('total: 0'), false);

  const countStart = source.indexOf('async function countVerifiedForCounties');
  const countEnd = source.indexOf('function emptyInventory');
  const countBody = source.slice(countStart, countEnd);
  assert.ok(countBody.includes('floridaHubIdPredicate(county.id)'));
  assert.ok(countBody.includes('sumFloridaCountyCounts(counts, requireSuccessfulLookup)'));
  assert.equal(countBody.includes('countyMatchOrParts'), false);
  assert.equal(countBody.includes(".contains('states_licensed'"), false);
  const helper = readFileSync(join(root, 'lib/dfs/launch-counties.ts'), 'utf8');
  assert.ok(helper.includes("throw new Error('Florida hub inventory count unavailable')"));
  assert.ok(source.includes('cache(readFloridaHubInventory)'));
});
