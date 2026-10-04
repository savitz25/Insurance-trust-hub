import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import { productionParentGate, releaseAdmits, type ReleaseEnv } from '@/lib/my-insurance/production-gate';

/**
 * Insurance-side parent handoff prep.
 * Device Save stays local. This module never calls Ask and never turns sync on.
 *
 * Three saved-agency stores coexist during transition:
 * - Device Saved is localStorage (`ith:my-insurance:v1`) and changes immediately.
 * - Signed-in Insurance `saved_providers` stays the specialist workspace copy,
 *   keyed by user and provider slug. This prep does not read it as a parent
 *   commit, migrate it, or delete it.
 * - A My TrustHub parent Saved is a separate signed handoff. INSURANCE_PARENT_SYNC
 *   stays OFF. Only the operator gate can admit a production post.
 * My Insurance remains the specialist workspace.
 */

export const INSURANCE_PARENT_SYNC = 'OFF' as const;
export const PROVIDERS_ID_DURABLE = false as const;

export const SAVE_CONTROL_OFF = '♡ Save';
export const SAVE_CONTROL_ON = '♥ Saved';
export const SAVE_ACKNOWLEDGEMENT = 'Saved on this device';
export const UNSAVE_ACKNOWLEDGEMENT = 'Removed from this device';

export const INSURANCE_PROVIDER_CLASS = 'insurance_provider' as const;
export const IDENTIFIER_NAMESPACE = 'insurance.state_license' as const;
export const PROVIDER_PUBLICATION_SOURCE = 'insurance.providers' as const;
export const PROVIDER_PUBLICATION_GRAIN = 'agency_provider' as const;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATE_RE = /^[A-Z]{2}$/;

export type InsuranceProfileClass =
  | 'insurance_provider'
  | 'legal_insurer'
  | 'carrier';

export type ParentSaveReadiness = 'READY' | 'NOT_READY';
export type ParentIntent = 'save' | 'unsave';

export type ProfileClassContract = {
  profileClass: InsuranceProfileClass;
  parentSave: ParentSaveReadiness;
  nativeIdentity: string;
  identifierNamespace: string;
  publicationSource: string;
  publicationGrain: string;
  jurisdiction: string;
  reason: string;
};

/**
 * Only a published agency with exactly one state license can stage a parent Save.
 * providers.id is a database UUID and is not the network identity.
 * Legal insurers and carrier brands stay out of scope.
 */
export const PROFILE_CLASS_CONTRACTS: readonly ProfileClassContract[] = [
  {
    profileClass: 'insurance_provider',
    parentSave: 'READY',
    nativeIdentity: 'one regulator license number on the published agency row',
    identifierNamespace: IDENTIFIER_NAMESPACE,
    publicationSource: PROVIDER_PUBLICATION_SOURCE,
    publicationGrain: PROVIDER_PUBLICATION_GRAIN,
    jurisdiction: 'the single license state on that row',
    reason:
      'Eligible only when license_info collapses to one verified state license and states_licensed does not add another state.',
  },
  {
    profileClass: 'legal_insurer',
    parentSave: 'NOT_READY',
    nativeIdentity: 'cohort entity_id UUID',
    identifierNamespace: 'insurance.legal_insurer.entity_id',
    publicationSource: 'ins-insurer-005b public cohort',
    publicationGrain: 'legal_insurer',
    jurisdiction: 'not a parent save key',
    reason: 'No Save control. NAIC and slug are not the profile identity.',
  },
  {
    profileClass: 'carrier',
    parentSave: 'NOT_READY',
    nativeIdentity: 'none',
    identifierNamespace: 'none',
    publicationSource: 'lib/carriers/registry.ts',
    publicationGrain: 'carrier_brand',
    jurisdiction: 'none',
    reason: 'Slug-only brand pages are unsafe for parent Save.',
  },
];

export const UNSAFE_PROFILE_CLASSES = ['carrier', 'fallback_provider'] as const;

export type LicenseIdentityEntry = {
  state?: string | null;
  license_number?: string | null;
  status?: string | null;
};

export type IdentityFailureReason =
  | 'synthetic'
  | 'slug_only'
  | 'unresolved'
  | 'ambiguous'
  | 'tampered'
  | 'page_closed';

export type IdentityResolution =
  | {
      ok: true;
      profileClass: typeof INSURANCE_PROVIDER_CLASS;
      identifierNamespace: typeof IDENTIFIER_NAMESPACE;
      sourceIdentifier: string;
      jurisdiction: string;
      canonicalReturnPath: `/providers/${string}`;
      publicationSource: typeof PROVIDER_PUBLICATION_SOURCE;
      publicationGrain: typeof PROVIDER_PUBLICATION_GRAIN;
      createsWatch: false;
    }
  | { ok: false; reason: IdentityFailureReason };

export type PendingParentSync = {
  version: 'insurance-parent-prep/2';
  intent: ParentIntent;
  profileClass: typeof INSURANCE_PROVIDER_CLASS;
  identifierNamespace: typeof IDENTIFIER_NAMESPACE;
  sourceIdentifier: string;
  jurisdiction: string;
  canonicalReturnPath: `/providers/${string}`;
  manifestDigest: string;
  assertion: string | null;
  status: 'pending';
  transmitted: false;
  createsWatch: false;
  pageOpen: true;
  expiresAt: number;
  acknowledgement: typeof SAVE_ACKNOWLEDGEMENT | typeof UNSAVE_ACKNOWLEDGEMENT;
};

export type ParentHandoffResult =
  | { ok: true; pending: PendingParentSync }
  | { ok: false; reason: IdentityFailureReason };

export function compactLicenseNumber(raw: string | null | undefined): string {
  const cleaned = cleanLicenseNumber(raw || '') || '';
  return cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function claimed(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function hasBrowserIdentityClaim(input: {
  claimedProviderId?: string | null;
  claimedSourceIdentifier?: string | null;
  claimedJurisdiction?: string | null;
  claimedName?: string | null;
  claimedReturnPath?: string | null;
}): boolean {
  return [
    input.claimedProviderId,
    input.claimedSourceIdentifier,
    input.claimedJurisdiction,
    input.claimedName,
    input.claimedReturnPath,
  ].some((value) => claimed(value).length > 0);
}

/**
 * Server-derived parent identity.
 * The browser may supply a slug for lookup only. Identifier claims are rejected.
 * providers.id is ignored except to recognize a fallback catalog row.
 */
export function resolveInsuranceProviderIdentity(input: {
  publishedSlug?: string | null;
  publishedId?: string | null;
  licenses?: readonly LicenseIdentityEntry[] | null;
  statesLicensed?: readonly string[] | null;
  claimedProviderId?: string | null;
  claimedSourceIdentifier?: string | null;
  claimedJurisdiction?: string | null;
  claimedName?: string | null;
  claimedReturnPath?: string | null;
}): IdentityResolution {
  const publishedId = claimed(input.publishedId);
  const publishedSlug = claimed(input.publishedSlug).toLowerCase();

  if (publishedId.startsWith('fallback-') || claimed(input.claimedProviderId).startsWith('fallback-')) {
    return { ok: false, reason: 'synthetic' };
  }
  if (hasBrowserIdentityClaim(input)) {
    return { ok: false, reason: 'tampered' };
  }

  const pairs = new Map<string, { jurisdiction: string; sourceIdentifier: string }>();
  for (const entry of input.licenses ?? []) {
    const jurisdiction = claimed(entry.state).toUpperCase();
    const sourceIdentifier = compactLicenseNumber(entry.license_number);
    if (!STATE_RE.test(jurisdiction) || !sourceIdentifier) continue;
    const status = claimed(entry.status);
    if (status && status !== 'verified') {
      return { ok: false, reason: 'unresolved' };
    }
    pairs.set(`${jurisdiction}:${sourceIdentifier}`, { jurisdiction, sourceIdentifier });
  }

  if (pairs.size > 1) {
    return { ok: false, reason: 'ambiguous' };
  }
  if (pairs.size === 0) {
    if (publishedSlug && SLUG_RE.test(publishedSlug)) {
      return { ok: false, reason: 'slug_only' };
    }
    return { ok: false, reason: 'unresolved' };
  }
  if (!SLUG_RE.test(publishedSlug)) {
    return { ok: false, reason: 'unresolved' };
  }

  const identity = [...pairs.values()][0]!;
  const licensedStates = (input.statesLicensed ?? [])
    .map((state) => claimed(state).toUpperCase())
    .filter((state) => STATE_RE.test(state));
  if (licensedStates.some((state) => state !== identity.jurisdiction)) {
    return { ok: false, reason: 'ambiguous' };
  }

  return {
    ok: true,
    profileClass: INSURANCE_PROVIDER_CLASS,
    identifierNamespace: IDENTIFIER_NAMESPACE,
    sourceIdentifier: identity.sourceIdentifier,
    jurisdiction: identity.jurisdiction,
    canonicalReturnPath: `/providers/${publishedSlug}`,
    publicationSource: PROVIDER_PUBLICATION_SOURCE,
    publicationGrain: PROVIDER_PUBLICATION_GRAIN,
    createsWatch: false,
  };
}

export function profileSaveControl(saved: boolean): {
  saved: boolean;
  label: typeof SAVE_CONTROL_OFF | typeof SAVE_CONTROL_ON;
  acknowledgement: typeof SAVE_ACKNOWLEDGEMENT | typeof UNSAVE_ACKNOWLEDGEMENT;
  createsWatch: false;
} {
  if (saved) {
    return {
      saved: false,
      label: SAVE_CONTROL_OFF,
      acknowledgement: UNSAVE_ACKNOWLEDGEMENT,
      createsWatch: false,
    };
  }
  return {
    saved: true,
    label: SAVE_CONTROL_ON,
    acknowledgement: SAVE_ACKNOWLEDGEMENT,
    createsWatch: false,
  };
}

/**
 * Gate check only. This function does not post.
 * Absent or malformed config stays off. An admitted gate still needs the signer.
 */
export function transmitParentSync(pending: PendingParentSync, env?: ReleaseEnv): {
  ok: false;
  reason: 'PRODUCTION_PARENT_SYNC_OFF' | 'UNSIGNED';
  transmitted: false;
} {
  const gate = productionParentGate(env);
  const slug = pending.canonicalReturnPath.startsWith('/providers/')
    ? pending.canonicalReturnPath.slice('/providers/'.length)
    : '';
  if (!releaseAdmits(slug, gate)) {
    return { ok: false, reason: 'PRODUCTION_PARENT_SYNC_OFF', transmitted: false };
  }
  return { ok: false, reason: 'UNSIGNED', transmitted: false };
}

export function parentSaveReady(profileClass: InsuranceProfileClass): boolean {
  return (
    PROFILE_CLASS_CONTRACTS.find((row) => row.profileClass === profileClass)?.parentSave ===
    'READY'
  );
}
