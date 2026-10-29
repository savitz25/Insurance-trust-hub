// Run: node --test scripts/ins-fl-hub-500-behavior.mjs
// Exercises the Florida hub route and loader with an in-memory provider table.
// No credentials, environment files, or live database requests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const result = await build({
  stdin: {
    contents: `
      export { default as page, generateMetadata } from './app/hubs/[state]/[slug]/page';
      export { getHubInventory } from './lib/dfs/providers-by-county';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  jsx: 'automatic',
  plugins: [
    {
      name: 'isolated-db',
      setup(build) {
        build.onResolve({ filter: /^@\/lib\/supabase\/(public|config)$/ }, (args) => ({
          path: args.path,
          namespace: 'fixture',
        }));
        build.onResolve({ filter: /^@\/components\/hub-page-view$/ }, (args) => ({
          path: args.path,
          namespace: 'fixture',
        }));
        build.onResolve({ filter: /^next\/navigation$/ }, () => ({
          path: 'next/navigation',
          namespace: 'fixture',
        }));
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
          contents: args.path === 'next/navigation'
            ? 'export function notFound(){ const error = new Error("NEXT_NOT_FOUND"); error.digest = "NEXT_NOT_FOUND"; throw error; }'
            : args.path.endsWith('/config')
              ? 'export const isSupabaseConfigured = () => globalThis.hubFixture.configured;'
              : args.path.endsWith('/public')
                ? 'export const createPublicClient = () => globalThis.hubFixture.client();'
                : 'export const HubPageView = () => null;',
        }));
      },
    },
  ],
});

const mod = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(
  require,
  mod,
  mod.exports
);
const { page, generateMetadata, getHubInventory } = mod.exports;

function agency(id, name, launchCountyId, countyText, licensed = ['FL']) {
  return {
    id,
    slug: id,
    name,
    cities: ['Miami'],
    states_licensed: licensed,
    categories: ['health'],
    specialties: [],
    verified: true,
    short_description: countyText ? `${countyText} County agency` : null,
    contact: {
      county: countyText,
      ...(launchCountyId ? { launch_county_id: launchCountyId } : {}),
    },
    license_info: {
      licenses: [
        {
          license_number: 'L987654',
          state: 'FL',
          source: 'Florida DFS',
          verification_url: 'https://example.com/dfs',
          checkedAt: new Date().toISOString(),
          identityMatchAccepted: true,
        },
      ],
    },
  };
}

function install(table, control = {}) {
  const state = {
    configured: control.configured !== false,
    lookups: 0,
    calls: [],
    client() {
      if (control.noClient) return null;
      return {
        from() {
          const query = {
            head: false,
            verified: false,
            licensed: false,
            ids: [],
            predicate: '',
            range: null,
            select(_columns, opts) {
              query.head = !!opts?.head;
              return query;
            },
            eq(column, value) {
              if (column === 'verified' && value === true) query.verified = true;
              return query;
            },
            contains(column, value) {
              if (
                column === 'states_licensed' &&
                Array.isArray(value) &&
                value.includes('FL')
              ) {
                query.licensed = true;
              }
              return query;
            },
            or(predicate) {
              query.predicate = predicate;
              query.ids = [
                ...predicate.matchAll(/contact->>launch_county_id\.eq\.([a-z0-9_]+)/g),
              ].map((match) => match[1]);
              return query;
            },
            order() {
              return query;
            },
            range(from, to) {
              query.range = [from, to];
              return query;
            },
            then(resolve, reject) {
              state.lookups += 1;
              state.calls.push({
                head: query.head,
                verified: query.verified,
                licensed: query.licensed,
                ids: [...query.ids],
                predicate: query.predicate,
                range: query.range,
              });
              const finish = (payload) => Promise.resolve(payload).then(resolve, reject);
              if (control.transport) {
                const timeout = new Error('canceling statement due to statement timeout');
                timeout.code = '57014';
                return Promise.reject(timeout).then(resolve, reject);
              }
              if (query.head && control.failCounty && query.ids.includes(control.failCounty)) {
                return finish({
                  data: null,
                  count: null,
                  error: { code: '57014', message: 'canceling statement due to statement timeout' },
                });
              }
              if (query.head && control.fail === 'count') {
                return finish({
                  data: null,
                  count: null,
                  error: { code: '57014', message: 'canceling statement due to statement timeout' },
                });
              }
              if (query.head && control.fail === 'null-count') {
                return finish({ data: null, count: null, error: null });
              }
              const matched = table.filter((row) => {
                if (query.verified && row.verified !== true) return false;
                if (query.licensed && !(row.states_licensed || []).includes('FL')) return false;
                return query.ids.includes(row.contact?.launch_county_id);
              });
              if (query.head) return finish({ data: null, count: matched.length, error: null });
              if (control.fail === 'rows') {
                return finish({
                  data: null,
                  error: { code: '57014', message: 'canceling statement due to statement timeout' },
                });
              }
              const ordered = [...matched].sort((a, b) => a.name.localeCompare(b.name));
              const window = query.range
                ? ordered.slice(query.range[0], query.range[1] + 1)
                : ordered;
              let data = control.repeatFirst && window.length ? [window[0], ...window] : window;
              if (control.shortPage && data.length) data = data.slice(0, -1);
              return finish({ data, error: null, count: ordered.length });
            },
          };
          return query;
        },
      };
    },
  };
  globalThis.hubFixture = state;
  return state;
}

function routeArgs(slug, page) {
  return {
    params: Promise.resolve({ state: 'florida', slug }),
    searchParams: Promise.resolve(page ? { page: String(page) } : {}),
  };
}

function idsOf(rendered) {
  return rendered.props.verifiedProviders.map((provider) => provider.id);
}

const mismatchTable = [
  agency('alpha', 'Alpha Agency', 'miami_dade', 'Broward'),
  agency('beta', 'Beta Agency', 'miami_dade', 'Miami-Dade'),
  agency('missing', 'Missing Agency', null, 'Miami-Dade'),
  agency('texas', 'Texas Agency', 'miami_dade', 'Miami-Dade', ['TX']),
];

test('mismatched county text stays on the id hub and off the text hub', async () => {
    const fixture = install(mismatchTable);
  try {
    const rendered = await page(routeArgs('miami-dade'));
    const metadata = await generateMetadata(routeArgs('miami-dade'));
    assert.deepEqual(idsOf(rendered), ['alpha', 'beta']);
    assert.equal(rendered.props.verifiedTotal, 2);
    assert.equal(rendered.props.inventoryShowing, 2);
    assert.equal(metadata.robots.index, true);
    assert.equal(fixture.lookups, 4);
    assert.ok(fixture.calls.every((call) => call.verified && call.licensed));
    assert.ok(fixture.calls.every((call) => !/ilike|county_normalized|contact->>county\.eq/.test(call.predicate)));
    fixture.lookups = 0;
    fixture.calls = [];
    const broward = await page(routeArgs('broward-county'));
    const browardMeta = await generateMetadata(routeArgs('broward-county'));
    assert.deepEqual(idsOf(broward), []);
    assert.equal(broward.props.verifiedTotal, 0);
    assert.equal(browardMeta.robots.index, false);
  } finally {
  }
});

test('metadata and the page share one read and the same total', async () => {
    const fixture = install(mismatchTable);
  try {
    const args = routeArgs('miami-dade');
    const [rendered, metadata] = await Promise.all([page(args), generateMetadata(args)]);
    assert.equal(rendered.props.verifiedTotal, 2);
    assert.equal(metadata.robots.index, true);
    assert.equal(fixture.lookups, 2);
    fixture.lookups = 0;
    const second = await page(args);
    assert.equal(second.props.verifiedTotal, rendered.props.verifiedTotal);
    assert.deepEqual(idsOf(second), idsOf(rendered));
    assert.equal(fixture.lookups, 2);
  } finally {
  }
});

test('a later request reads the database again', async () => {
  const fixture = install(mismatchTable);
    try {
    await page(routeArgs('miami-dade'));
  } finally {
  }
  const before = fixture.lookups;
    try {
    fixture.lookups = 0;
    const rendered = await page(routeArgs('miami-dade'));
    assert.equal(rendered.props.verifiedTotal, 2);
    assert.equal(fixture.lookups, before);
  } finally {
  }
});

test('pagination keeps every id member and does not skip a mismatched row', async () => {
  const table = [];
  for (let index = 1; index <= 100; index += 1) {
    const name = `Agency ${String(index).padStart(3, '0')}`;
    table.push(agency(`id-${index}`, name, 'miami_dade', index === 1 ? 'Broward' : 'Miami-Dade'));
  }
  table.push(agency('id-101', 'Agency 101', 'miami_dade', 'Miami-Dade'));
  table.push(agency('missing-text', 'Agency 050 Text Only', null, 'Miami-Dade'));
    try {
    const fixture = install(table);
    const first = await page(routeArgs('miami-dade', 1));
    const second = await page(routeArgs('miami-dade', 2));
    assert.equal(first.props.verifiedTotal, 101);
    assert.equal(second.props.verifiedTotal, 101);
    assert.equal(idsOf(first).length, 100);
    assert.deepEqual(idsOf(second), ['id-101']);
    assert.ok(idsOf(first).includes('id-1'));
    assert.equal(idsOf(first).includes('missing-text'), false);
    assert.equal(idsOf(second).includes('missing-text'), false);
    const overlap = idsOf(first).filter((id) => idsOf(second).includes(id));
    assert.deepEqual(overlap, []);
    const small = await getHubInventory('miami-dade', { pageSize: 2, page: 2 });
    assert.equal(small.total, 101);
    assert.deepEqual(small.providers.map((provider) => provider.id), ['id-3', 'id-4']);
    assert.equal(fixture.calls.some((call) => call.range && call.range[1] - call.range[0] === 1), true);
  } finally {
  }
});

test('a multi-county hub counts each county and lists each provider once', async () => {
  const table = [
    agency('h1', 'Hillsborough Agency', 'hillsborough', 'Hillsborough'),
    agency('p1', 'Pinellas Agency', 'pinellas', 'Pinellas'),
    agency('s1', 'Pasco Agency', 'pasco', 'Pasco'),
  ];
    const fixture = install(table, { repeatFirst: true });
  try {
    const rendered = await page(routeArgs('tampa'));
    assert.deepEqual(idsOf(rendered), ['h1', 's1', 'p1']);
    assert.equal(rendered.props.verifiedTotal, 3);
    assert.equal(new Set(idsOf(rendered)).size, idsOf(rendered).length);
    const counts = fixture.calls.filter((call) => call.head);
    const rows = fixture.calls.filter((call) => !call.head);
    assert.equal(counts.length, 3);
    assert.deepEqual(
      counts.map((call) => call.ids.join(',')).sort(),
      ['hillsborough', 'pasco', 'pinellas']
    );
    assert.equal(rows.length, 3);
    assert.ok(rows.every((call) => call.ids.length === 1));
    assert.deepEqual(
      rows.map((call) => call.ids[0]).sort(),
      ['hillsborough', 'pasco', 'pinellas']
    );
    assert.equal(fixture.calls.some((call) => call.ids.length > 1), false);
  } finally {
  }
});

test('a multi-county page merges name order from single-id ranges', async () => {
  const table = [
    agency('b', 'Bravo', 'pinellas', 'Pinellas'),
    agency('a', 'Alpha', 'hillsborough', 'Hillsborough'),
    agency('d', 'Delta', 'pasco', 'Pasco'),
    agency('c', 'Charlie', 'hillsborough', 'Hillsborough'),
    agency('e', 'Echo', 'pinellas', 'Pinellas'),
  ];
  const fixture = install(table);
  try {
    const page1 = await getHubInventory('tampa', { pageSize: 2, page: 1 });
    const page2 = await getHubInventory('tampa', { pageSize: 2, page: 2 });
    assert.deepEqual(page1.providers.map((provider) => provider.id), ['a', 'b']);
    assert.deepEqual(page2.providers.map((provider) => provider.id), ['c', 'd']);
    assert.equal(page1.total, 5);
    assert.equal(page2.total, 5);
    assert.equal(page1.showing, 2);
    assert.equal(page2.showing, 2);
    assert.ok(fixture.calls.every((call) => call.ids.length === 1));
    assert.equal(fixture.calls.some((call) => call.ids.length > 1), false);
  } finally {
  }
});

test('a timed-out county count does not publish a partial total', async () => {
  const table = [
    agency('h1', 'Hillsborough Agency', 'hillsborough', 'Hillsborough'),
    agency('p1', 'Pinellas Agency', 'pinellas', 'Pinellas'),
    agency('s1', 'Pasco Agency', 'pasco', 'Pasco'),
  ];
    install(table, { failCounty: 'pinellas' });
  try {
    await assert.rejects(page(routeArgs('tampa')), /Florida hub inventory/);
    await assert.rejects(generateMetadata(routeArgs('tampa')), /Florida hub inventory/);
  } finally {
  }
});

for (const [name, control] of [
  ['count timeout', { fail: 'count' }],
  ['null count', { fail: 'null-count' }],
  ['row timeout', { fail: 'rows' }],
  ['transport timeout', { transport: true }],
  ['missing client', { noClient: true }],
  ['unconfigured', { configured: false }],
]) {
  test(`${name} rejects the page and metadata`, async () => {
        install(mismatchTable, control);
    try {
      await assert.rejects(page(routeArgs('miami-dade')), /Florida hub inventory/);
      await assert.rejects(generateMetadata(routeArgs('miami-dade')), /Florida hub inventory/);
    } finally {
      }
  });
}

test('multi-county punctuation order follows en-US collation', async () => {
  const table = [
    agency(
      '25f18cea-b4ce-49b3-8acf-dc2173e13915',
      'A-1 B COOL HEAT & AIR, LLC',
      'pinellas',
      'Pinellas'
    ),
    agency(
      '478733b7-52e9-4aa3-b56f-ad52579fe601',
      'A_1 AUTO SALES OF TAMPA INC',
      'hillsborough',
      'Hillsborough'
    ),
  ];
  install(table);
  const rendered = await getHubInventory('tampa', { pageSize: 2, page: 1 });
  assert.deepEqual(
    rendered.providers.map((provider) => provider.id),
    ['478733b7-52e9-4aa3-b56f-ad52579fe601', '25f18cea-b4ce-49b3-8acf-dc2173e13915']
  );
  assert.equal(rendered.total, 2);
  assert.equal(rendered.showing, 2);
});

test('an ineligible row aborts the page instead of shortening it', async () => {
  const fresh = agency('fresh', 'Fresh Agency', 'miami_dade', 'Miami-Dade');
  const stale = agency('stale', 'Stale Agency', 'miami_dade', 'Miami-Dade');
  stale.license_info.licenses[0].checkedAt = '2020-01-01T00:00:00.000Z';
  const bail = agency('bail-row', 'County Bail Bonds', 'miami_dade', 'Miami-Dade');
  const seed = agency('seed-row', 'Seed Agency', 'miami_dade', 'Miami-Dade');
  install([fresh, stale]);
  await assert.rejects(
    getHubInventory('miami-dade', { pageSize: 2, page: 1 }),
    /Florida hub inventory/
  );
  install([fresh, bail]);
  await assert.rejects(
    getHubInventory('miami-dade', { pageSize: 2, page: 1 }),
    /Florida hub inventory/
  );
  install([fresh, seed]);
  await assert.rejects(
    getHubInventory('miami-dade', { pageSize: 2, page: 1 }),
    /Florida hub inventory/
  );
});

test('a short page under a positive count is a failed read', async () => {
  install(
    [
      agency('alpha', 'Alpha Agency', 'miami_dade', 'Miami-Dade'),
      agency('beta', 'Beta Agency', 'miami_dade', 'Miami-Dade'),
    ],
    { shortPage: true }
  );
  await assert.rejects(
    getHubInventory('miami-dade', { pageSize: 2, page: 1 }),
    /Florida hub inventory/
  );
});

test('a successful empty market stays empty and noindex', async () => {
    install([]);
  try {
    const rendered = await page(routeArgs('jacksonville'));
    const metadata = await generateMetadata(routeArgs('jacksonville'));
    assert.deepEqual(idsOf(rendered), []);
    assert.equal(rendered.props.verifiedTotal, 0);
    assert.equal(metadata.robots.index, false);
  } finally {
  }
});
