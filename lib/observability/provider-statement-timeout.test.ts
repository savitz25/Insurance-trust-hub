import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  headCountTimeoutError,
  insuranceSentryOptions,
  PROVIDERS_STATEMENT_ROUTE,
  providerTimeoutCapture,
  restStatementTimeoutError,
  scrubSentryEvent,
} from './sentry-policy';
import {
  captureProviderStatementTimeout,
  initInsuranceSentry,
  setProviderTimeoutEmitterForTests,
} from './sentry';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

test('Sentry stays a no-op without SENTRY_DSN and a 57014 sets tags without changing status', () => {
  const previous = process.env.SENTRY_DSN;
  const seen: Array<Record<string, string>> = [];
  try {
    delete process.env.SENTRY_DSN;
    setProviderTimeoutEmitterForTests(() => {
      seen.push({ called: 'yes' });
    });
    captureProviderStatementTimeout(
      { code: '57014', message: 'canceling statement due to statement timeout for jane.doe@example.com' },
      { route: PROVIDERS_STATEMENT_ROUTE, queryKind: 'page' }
    );
    initInsuranceSentry();
    assert.equal(seen.length, 0);
    assert.equal(insuranceSentryOptions(undefined), null);
    assert.equal(insuranceSentryOptions(''), null);
    assert.equal(insuranceSentryOptions('   '), null);
    assert.equal(
      providerTimeoutCapture(undefined, { code: '57014' }, { route: PROVIDERS_STATEMENT_ROUTE, queryKind: 'count' }),
      null
    );

    process.env.SENTRY_DSN = 'https://public@o0.ingest.sentry.io/1';
    setProviderTimeoutEmitterForTests((error, tags) => {
      seen.push({ message: error.message, ...tags });
    });

    function respond(status: number, queryKind: 'count' | 'page', error: unknown): number {
      captureProviderStatementTimeout(error, {
        route: `${PROVIDERS_STATEMENT_ROUTE}?select=*&email=jane.doe@example.com`,
        queryKind,
      });
      return status;
    }

    const timeout = {
      code: '57014',
      message: 'canceling statement due to statement timeout',
      details: 'ilike.%jane.doe@example.com%',
    };
    assert.equal(respond(500, 'page', timeout), 500);
    assert.equal(respond(503, 'page', timeout), 503);
    assert.equal(respond(200, 'count', timeout), 200);
    assert.equal(respond(504, 'count', { code: '57014', message: '57014 statement timeout' }), 504);
    assert.equal(respond(500, 'page', { code: '23505', message: 'duplicate key' }), 500);
    assert.equal(seen.length, 4);
    for (const event of seen) {
      assert.equal(event.hub, 'insurance');
      assert.equal(event.route, PROVIDERS_STATEMENT_ROUTE);
      assert.equal(event.sqlstate, '57014');
      assert.equal(event.message, 'Postgres statement timeout');
      assert.equal(JSON.stringify(event).includes('jane.doe'), false);
      assert.equal(event.route.includes('?'), false);
    }
    assert.equal(seen[0]?.query_kind, 'page');
    assert.equal(seen[2]?.query_kind, 'count');

    setProviderTimeoutEmitterForTests(() => {
      throw new Error('transport failed');
    });
    assert.doesNotThrow(() =>
      captureProviderStatementTimeout(timeout, { route: PROVIDERS_STATEMENT_ROUTE, queryKind: 'count' })
    );
  } finally {
    setProviderTimeoutEmitterForTests(null);
    if (previous === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = previous;
  }
});

test('beforeSend removes headers, cookies, query strings, and user data', () => {
  const options = insuranceSentryOptions('https://public@o0.ingest.sentry.io/1');
  assert.ok(options);
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.dataCollection.userInfo, false);
  assert.equal(options.dataCollection.cookies, false);
  assert.equal(options.dataCollection.httpHeaders, false);
  assert.equal(options.dataCollection.urlQueryParams, false);
  assert.equal(options.dataCollection.databaseQueryData, false);
  assert.equal(options.dataCollection.httpBodies.length, 0);
  assert.equal('replaysSessionSampleRate' in options, false);
  assert.equal('replaysOnErrorSampleRate' in options, false);

  const scrubbed = options.beforeSend({
    user: { email: 'jane.doe@example.com', ip_address: '203.0.113.8' },
    request: {
      url: 'https://www.insurancetrusthub.com/directory?zip=33101&q=jane.doe%40example.com',
      query_string: 'zip=33101&q=jane.doe%40example.com',
      headers: { cookie: 'session=secret', authorization: 'Bearer secret' },
      cookies: { session: 'secret' },
      data: { q: 'jane.doe@example.com' },
    },
    breadcrumbs: [
      {
        data: {
          url: 'https://example.test/rest/v1/providers?select=*&email=jane.doe@example.com',
          headers: { apikey: 'secret' },
          cookies: { session: 'secret' },
          query_string: 'email=jane.doe@example.com',
        },
      },
    ],
  });
  assert.equal(scrubbed.user, undefined);
  assert.deepEqual(scrubbed.request?.headers, {});
  assert.deepEqual(scrubbed.request?.cookies, {});
  assert.equal(scrubbed.request?.query_string, '');
  assert.equal(scrubbed.request?.data, undefined);
  assert.equal(scrubbed.request?.url, 'https://www.insurancetrusthub.com/directory');
  assert.equal(
    scrubbed.breadcrumbs?.[0]?.data?.url,
    'https://example.test/rest/v1/providers'
  );
  assert.equal('headers' in (scrubbed.breadcrumbs?.[0]?.data ?? {}), false);
  assert.equal('cookies' in (scrubbed.breadcrumbs?.[0]?.data ?? {}), false);
  assert.equal(JSON.stringify(scrubbed).includes('jane.doe'), false);
  assert.equal(JSON.stringify(scrubbed).includes('secret'), false);
  assert.equal(JSON.stringify(scrubbed).includes('33101'), false);
  const empty = scrubSentryEvent({});
  assert.equal('request' in empty, false);
});

test('a bodyless exact-count HEAD 500 is reported as SQLSTATE 57014', () => {
  const dsn = 'https://public@o0.ingest.sentry.io/1';
  const ctx = { route: PROVIDERS_STATEMENT_ROUTE, queryKind: 'count' as const };
  const headTimeout = headCountTimeoutError({ message: '' }, 500);
  const capture = providerTimeoutCapture(dsn, headTimeout, ctx);
  assert.equal(capture?.tags.sqlstate, '57014');
  assert.equal(capture?.tags.query_kind, 'count');
  assert.equal(capture?.error.message, 'Postgres statement timeout');

  assert.equal(providerTimeoutCapture(dsn, headCountTimeoutError({ message: '' }, 401), ctx), null);
  assert.equal(
    providerTimeoutCapture(dsn, headCountTimeoutError({ code: '42501', message: 'permission denied' }, 500), ctx),
    null
  );
  assert.equal(
    providerTimeoutCapture(
      dsn,
      headCountTimeoutError({ message: 'FetchError: network down', code: '' }, 0),
      ctx
    ),
    null
  );
});

test('a providers 500 body is recognized only as SQLSTATE 57014', () => {
  const body =
    '{"code":"57014","message":"canceling statement due to statement timeout","details":"email=jane.doe@example.com"}';
  assert.deepEqual(restStatementTimeoutError(500, body), { code: '57014' });
  assert.equal(restStatementTimeoutError(200, body), null);
  assert.equal(restStatementTimeoutError(500, '{"code":"23505","message":"duplicate"}'), null);
  const capture = providerTimeoutCapture(
    'https://public@o0.ingest.sentry.io/1',
    restStatementTimeoutError(500, body),
    { route: PROVIDERS_STATEMENT_ROUTE, queryKind: 'count' }
  );
  assert.equal(capture?.tags.query_kind, 'count');
  assert.equal(capture?.tags.sqlstate, '57014');
  assert.equal(JSON.stringify(capture).includes('jane.doe'), false);
});

test('provider timeout capture does not change existing response decisions', () => {
  const queries = read('lib/providers/queries.ts');
  assert.match(queries, /count: 'planned'/);
  assert.equal(queries.includes("count: 'exact'"), false);
  assert.match(queries, /queryKind: 'page'/);
  assert.match(queries, /throw new Error\('Directory source unavailable'\)/);
  assert.match(queries, /return \{ providers: \[\], total: 0 \}/);

  const counts = read('lib/dfs/provider-head-count.ts');
  assert.match(counts, /queryKind: 'count'/);
  assert.match(counts, /throw new Error\('provider count unavailable'\)/);

  const hub = read('lib/dfs/providers-by-county.ts');
  assert.match(hub, /throw new Error\('Florida hub inventory unavailable'\)/);
  assert.match(hub, /return unavailableInventory\(hubSlug, pageSize, page\)/);

  const specialist = read('lib/specialist-execution/v2.ts');
  assert.match(specialist, /BACKEND_UNAVAILABLE' \? 503 : 200/);
  assert.match(specialist, /timeout \? 504 : 503/);

  const health = read('app/api/inventory/health/route.ts');
  assert.equal(health.includes('status: 500'), false);
  assert.match(health, /queryKind: 'count'/);
  assert.match(health, /queryKind: 'page'/);
  assert.match(health, /return NextResponse\.json\(/);

  const ask = read('app/api/ask/route.ts');
  assert.match(ask, /status: 503/);
});

test('Sentry is server and edge only', () => {
  assert.equal(existsSync(join(root, 'instrumentation-client.ts')), false);
  assert.equal(existsSync(join(root, 'sentry.client.config.ts')), false);
  assert.equal(existsSync(join(root, 'app/global-error.tsx')), false);
  const instrumentation = read('instrumentation.ts');
  assert.match(instrumentation, /sentry\.server\.config/);
  assert.match(instrumentation, /sentry\.edge\.config/);
  assert.equal(instrumentation.includes('instrumentation-client'), false);
  assert.equal(instrumentation.includes('onRequestError'), false);
  const nextConfig = read('next.config.ts');
  assert.equal(nextConfig.includes('@sentry/nextjs'), false);
  assert.equal(nextConfig.includes('withSentryConfig'), false);
  const server = read('sentry.server.config.ts');
  const edge = read('sentry.edge.config.ts');
  assert.match(server, /initInsuranceSentry/);
  assert.match(edge, /initInsuranceSentry/);
  const sdk = read('lib/observability/sentry.ts');
  assert.match(sdk, /Sentry\.captureException\(planned\.error, \{ tags: planned\.tags \}\)/);
  assert.match(sdk, /if \(!options\) return/);
});
