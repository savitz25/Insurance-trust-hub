/**
 * C3 regression (Blocker 1): the real @sentry/nextjs server SDK, real event pipeline,
 * serialized envelopes captured in memory. PASS = zero synthetic values in the bytes.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import * as Sentry from '@sentry/nextjs';
import { insuranceSentryOptions, PROVIDERS_STATEMENT_ROUTE } from './sentry-policy';
import { captureProviderStatementTimeout } from './sentry';
import {
  DUMMY_DSN,
  envelopeEvents,
  memoryTransport,
  SYNTHETIC as S,
  syntheticValues,
  watchSockets,
  type CapturedEnvelopes,
} from './sentry-envelope-harness';

test('real server SDK sends zero synthetic secrets through console, fetch, http, scope, or exceptions', async () => {
  const sockets = watchSockets();
  const store: CapturedEnvelopes = { bodies: [] };
  const previousDsn = process.env.SENTRY_DSN;
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `s=${S.cookie}` });
    res.end(JSON.stringify({ echo: S.email }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    const options = insuranceSentryOptions(DUMMY_DSN);
    assert.ok(options);
    const client = Sentry.init({ ...options, transport: memoryTransport(store) });
    assert.ok(client, 'real SDK client initialized');
    const integrationNames = (client.getOptions().integrations ?? []).map((i) => i.name);

    // Console breadcrumbs (the reproduced C3 leak).
    console.log(`login ${S.email} Authorization: Bearer ${S.bearer} q=${S.query}`);
    console.error(`apikey=${S.apiKey} cookie=session=${S.cookie} password=${S.password}`);
    console.warn(`GET /rest/v1/providers?token=${S.queryToken}&q=${S.query} ${S.jwt} ${S.sql}`);
    console.info(`user ${S.emailEncoded}`);

    // Outgoing fetch and http with query strings and credentials.
    const url = `http://127.0.0.1:${port}/rest/v1/providers?select=*&q=${S.query}&token=${S.queryToken}&email=${S.emailEncoded}`;
    await (
      await fetch(url, {
        headers: { Authorization: `Bearer ${S.bearer}`, apikey: S.apiKey, cookie: `session=${S.cookie}` },
      })
    ).text();
    await new Promise<void>((resolve, reject) => {
      http
        .get(url, { headers: { Authorization: `Bearer ${S.bearer}`, cookie: `session=${S.cookie}` } }, (res) => {
          res.resume();
          res.on('end', () => resolve());
        })
        .on('error', reject);
    });

    // Scope data any integration or library could attach.
    Sentry.setUser({ email: S.email, ip_address: '203.0.113.8' });
    Sentry.setExtra('query', S.query);
    Sentry.setTag('apikey', S.apiKey);
    Sentry.setContext('request_meta', { authorization: `Bearer ${S.bearer}`, cookie: S.cookie });
    Sentry.addBreadcrumb({ category: 'custom', message: `q=${S.query}`, data: { url: `${url}#${S.jwt}` } });
    Sentry.getIsolationScope().setSDKProcessingMetadata({
      normalizedRequest: {
        url: `https://www.insurancetrusthub.com/directory?q=${S.query}&token=${S.queryToken}`,
        query_string: `q=${S.query}`,
        headers: { authorization: `Bearer ${S.bearer}`, cookie: `session=${S.cookie}`, 'x-user': S.email },
        cookies: { session: S.cookie },
        data: JSON.stringify({ email: S.email, password: S.password }),
      },
    });

    // The approved capture path (lib/observability/sentry.ts → Sentry.captureException).
    process.env.SENTRY_DSN = DUMMY_DSN;
    captureProviderStatementTimeout(
      {
        code: '57014',
        message: `canceling statement due to statement timeout ${S.email}`,
        details: `ilike.%${S.query}%`,
        hint: `Bearer ${S.bearer}`,
      },
      { route: `${PROVIDERS_STATEMENT_ROUTE}?q=${S.query}&token=${S.queryToken}`, queryKind: 'page' }
    );

    // Any other capture (global handlers, future code) must not leak either.
    Sentry.captureException(
      new Error(`boom ${S.email} Authorization: Bearer ${S.bearer} ?q=${S.query}`, {
        cause: { code: '23505', message: `apikey=${S.apiKey}` },
      })
    );
    Sentry.captureMessage(`message ${S.email} token=${S.queryToken}`);

    assert.equal(await Sentry.flush(3000), true);

    const raw = store.bodies.join('\n');
    if (process.env.SENTRY_ENVELOPE_DUMP) writeFileSync(process.env.SENTRY_ENVELOPE_DUMP, raw);
    const events = envelopeEvents(store);

    const leaks = syntheticValues().filter((value) => raw.includes(value));
    assert.deepEqual(leaks, [], `synthetic values in serialized envelopes: ${leaks.join(', ')}`);
    assert.equal(raw.includes('203.0.113.8'), false);

    // Positive control: the 57014 event really went through the transport.
    const timeoutEvents = events.filter(
      (event) => (event.tags as Record<string, string> | undefined)?.sqlstate === '57014'
    );
    assert.equal(timeoutEvents.length, 1, 'exactly one provider-timeout event serialized');
    const timeout = timeoutEvents[0] as {
      tags: Record<string, string>;
      exception: { values: Array<{ value: string }> };
      breadcrumbs?: unknown[];
      request?: unknown;
      user?: unknown;
      extra?: unknown;
    };
    assert.deepEqual(timeout.tags, {
      hub: 'insurance',
      route: PROVIDERS_STATEMENT_ROUTE,
      sqlstate: '57014',
      query_kind: 'page',
    });
    assert.equal(timeout.exception.values[0]?.value, 'Postgres statement timeout');
    for (const event of events) {
      const e = event as { breadcrumbs?: unknown[]; request?: unknown; user?: unknown; extra?: unknown };
      assert.equal((e.breadcrumbs ?? []).length, 0, 'no breadcrumbs serialized');
      assert.equal(e.request, undefined, 'no request serialized');
      assert.equal(e.user, undefined, 'no user serialized');
      assert.equal(e.extra, undefined, 'no extra serialized');
    }
    assert.equal(events.length, 1, 'only the provider-timeout event leaves the process');

    // Integrations that collect console, request, or outgoing-call data are not installed.
    for (const name of ['Console', 'Http', 'NodeFetch', 'RequestData', 'LocalVariables', 'OnUncaughtException', 'OnUnhandledRejection', 'ContextLines', 'Modules', 'ChildProcess']) {
      assert.equal(integrationNames.includes(name), false, `${name} integration disabled`);
    }

    // No egress: only the loopback test server was contacted.
    assert.ok(sockets.targets.includes('127.0.0.1'), 'socket watcher saw the loopback test server');
    const remote = sockets.targets.filter((target) => !['127.0.0.1', 'localhost', '::1'].includes(target));
    assert.deepEqual(remote, [], `non-loopback sockets: ${remote.join(', ')}`);
  } finally {
    sockets.restore();
    server.close();
    await Sentry.close(1000);
    if (previousDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = previousDsn;
  }
});
