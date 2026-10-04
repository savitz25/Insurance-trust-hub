import { createPrivateKey, createPublicKey, randomBytes } from 'node:crypto';
import {
  ASSERTION_HEADER,
  INSURANCE_PRODUCTION_PINS,
  signInsuranceAssertion,
  type AssertionKey,
} from '@/lib/my-insurance/insurance-assertion';
import { browserHandoffIntent, type HandoffIntent } from '@/lib/my-insurance/handoff-form';
import { insuranceManifest, manifestDigest } from '@/lib/my-insurance/manifest';
import {
  SAVE_ACKNOWLEDGEMENT,
  UNSAVE_ACKNOWLEDGEMENT,
  transmitParentSync,
  type IdentityResolution,
  type ParentHandoffResult,
  type ParentIntent,
  type PendingParentSync,
} from '@/lib/my-insurance/parent-adapter';
import { releaseAdmits, type ParentRelease } from '@/lib/my-insurance/production-gate';

const HANDOFF_TTL_MS = 90_000;
const PARENT_API_PATH = '/api/my-trusthub/profile-save';

/**
 * Device-only closed manifest. A supplied test key can sign an assertion.
 * This function does not post to Ask.
 */
export function stageSignedParentHandoff(input: {
  resolution: IdentityResolution;
  intent: ParentIntent;
  pageOpen: boolean;
  key?: AssertionKey | null;
  now?: number;
  browser?: string;
}): ParentHandoffResult {
  if (!input.pageOpen) return { ok: false, reason: 'page_closed' };
  if (!input.resolution.ok) return input.resolution;

  const now = input.now ?? Date.now();
  const manifest = insuranceManifest(input.resolution);
  const body = Buffer.from(JSON.stringify(manifest));
  let assertion: string | null = null;
  if (input.key) {
    assertion = signInsuranceAssertion(
      input.key,
      'insurance',
      `${INSURANCE_PRODUCTION_PINS.parentOrigin}${PARENT_API_PATH}`,
      'transfer:stage',
      body,
      input.browser ?? randomBytes(32).toString('base64url'),
      null,
      null,
      now,
    );
  }

  const acknowledgement: PendingParentSync['acknowledgement'] =
    input.intent === 'unsave' ? UNSAVE_ACKNOWLEDGEMENT : SAVE_ACKNOWLEDGEMENT;
  const pending: PendingParentSync = {
    version: 'insurance-parent-prep/2' as const,
    intent: input.intent,
    profileClass: input.resolution.profileClass,
    identifierNamespace: input.resolution.identifierNamespace,
    sourceIdentifier: input.resolution.sourceIdentifier,
    jurisdiction: input.resolution.jurisdiction,
    canonicalReturnPath: input.resolution.canonicalReturnPath,
    manifestDigest: manifestDigest(manifest),
    assertion,
    status: 'pending' as const,
    transmitted: false as const,
    createsWatch: false as const,
    pageOpen: true as const,
    expiresAt: now + HANDOFF_TTL_MS,
    acknowledgement,
  };
  const transport = transmitParentSync(pending, {});
  if (transport.transmitted !== false) {
    return { ok: false, reason: 'unresolved' };
  }
  return { ok: true, pending };
}

/** Hard off. There is no production Ask call in this function. */
export function productionParentTransport(): {
  ok: false;
  reason: 'PRODUCTION_PARENT_SYNC_OFF';
  transmitted: false;
} {
  return { ok: false, reason: 'PRODUCTION_PARENT_SYNC_OFF', transmitted: false };
}

/** A parent acknowledgement is not accepted while sync is off. */
export function acceptParentAcknowledgement(): {
  accepted: false;
  reason: 'PRODUCTION_PARENT_SYNC_OFF';
} {
  return { accepted: false, reason: 'PRODUCTION_PARENT_SYNC_OFF' };
}

const PARENT_FORM_PATH = '/my/profile-save';
const opaque = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export type ParentCall = { body: string; assertion: string };
export type ParentResponse =
  | { ok: true; operation: string; result: { transferRef?: string; manifestDigest?: string; continuationRef?: string; expiresAt?: number } }
  | { ok: false };

export type ProductionStageResult =
  | { state: 'local_only'; reason: string; watchCreated: false; parentSync: 'off' }
  | {
      state: 'continue';
      target: string;
      continuationRef: string;
      intent: HandoffIntent;
      expiresAt: number;
      watchCreated: false;
      parentSync: 'staged';
    };

const localOnly = (reason: string): ProductionStageResult => ({
  state: 'local_only',
  reason,
  watchCreated: false,
  parentSync: 'off',
});

/**
 * Production signer. Missing, mismatched, or non-Ed25519 material returns no key.
 * The caller must not post with key: null.
 */
export function productionHandoffDeps(env: NodeJS.ProcessEnv = process.env): {
  key?: AssertionKey;
  parent?: (call: ParentCall) => Promise<ParentResponse>;
} {
  const origin = env.MY_TRUSTHUB_V23_PARENT_ORIGIN?.trim() ?? '';
  const kid = env.MY_TRUSTHUB_V23_INSURANCE_KEY_ID?.trim() ?? '';
  const pem = env.MY_TRUSTHUB_V23_INSURANCE_SIGNING_PRIVATE_KEY_PEM ?? '';
  const askKid = env.MY_TRUSTHUB_V23_ASK_KEY_ID?.trim() ?? '';
  const askPem = env.MY_TRUSTHUB_V23_ASK_VERIFY_PUBLIC_KEY_PEM ?? '';
  if (origin !== INSURANCE_PRODUCTION_PINS.parentOrigin) return {};
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(kid) || !/^[A-Za-z0-9_-]{1,64}$/.test(askKid)) return {};
  if (!pem.includes('PRIVATE KEY') || !askPem.includes('PUBLIC KEY')) return {};
  try {
    const insurancePrivate = createPrivateKey(pem);
    const askPublic = createPublicKey(askPem);
    if (insurancePrivate.asymmetricKeyType !== 'ed25519' || askPublic.asymmetricKeyType !== 'ed25519') return {};
    const insuranceSpki = createPublicKey(insurancePrivate).export({ type: 'spki', format: 'pem' }).toString();
    const askSpki = askPublic.export({ type: 'spki', format: 'pem' }).toString();
    if (insuranceSpki === askSpki) return {};
  } catch {
    return {};
  }
  const key = { kid, pem };
  return {
    key,
    parent: async (call) => {
      const response = await fetch(INSURANCE_PRODUCTION_PINS.parentOrigin + PARENT_API_PATH, {
        method: 'POST',
        body: call.body,
        headers: { 'content-type': 'application/json', [ASSERTION_HEADER]: call.assertion },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return { ok: false };
      const body = await response.json() as { ok?: boolean; operation?: string; result?: ParentResponse extends { ok: true } ? ParentResponse['result'] : never };
      if (!body || body.ok !== true || typeof body.operation !== 'string' || !body.result) return { ok: false };
      return { ok: true, operation: body.operation, result: body.result };
    },
  };
}

/**
 * One signed closed manifest, posted to the Ask profile-save handler.
 * Ask returns its own guest-stage digest. That digest is not compared.
 * A missing key does not post and does not report account success.
 */
export async function stageProductionHandoff(input: {
  resolution: IdentityResolution;
  intent: ParentIntent;
  pageOpen: boolean;
  gate: ParentRelease;
  key?: AssertionKey | null;
  parent?: ((call: ParentCall) => Promise<ParentResponse>) | null;
  now?: number;
  browser?: string;
}): Promise<ProductionStageResult> {
  if (!input.pageOpen) return localOnly('page_closed');
  if (!input.resolution.ok) return localOnly(input.resolution.reason);
  const slug = input.resolution.canonicalReturnPath.slice('/providers/'.length);
  if (!releaseAdmits(slug, input.gate)) return localOnly('sync_off');
  if (!input.key || !input.parent) return localOnly('unsigned');
  const now = input.now ?? Date.now();
  const browser = input.browser ?? randomBytes(32).toString('base64url');
  if (!opaque(browser)) return localOnly('unsigned');
  const manifest = insuranceManifest(input.resolution);
  const body = JSON.stringify(manifest);
  let assertion: string;
  try {
    assertion = signInsuranceAssertion(
      input.key,
      'insurance',
      `${INSURANCE_PRODUCTION_PINS.parentOrigin}${PARENT_API_PATH}`,
      'transfer:stage',
      Buffer.from(body),
      browser,
      null,
      null,
      now,
    );
  } catch {
    return localOnly('unsigned');
  }
  try {
    const response = await input.parent({ body, assertion });
    const result = response.ok ? response.result : null;
    if (!response.ok || response.operation !== 'prepareGuestProfileTransfer' || !result) return localOnly('unavailable');
    if (!opaque(result.continuationRef) || !opaque(result.transferRef)) return localOnly('unavailable');
    if (!Number.isFinite(result.expiresAt) || (result.expiresAt ?? 0) <= now) return localOnly('unavailable');
    return {
      state: 'continue',
      target: INSURANCE_PRODUCTION_PINS.parentOrigin + PARENT_FORM_PATH,
      continuationRef: result.continuationRef,
      intent: browserHandoffIntent(input.intent),
      expiresAt: result.expiresAt ?? now,
      watchCreated: false,
      parentSync: 'staged',
    };
  } catch {
    return localOnly('unavailable');
  }
}
