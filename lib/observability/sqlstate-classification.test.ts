/**
 * C3 regression (Blocker 2): only a structured SQLSTATE code of exactly 57014 is a statement timeout.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  headCountTimeoutError,
  insuranceBeforeSend,
  insuranceSentryIntegrations,
  insuranceSentryOptions,
  PROVIDERS_STATEMENT_ROUTE,
  providerTimeoutCapture,
  readStatementSqlState,
  restStatementTimeoutError,
  structuredSqlState,
} from './sentry-policy';

const dsn = 'https://public@example.invalid/1';
const ctx = { route: PROVIDERS_STATEMENT_ROUTE, queryKind: 'page' as const };

test('a 23505 whose message says "statement timeout" or 1570149 is not 57014', () => {
  const duplicate = {
    code: '23505',
    message: 'duplicate key value violates unique constraint; statement timeout 1570149 (57014)',
    details: 'Key (id)=(1570149) already exists. canceling statement due to statement timeout',
    hint: '57014',
  };
  assert.equal(structuredSqlState(duplicate), '23505');
  assert.equal(readStatementSqlState(duplicate), null);
  assert.equal(providerTimeoutCapture(dsn, duplicate, ctx), null);
  assert.equal(readStatementSqlState(new Error('statement timeout 1570149 57014')), null);
  assert.equal(readStatementSqlState({ message: 'canceling statement due to statement timeout 57014' }), null);
  assert.equal(readStatementSqlState({ code: '1570149' }), null);
  assert.equal(readStatementSqlState({ code: 1570149 }), null);
  assert.equal(readStatementSqlState({ code: '570140' }), null);
  assert.equal(readStatementSqlState({ code: ' 57014' }), null);
  assert.equal(readStatementSqlState({ code: 'PGRST000', message: 'statement timeout 57014' }), null);
  assert.equal(readStatementSqlState(null), null);
  assert.equal(readStatementSqlState('57014'), null);
});

test('nested and wrapped errors use the outermost structured SQLSTATE only', () => {
  const wrapped23505 = new Error('statement timeout 1570149', { cause: { code: '23505', message: '57014' } });
  assert.equal(readStatementSqlState(wrapped23505), null);
  assert.equal(readStatementSqlState({ code: '23505', cause: { code: '57014' } }), null);
  assert.equal(readStatementSqlState({ message: 'x', cause: { code: '57014' } }), '57014');
  assert.equal(readStatementSqlState({ error: { code: '57014' } }), '57014');
  assert.equal(readStatementSqlState({ code: 'PGRST116', cause: { code: '57014' } }), '57014');
  assert.equal(readStatementSqlState({ cause: { message: 'code 57014', details: '1570149' } }), null);
  const cyclic: { code?: string; cause?: unknown } = {};
  cyclic.cause = cyclic;
  assert.equal(readStatementSqlState(cyclic), null);
});

test('genuine 57014 timeouts are still reported', () => {
  const pg = { code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null };
  assert.equal(readStatementSqlState(pg), '57014');
  assert.equal(readStatementSqlState({ code: 57014 }), '57014');
  assert.equal(readStatementSqlState(new Error('wrapped', { cause: pg })), '57014');
  const capture = providerTimeoutCapture(dsn, pg, ctx);
  assert.equal(capture?.tags.sqlstate, '57014');
  assert.equal(capture?.error.message, 'Postgres statement timeout');
});

test('HTTP 500 classifier follows the same structured-code rules', () => {
  const genuine = '{"code":"57014","details":null,"hint":null,"message":"canceling statement due to statement timeout"}';
  assert.deepEqual(restStatementTimeoutError(500, genuine), { code: '57014' });
  assert.deepEqual(restStatementTimeoutError(500, genuine.slice(0, 40)), { code: '57014' });
  assert.equal(restStatementTimeoutError(503, genuine), null);
  assert.equal(restStatementTimeoutError(null, genuine), null);

  const duplicate = '{"code":"23505","message":"statement timeout 1570149 57014","details":"Key (id)=(1570149)"}';
  assert.equal(restStatementTimeoutError(500, duplicate), null);
  assert.equal(restStatementTimeoutError(500, duplicate, 'PostgREST; error=57014'), null);
  assert.equal(restStatementTimeoutError(500, duplicate.slice(0, 30)), null);
  assert.equal(restStatementTimeoutError(500, 'statement timeout 1570149 57014'), null);
  assert.equal(restStatementTimeoutError(500, '{"message":"statement timeout 57014","details":"\\"code\\":\\"57014\\""}'), null);
  assert.equal(restStatementTimeoutError(500, '{"error":{"code":"57014"}}'), null);

  // Generic or empty 500s are not database statement timeouts.
  assert.equal(restStatementTimeoutError(500, ''), null);
  assert.equal(restStatementTimeoutError(500, '', null), null);
  assert.equal(restStatementTimeoutError(500, 'Internal Server Error'), null);
  assert.equal(restStatementTimeoutError(500, '', 'PostgREST; error=PGRST000'), null);
  // An empty 500 with Proxy-Status naming SQLSTATE 57014 is the explicit HEAD/GET signal.
  assert.deepEqual(restStatementTimeoutError(500, '', 'PostgREST; error=57014'), { code: '57014' });
  assert.equal(restStatementTimeoutError(500, '', 'PostgREST; error=1570149'), null);
});

test('HEAD count Proxy-Status never overrides an explicit non-57014 SQLSTATE', () => {
  const duplicate = { code: '23505', message: 'statement timeout 1570149' };
  assert.equal(headCountTimeoutError(duplicate, 'PostgREST; error=57014'), duplicate);
  assert.equal(providerTimeoutCapture(dsn, headCountTimeoutError(duplicate, 'PostgREST; error=57014'), ctx), null);
  assert.deepEqual(headCountTimeoutError({ message: '', code: '' }, 'PostgREST; error=57014'), { code: '57014' });
  assert.deepEqual(headCountTimeoutError({ code: '57014' }, null), { code: '57014' });
  const empty = { message: '' };
  assert.equal(headCountTimeoutError(empty, null), empty);
  assert.equal(headCountTimeoutError({ message: 'statement timeout 1570149' }, 'PostgREST; error=1570149') !== null, true);
  assert.equal(
    providerTimeoutCapture(dsn, headCountTimeoutError({ message: 'statement timeout 1570149' }, null), ctx),
    null
  );
});

test('SDK options remove breadcrumb and request integrations and keep the approved flags', () => {
  const options = insuranceSentryOptions(dsn);
  assert.ok(options);
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.maxBreadcrumbs, 0);
  assert.equal(options.beforeBreadcrumb(), null);
  assert.equal(insuranceSentryOptions(undefined), null);
  const names = insuranceSentryIntegrations(
    ['Console', 'Http', 'NodeFetch', 'WinterCGFetch', 'RequestData', 'OnUncaughtException', 'OnUnhandledRejection',
      'LocalVariables', 'ContextLines', 'Modules', 'Context', 'ChildProcess', 'EventFilters', 'FunctionToString',
      'LinkedErrors', 'Dedupe'].map((name) => ({ name }))
  ).map((integration) => integration.name);
  assert.deepEqual(names, ['EventFilters', 'FunctionToString', 'LinkedErrors', 'Dedupe']);
});

test('beforeSend drops non-timeout events and rebuilds timeout events from an allowlist', () => {
  assert.equal(insuranceBeforeSend({ exception: { values: [{ value: 'boom a@b.co' }] } }), null);
  assert.equal(insuranceBeforeSend({ tags: { hub: 'insurance', sqlstate: '23505' } }), null);
  const event = insuranceBeforeSend({
    tags: { hub: 'insurance', route: '/rest/v1/providers?q=jane', sqlstate: '57014', query_kind: 'count', apikey: 'k' },
    user: { email: 'jane.doe@example.com' },
    request: { url: 'https://x.test/a?q=1', headers: { authorization: 'Bearer abc' } },
    breadcrumbs: [{ data: { url: 'https://x.test/?token=1' } }],
    extra: { q: 'jane' },
    contexts: { runtime: { name: 'node' }, request_meta: { authorization: 'Bearer abc' } },
    server_name: 'host-1',
    transaction: 'GET /directory?q=jane',
    exception: {
      values: [
        {
          value: 'Postgres statement timeout jane.doe@example.com Bearer abc.def token=xyz ?q=1',
          stacktrace: { frames: [{ filename: 'a.js', vars: { s: 'x' }, context_line: 'secret()' }] },
        },
      ],
    },
  });
  assert.ok(event);
  assert.deepEqual(event.tags, { hub: 'insurance', route: '/rest/v1/providers', sqlstate: '57014', query_kind: 'count' });
  assert.deepEqual(event.contexts, { runtime: { name: 'node' } });
  for (const key of ['user', 'request', 'breadcrumbs', 'extra', 'server_name', 'transaction']) {
    assert.equal(key in event, false, key);
  }
  const text = JSON.stringify(event);
  for (const value of ['jane', 'abc', 'xyz', 'secret()', '"vars"', '?q=']) assert.equal(text.includes(value), false, value);
});
