import {
  INSURANCE_PRODUCTION_PINS,
  signInsuranceAssertion,
  type AssertionKey,
} from '@/lib/my-insurance/insurance-assertion';
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
import { randomBytes } from 'node:crypto';

const HANDOFF_TTL_MS = 90_000;
const PARENT_API_PATH = '/api/my-trusthub/profile-save';

/**
 * Builds the closed manifest and, when a test key is supplied, an Ed25519
 * assertion. Production transport stays off and does not call Ask.
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
  const transport = transmitParentSync(pending);
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
