import {
  ASSERTION_HEADER,
  verifyInsuranceAssertion,
  type AssertionKey,
  type NonceStore,
} from '@/lib/my-insurance/insurance-assertion';
import { INSURANCE_PRODUCTION_PINS } from '@/lib/my-insurance/insurance-assertion';

const SOURCE_PATH = '/api/my-trusthub/profile-save/source';
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};
const reply = (body: unknown, status: number) => Response.json(body, { status, headers });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const opaque = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const NATIVE_ID = /^state-license:([A-Z]{2}):([A-Z0-9]{3,32})$/;

function nativeId(value: unknown): string | null {
  if (!object(value) || typeof value.nativeId !== 'string') return null;
  if (value.hub !== 'insurance' || value.profileClass !== 'insurance_provider') return null;
  const match = NATIVE_ID.exec(value.nativeId);
  if (!match || !/[0-9]/.test(match[2]!)) return null;
  return value.nativeId;
}

/**
 * Signed Ask acknowledgement. Account success is this response, not the device write.
 * A missing verify key fails closed.
 */
export async function handleInsuranceSource(
  request: Request,
  options: { key: AssertionKey | null; nonces: NonceStore; now?: () => number },
): Promise<Response> {
  if (!options.key) return reply({ ok: false, error: 'unavailable' }, 503);
  const url = new URL(request.url);
  if (request.method !== 'POST') return reply({ ok: false, error: 'invalid' }, 405);
  if (url.origin !== INSURANCE_PRODUCTION_PINS.insuranceOrigin || url.pathname !== SOURCE_PATH || url.search) {
    return reply({ ok: false, error: 'invalid' }, 400);
  }
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return reply({ ok: false, error: 'invalid' }, 400);
  }
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > 131072) return reply({ ok: false, error: 'invalid' }, 413);
  let body: unknown;
  try { body = JSON.parse(bytes.toString('utf8')); } catch { return reply({ ok: false, error: 'invalid' }, 400); }
  if (!object(body) || body.action !== 'acknowledge' || !exact(body, ['action', 'continuationRef', 'receipts']) || !Array.isArray(body.receipts)) {
    return reply({ ok: false, error: 'invalid' }, 400);
  }
  const now = options.now?.() ?? Date.now();
  const proof = new Request(request.url, { method: 'POST', headers: request.headers, body: bytes });
  try {
    const claims = await verifyInsuranceAssertion(proof, bytes, options.key, 'ask', 'source:ack', options.nonces, now);
    if (!opaque(body.continuationRef) || body.receipts.length !== 1) return reply({ ok: false, error: 'unauthorized' }, 403);
    const receipt = body.receipts[0];
    if (!object(receipt) || receipt.localCopy !== 'keep' || !object(receipt.parent) || !object(receipt.item)) {
      return reply({ ok: false, error: 'unauthorized' }, 403);
    }
    if ('watch' in receipt || 'watchCreated' in receipt) return reply({ ok: false, error: 'unauthorized' }, 403);
    const outcome = String(receipt.parent.outcome);
    if (!['saved', 'already_saved', 'local_only'].includes(outcome)) return reply({ ok: false, error: 'unauthorized' }, 403);
    if (typeof receipt.requestKey !== 'string' || !receipt.requestKey.startsWith(claims.browser + ':')) {
      return reply({ ok: false, error: 'unauthorized' }, 403);
    }
    if (!object(receipt.item) || !nativeId(receipt.item.profile)) return reply({ ok: false, error: 'unauthorized' }, 403);
    const acknowledged = outcome === 'local_only' ? 'unsave' : 'save';
    return reply({ ok: true, result: { acknowledged, watchCreated: false } }, 200);
  } catch {
    return reply({ ok: false, error: 'unauthorized' }, 403);
  }
}

export function askVerifyKey(env: NodeJS.ProcessEnv = process.env): AssertionKey | null {
  const kid = env.MY_TRUSTHUB_V23_ASK_KEY_ID?.trim() ?? '';
  const pem = env.MY_TRUSTHUB_V23_ASK_VERIFY_PUBLIC_KEY_PEM ?? '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(kid) || !pem.includes('PUBLIC KEY')) return null;
  return { kid, pem };
}

export { ASSERTION_HEADER };
