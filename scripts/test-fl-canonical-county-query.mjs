// Isolated fixtures only. No environment files, credentials or live requests.
// node --test scripts/test-fl-canonical-county-query.mjs scripts/test-fl-hub-lookup-errors.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const bundled = await build({
  stdin: { contents: `
    export * from './lib/dfs/canonical-county-query';
    export { FL_LAUNCH_COUNTIES, countyMatchOrParts, launchCountiesForHubSlug } from './lib/dfs/launch-counties';
    export { getHubInventory } from './lib/dfs/providers-by-county';
  `, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'isolated-public-client', setup(build) {
    build.onResolve({ filter: /^@\/lib\/supabase\/(public|config)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents:
      args.path.endsWith('/config') ? 'export const isSupabaseConfigured = () => true;' :
      'export const createPublicClient = () => globalThis.canonicalFixtureClient;'
    }));
  }}],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(require, mod, mod.exports);
const { canonicalFloridaCountQuery: countQuery, canonicalFloridaRowsQuery: rowsQuery,
  FL_LAUNCH_COUNTIES: counties, countyMatchOrParts, launchCountiesForHubSlug, getHubInventory } = mod.exports;
const slugs = [...new Set(counties.flatMap(c => c.hubSlugs))];
const valueAt = (row, field) => field.includes('->>') ? row.contact?.[field.split('->>')[1]] : row[field];
function fragmentMatches(row, fragment) {
  const [, field, op, expected] = fragment.match(/^(.*?)\.(eq|ilike)\.(.*)$/);
  const actual = valueAt(row, field);
  if (op === 'eq') return actual === expected;
  // The real county patterns have only surrounding '%' wildcards.
  assert.match(expected, /^%[^%_]+%$/);
  return typeof actual === 'string' && actual.toLowerCase().includes(expected.slice(1, -1).toLowerCase());
}
const legacyIds = (rows, slug) => rows.filter(row => row.verified && row.states_licensed.includes('FL') &&
  launchCountiesForHubSlug(slug).flatMap(countyMatchOrParts).some(part => fragmentMatches(row, part)))
  .map(row => row.id).sort();

function fixtureRow(id, contact, short_description = '', name = 'Same fixture agency') {
  return { id, slug: `fixture-${id}`, name, verified: true, states_licensed: ['FL'], cities: [],
    categories: ['health'], specialties: [], contact, short_description,
    license_info: { licenses: [{ license_number: 'L987654', state: 'FL', source: 'Florida DFS',
      verification_url: 'https://example.com/dfs', checkedAt: new Date().toISOString(), identityMatchAccepted: true }] } };
}
function fixtureClient(rows, failure = null) {
  const requests = [];
  const client = createClient('https://fixture.invalid', 'fixture-only-not-a-credential', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      const url = new URL(input);
      const q = url.searchParams;
      requests.push({ method: options.method, q, headers: new Headers(options.headers) });
      if (failure) return new Response(JSON.stringify({ code: failure, message: 'isolated failure' }), { status: 500 });
      assert.equal(q.get('verified'), 'eq.true');
      assert.equal(q.get('states_licensed'), 'cs.{FL}');
      let matched = rows.filter(row => row.verified && row.states_licensed.includes('FL'));
      if (q.has('or')) {
        const parts = q.get('or').slice(1, -1).split(',');
        matched = matched.filter(row => parts.some(part => fragmentMatches(row, part)));
      } else {
        const filter = q.get('contact->>launch_county_id');
        assert.ok(filter, 'never issue an unscoped canonical lookup');
        const ids = filter.startsWith('eq.') ? [filter.slice(3)] : filter.slice(4, -1).split(',');
        matched = matched.filter(row => ids.includes(row.contact?.launch_county_id));
      }
      const total = matched.length;
      const order = (q.get('order') ?? '').split(',').filter(Boolean);
      matched.sort((a, b) => {
        for (const item of order) {
          const field = item.split('.')[0];
          if (a[field] === b[field]) continue;
          if (a[field] == null) return 1;
          if (b[field] == null) return -1;
          return a[field] < b[field] ? -1 : 1;
        }
        return 0;
      });
      const offset = Number(q.get('offset') ?? 0);
      const limit = Number(q.get('limit') ?? total);
      return new Response(options.method === 'HEAD' ? null : JSON.stringify(matched.slice(offset, offset + limit)), {
        status: 200, headers: { 'content-type': 'application/json', 'content-range': `*/${total}` },
      });
    } },
  });
  return { client, requests };
}

// A simulation, not a migration or a production inference mechanism.
function simulateUnambiguousBackfill(rows) {
  return rows.map(row => {
    const candidates = counties.filter(c => countyMatchOrParts(c).some(part => fragmentMatches(row, part)));
    if (row.contact?.launch_county_id || candidates.length !== 1) return structuredClone(row);
    return { ...structuredClone(row), contact: { ...row.contact, launch_county_id: candidates[0].id } };
  });
}

test('canonical request shape uses exact HEAD count, county equality and name/id ordering', async () => {
  const { client, requests } = fixtureClient([]);
  assert.equal((await countQuery(client, 'miami-dade')).count, 0);
  assert.deepEqual((await rowsQuery(client, 'miami-dade', 10, 19)).data, []);
  assert.equal(requests[0].method, 'HEAD');
  assert.equal(requests[0].headers.get('prefer'), 'count=exact');
  assert.equal(requests[0].q.get('select'), 'id');
  for (const { q } of requests) {
    assert.equal(q.get('contact->>launch_county_id'), 'eq.miami_dade');
    assert.equal(q.has('or'), false);
    assert.equal(q.has('short_description'), false);
  }
  assert.equal(requests[1].q.get('order'), 'name.asc.nullslast,id.asc');
  assert.equal(requests[1].q.get('offset'), '10');
  assert.equal(requests[1].q.get('limit'), '10');
});

const before = counties.flatMap((c, i) => [
  fixtureRow(`${i}-canonical`, { launch_county_id: c.id, county: c.displayName }),
  fixtureRow(`${i}-text`, { preserved: 'fixture' }, `(${c.displayName} County)`),
  fixtureRow(`${i}-structured`, { county: c.displayName }),
]);
before.push({ ...fixtureRow('unverified', { launch_county_id: 'miami_dade' }), verified: false });
before.push({ ...fixtureRow('other-state', { launch_county_id: 'miami_dade' }), states_licensed: ['TX'] });
const after = simulateUnambiguousBackfill(before);
for (const slug of slugs) {
  test(`${slug}: complete simulated backfill preserves provider IDs and exact count`, async () => {
    const { client, requests } = fixtureClient(after);
    const expected = legacyIds(before, slug);
    const count = await countQuery(client, slug);
    const rows = await rowsQuery(client, slug, 0, 99);
    assert.equal(count.error, null);
    assert.equal(count.count, expected.length);
    assert.deepEqual(rows.data.map(row => row.id).sort(), expected);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].q.get('contact->>launch_county_id'), requests[1].q.get('contact->>launch_county_id'));
  });
}

test('simulation is idempotent and preserves unrelated JSON keys', () => {
  assert.deepEqual(simulateUnambiguousBackfill(after), after);
  assert.equal(after.find(row => row.id === '0-text').contact.preserved, 'fixture');
  assert.equal(before.find(row => row.id === '0-text').contact.launch_county_id, undefined);
});

test('live loader retains text-only and ambiguous rows; future helper is not activated', async () => {
  const text = fixtureRow('text-only', {}, '(Miami-Dade County)');
  const ambiguous = fixtureRow('ambiguous', {}, '(Miami-Dade County) (Broward County)');
  const conflict = fixtureRow('conflict', { launch_county_id: 'broward' }, '(Miami-Dade County)');
  const dataset = [text, ambiguous, conflict];
  const simulated = simulateUnambiguousBackfill(dataset);
  assert.equal(simulated[1].contact.launch_county_id, undefined, 'hold ambiguous inference');
  assert.equal(simulated[2].contact.launch_county_id, 'broward', 'never overwrite a conflicting ID');
  const { client, requests } = fixtureClient(dataset);
  globalThis.canonicalFixtureClient = client;
  const inventory = await getHubInventory('miami-dade');
  assert.equal(inventory.total, 3);
  assert.deepEqual(inventory.providers.map(p => p.id).sort(), ['ambiguous', 'conflict', 'text-only']);
  assert.ok(requests.every(request => request.q.has('or')), 'production retains legacy fallback');
  const future = await rowsQuery(client, 'miami-dade', 0, 99);
  assert.notDeepEqual(future.data.map(p => p.id).sort(), legacyIds(dataset, 'miami-dade'),
    'parity certification must fail for incomplete or ambiguous data');
});

test('equal names and null names have stable, disjoint pages and exact totals across counties', async () => {
  const rows = ['d', 'b', 'e', 'a', 'c'].map((id, i) => fixtureRow(id,
    { launch_county_id: i % 2 ? 'broward' : 'miami_dade' }, '', id === 'e' ? null : 'Same'));
  const { client } = fixtureClient(rows);
  const first = await rowsQuery(client, 'miami-fort-lauderdale', 0, 1);
  const second = await rowsQuery(client, 'miami-fort-lauderdale', 2, 4);
  assert.deepEqual(first.data.map(row => row.id), ['a', 'b']);
  assert.deepEqual(second.data.map(row => row.id), ['c', 'd', 'e']);
  rows.reverse();
  assert.deepEqual((await rowsQuery(client, 'miami-fort-lauderdale', 0, 1)).data, first.data);
  assert.equal((await countQuery(client, 'miami-fort-lauderdale')).count, 5);
});

test('invalid county scope or range fails before any request', () => {
  const { client, requests } = fixtureClient([]);
  assert.throws(() => countQuery(client, 'not-florida'));
  for (const range of [[-1, 2], [3, 2], [0.1, 2], [0, Infinity]]) {
    assert.throws(() => rowsQuery(client, 'miami-dade', ...range));
  }
  assert.equal(requests.length, 0);
});

test('canonical builders preserve database errors without retry or fabricated empty rows', async () => {
  const { client, requests } = fixtureClient([], '57014');
  for (const query of [countQuery(client, 'miami-dade'), rowsQuery(client, 'miami-dade', 0, 9)]) {
    const response = await query;
    assert.equal(response.error.code, '57014');
    assert.equal(response.data, null);
    assert.equal(response.count, null);
  }
  assert.equal(requests.length, 2);
});
