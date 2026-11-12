/**
 * Blocker 1 on the edge runtime: the real @sentry/nextjs edge SDK with the same options.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { insuranceSentryOptions, PROVIDERS_STATEMENT_ROUTE, providerTimeoutCapture } from './sentry-policy';
import {
  DUMMY_DSN,
  envelopeEvents,
  memoryTransport,
  SYNTHETIC as S,
  syntheticValues,
  watchSockets,
  type CapturedEnvelopes,
} from './sentry-envelope-harness';

type EdgeSdk = typeof import('@sentry/nextjs');

test('real edge SDK sends zero synthetic secrets through console, scope, or exceptions', async () => {
  const edge = createRequire(__filename)(
    join(process.cwd(), 'node_modules/@sentry/nextjs/build/cjs/edge/index.js')
  ) as EdgeSdk;
  const sockets = watchSockets();
  const store: CapturedEnvelopes = { bodies: [] };
  try {
    const options = insuranceSentryOptions(DUMMY_DSN);
    assert.ok(options);
    edge.init({ ...options, transport: memoryTransport(store) });
    const client = edge.getClient();
    assert.ok(client, 'real edge SDK client initialized');
    const names = (client.getOptions().integrations ?? []).map((i) => i.name);
    for (const name of ['Console', 'WinterCGFetch', 'RequestData']) assert.equal(names.includes(name), false, name);

    console.log(`login ${S.email} Authorization: Bearer ${S.bearer} q=${S.query}`);
    console.error(`apikey=${S.apiKey} cookie=session=${S.cookie} ${S.jwt} ${S.password} ${S.sql}`);
    edge.setUser({ email: S.email });
    edge.setTag('token', S.queryToken);
    edge.setContext('request_meta', { authorization: `Bearer ${S.bearer}` });
    edge.addBreadcrumb({ category: 'fetch', data: { url: `https://x.test/?q=${S.query}&email=${S.emailEncoded}` } });

    const planned = providerTimeoutCapture(
      DUMMY_DSN,
      { code: '57014', message: `statement timeout ${S.email}` },
      { route: `${PROVIDERS_STATEMENT_ROUTE}?q=${S.query}`, queryKind: 'count' }
    );
    assert.ok(planned);
    edge.captureException(planned.error, { tags: planned.tags });
    edge.captureException(new Error(`boom ${S.email} Bearer ${S.bearer}`));
    assert.equal(await edge.flush(3000), true);

    const raw = store.bodies.join('\n');
    const leaks = syntheticValues().filter((value) => raw.includes(value));
    assert.deepEqual(leaks, [], `synthetic values in serialized envelopes: ${leaks.join(', ')}`);
    const events = envelopeEvents(store);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0]?.tags, {
      hub: 'insurance',
      route: PROVIDERS_STATEMENT_ROUTE,
      sqlstate: '57014',
      query_kind: 'count',
    });
    assert.equal(((events[0]?.breadcrumbs as unknown[]) ?? []).length, 0);
    const remote = sockets.targets.filter((target) => !['127.0.0.1', 'localhost', '::1'].includes(target));
    assert.deepEqual(remote, []);
  } finally {
    sockets.restore();
    await edge.close(1000);
  }
});
