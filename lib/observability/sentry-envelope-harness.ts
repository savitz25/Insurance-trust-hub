/**
 * Test-only harness for the real Sentry SDK.
 * The transport keeps each serialized envelope in memory and never opens a socket.
 * The DSN host is reserved (.invalid) so a mistake cannot reach a Sentry project.
 */
import net from 'node:net';
import { createTransport } from '@sentry/core';

export const DUMMY_DSN = 'https://public@example.invalid/1';

/** Synthetic values only. None of these are real credentials or people. */
export const SYNTHETIC = {
  email: 'c3.synthetic.user@example.com',
  emailEncoded: 'c3.synthetic.user%40example.com',
  bearer: 'SYNTHbearerTOKEN0123456789abcdef',
  apiKey: 'SYNTHapikey9f8e7d6c5b4a',
  cookie: 'SYNTHsessioncookie77aa',
  query: 'SYNTHquerytextjanedoe',
  queryToken: 'SYNTHqstoken31337',
  jwt: 'eyJSYNTHhdr.eyJSYNTHpayload.SYNTHsig',
  password: 'SYNTHpassw0rdxyz',
  sql: 'SYNTHsqlfragment',
} as const;

export function syntheticValues(): string[] {
  return [...Object.values(SYNTHETIC), 'SYNTH', 'c3.synthetic', 'Bearer SYNTH'];
}

export type CapturedEnvelopes = { bodies: string[] };

export function memoryTransport(store: CapturedEnvelopes) {
  return (options: Parameters<typeof createTransport>[0]) =>
    createTransport(options, async (request) => {
      const body = request.body;
      store.bodies.push(typeof body === 'string' ? body : Buffer.from(body).toString('utf8'));
      return { statusCode: 200 };
    });
}

/** Parses envelope items of type `event`. */
export function envelopeEvents(store: CapturedEnvelopes): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  for (const body of store.bodies) {
    const lines = body.split('\n');
    for (let i = 1; i < lines.length - 1; i += 2) {
      const header = JSON.parse(lines[i] || '{}') as { type?: string };
      if (header.type === 'event') events.push(JSON.parse(lines[i + 1] || '{}'));
    }
  }
  return events;
}

/** Records every outbound socket target so the test can prove no egress. */
export function watchSockets(): { targets: string[]; restore: () => void } {
  const targets: string[] = [];
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function patched(this: net.Socket, ...args: unknown[]) {
    const head = Array.isArray(args[0]) ? (args[0] as unknown[])[0] : args[0];
    const first = head as { host?: string; path?: string; port?: number } | number | string;
    if (typeof first === 'object' && first) targets.push(String(first.host ?? first.path ?? 'unknown'));
    else if (typeof first === 'number') targets.push(String(args[1] ?? 'localhost'));
    else targets.push(String(first));
    return (original as (...a: unknown[]) => net.Socket).apply(this, args);
  } as typeof net.Socket.prototype.connect;
  return {
    targets,
    restore: () => {
      net.Socket.prototype.connect = original;
    },
  };
}
