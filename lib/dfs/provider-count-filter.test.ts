import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { structuredIdCountFilter } from './provider-count-filter';
import { isReadyCount } from './provider-count';
import { clearRememberedCounts, rememberCount, setCountClock } from './provider-count-flight';

const hub = readFileSync(join(process.cwd(), 'lib/dfs/providers-by-county.ts'), 'utf8');

function sliceBetween(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `missing slice ${start}`);
  return source.slice(from, to);
}

test('structured id count is one jsonb key and no county text', () => {
  const filter = structuredIdCountFilter(['miami_dade', 'miami_dade'], 'launch_county_id');
  assert.equal(filter, 'contact->>launch_county_id.eq.miami_dade');
  assert.equal(filter.includes('ilike'), false);
  assert.equal(filter.includes('county.eq'), false);
  assert.equal(filter.includes('launch_market_id'), false);
});

test('same-key ids stay on one field', () => {
  const filter = structuredIdCountFilter(['reno', 'carson-city'], 'launch_market_id');
  assert.equal(
    filter,
    'contact->>launch_market_id.eq.reno,contact->>launch_market_id.eq.carson-city'
  );
  assert.equal(filter.includes('launch_county_id'), false);
});

test('unsafe ids are rejected before they reach PostgREST or()', () => {
  assert.throws(() => structuredIdCountFilter(['miami_dade,broward'], 'launch_county_id'));
  assert.throws(() => structuredIdCountFilter(['Miami Dade'], 'launch_county_id'));
  assert.throws(() => structuredIdCountFilter([], 'launch_county_id'));
});

test('a successful count is shared and a failure is not stored', async () => {
  setCountClock(null);
  clearRememberedCounts();
  let calls = 0;
  const load = () => {
    calls += 1;
    return Promise.resolve(9630);
  };
  const [a, b] = await Promise.all([
    rememberCount('fl:miami_dade', 50_000, load),
    rememberCount('fl:miami_dade', 50_000, load),
  ]);
  assert.equal(isReadyCount(a) && a.value, 9630);
  assert.equal(isReadyCount(b) && b.value, 9630);
  assert.equal(calls, 1);
  const again = await rememberCount('fl:miami_dade', 50_000, load);
  assert.equal(isReadyCount(again) && again.value, 9630);
  assert.equal(calls, 1);

  let failures = 0;
  const fail = () => {
    failures += 1;
    return Promise.reject(new Error('provider count unavailable'));
  };
  await assert.rejects(rememberCount('fl:orange', 50_000, fail));
  await assert.rejects(rememberCount('fl:orange', 50_000, fail));
  assert.equal(failures, 1);
  clearRememberedCounts();
});

test('florida exact count no longer uses the wide county OR', () => {
  const countFn = sliceBetween(
    hub,
    'async function countVerifiedForCounties',
    'function emptyInventory'
  );
  assert.match(countFn, /exactStructuredProviderCount\('FL', 'launch_county_id'/);
  assert.equal(countFn.includes('hubMatchOrParts'), false);
  assert.equal(countFn.includes('ilike'), false);
});

test('hub page reads still use the wide matcher and name, then id', () => {
  const pageFn = sliceBetween(
    hub,
    'async function readFloridaHubInventory',
    'export async function getVerifiedProvidersForHub'
  );
  assert.match(pageFn, /hubMatchOrParts\(counties\)/);
  assert.match(
    pageFn,
    /\.order\('name', \{ ascending: true \}\)\.order\('id', \{ ascending: true \}\)/
  );
});

test('market head counts use one id key; row reads keep both keys', () => {
  assert.match(hub, /exactMarketHeadCount\(/);
  assert.match(hub, /contact->>launch_county_id\.eq\.\$\{id\}/);
  const tx = sliceBetween(hub, 'async function getTxHubInventory', 'async function getNjHubInventory');
  assert.match(tx, /exactMarketHeadCount\('TX', marketIds\)/);
  assert.match(tx, /launch_market_id\.eq/);
  assert.match(tx, /launch_county_id\.eq/);
});
