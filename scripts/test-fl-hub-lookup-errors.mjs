// Run: node --test scripts/test-fl-hub-lookup-errors.mjs
// Real route, loader, row mapping, trust policy and SEO; only the DB and view
// boundary are isolated. No credentials, environment files or live requests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const result = await build({
  stdin: { contents: `export { default as page, generateMetadata } from './app/hubs/[state]/[slug]/page';`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  plugins: [{ name: 'isolated-db', setup(build) {
    build.onResolve({ filter: /^@\/lib\/supabase\/(public|config)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onResolve({ filter: /^@\/components\/hub-page-view$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents:
      args.path.endsWith('/config') ? 'export const isSupabaseConfigured = () => globalThis.hubFixture.configured;' :
      args.path.endsWith('/public') ? 'export const createPublicClient = () => globalThis.hubFixture.client();' :
      'export const HubPageView = () => null;'
    }));
  }}],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
const { page, generateMetadata } = mod.exports;
function fixture(mode, county) {
  const row = {
    id: 'regression-agency', slug: 'regression-agency', name: 'Regression Agency',
    cities: ['Miami'], states_licensed: ['FL'], categories: ['health'], specialties: [], verified: true,
    contact: { county }, license_info: { licenses: [{ license_number: 'L987654', state: 'FL',
      source: 'Florida DFS', verification_url: 'https://example.com/dfs',
      checkedAt: new Date().toISOString(), identityMatchAccepted: true }] },
  };
  globalThis.hubFixture = { configured: mode !== 'unconfigured', lookups: 0, client() {
    if (mode === 'no-client') return null;
    return { from() {
      globalThis.hubFixture.lookups += 1;
      let countQuery = false;
      const query = {
        select(_columns, opts) { countQuery = !!opts?.head; return query; },
        then(resolve, reject) {
          if (mode === 'transport') return Promise.reject(new Error('fixture timeout')).then(resolve, reject);
          const failure = mode === (countQuery ? 'count-error' : 'rows-error');
          return Promise.resolve({ error: failure ? { message: 'fixture unavailable' } : null,
            count: mode === 'null-count' ? null : mode === 'empty' ? 0 : 1,
            data: failure || mode === 'null-rows' ? null : mode === 'empty' ? [] : [row],
          }).then(resolve, reject);
        },
      };
      for (const method of ['eq', 'contains', 'or', 'order', 'range']) query[method] = () => query;
      return query;
    }};
  }};
}
for (const [slug, county] of [['miami-dade', 'Miami-Dade'], ['broward-county', 'Broward'], ['palm-beach-county', 'Palm Beach']]) {
  const args = () => ({ params: Promise.resolve({ state: 'florida', slug }), searchParams: Promise.resolve({}) });
  test(`${slug}: successful inventory remains visible and indexable`, async () => {
    fixture('success', county);
    const rendered = await page(args());
    assert.equal(rendered.props.verifiedProviders.length, 1);
    assert.equal(rendered.props.verifiedTotal, 1);
    assert.equal((await generateMetadata(args())).robots.index, true);
  });
  test(`${slug}: genuine empty inventory retains empty/noindex policy`, async () => {
    fixture('empty', county);
    const rendered = await page(args());
    assert.deepEqual(rendered.props.verifiedProviders, []);
    assert.equal(rendered.props.verifiedTotal, 0);
    assert.equal((await generateMetadata(args())).robots.index, false);
  });
  for (const mode of ['count-error', 'rows-error', 'transport', 'null-count', 'null-rows', 'unconfigured', 'no-client']) {
    test(`${slug}: ${mode} rejects page and metadata instead of returning empty`, async () => {
      fixture(mode, county);
      await assert.rejects(page(args()), /Florida hub inventory/);
      await assert.rejects(generateMetadata(args()), /Florida hub inventory/);
    });
  }
}

test('concurrent Miami-Dade page and metadata share one lookup', async () => {
  fixture('success', 'Miami-Dade');
  const args = () => ({
    params: Promise.resolve({ state: 'florida', slug: 'miami-dade' }),
    searchParams: Promise.resolve({}),
  });
  globalThis.hubFixture.lookups = 0;
  const [rendered, metadata] = await Promise.all([page(args()), generateMetadata(args())]);
  assert.equal(rendered.props.verifiedProviders.length, 1);
  assert.equal(rendered.props.verifiedTotal, 1);
  assert.equal(metadata.robots.index, true);
  assert.equal(globalThis.hubFixture.lookups, 2);
});

test('concurrent Miami-Dade row failure still rejects both callers', async () => {
  fixture('rows-error', 'Miami-Dade');
  const args = () => ({
    params: Promise.resolve({ state: 'florida', slug: 'miami-dade' }),
    searchParams: Promise.resolve({}),
  });
  const results = await Promise.allSettled([page(args()), generateMetadata(args())]);
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.equal(result.status, 'rejected');
    assert.match(String(result.reason), /Florida hub inventory/);
  }
});
