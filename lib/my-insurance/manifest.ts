import { createHash } from 'node:crypto';
import {
  IDENTIFIER_NAMESPACE,
  INSURANCE_PROVIDER_CLASS,
  type IdentityResolution,
} from '@/lib/my-insurance/parent-adapter';

/** Same selected-profile wire version the specialist handoff already uses. */
export const TRANSFER_VERSION_V3 = 'v2-3/selected-profiles/3' as const;

export type InsuranceProfileClaim = {
  hub: 'insurance';
  profileClass: typeof INSURANCE_PROVIDER_CLASS;
  identifierNamespace: typeof IDENTIFIER_NAMESPACE;
  sourceIdentifier: string;
  jurisdiction: string;
  canonicalReturnPath: `/providers/${string}`;
};

export type InsuranceManifest = {
  version: typeof TRANSFER_VERSION_V3;
  sourceHub: 'insurance';
  audience: 'ask';
  selected: [
    {
      localItemId: string;
      revision: '1';
      digest: string;
      profile: InsuranceProfileClaim;
    },
  ];
  returnTask: {
    kind: 'profile';
    hub: 'insurance';
    canonicalSlug: string;
    profile: InsuranceProfileClaim;
    canonicalReturnPath: `/providers/${string}`;
  };
};

const PROFILE_KEYS = [
  'hub',
  'profileClass',
  'identifierNamespace',
  'sourceIdentifier',
  'jurisdiction',
  'canonicalReturnPath',
] as const;

export function closedProfile(identity: Extract<IdentityResolution, { ok: true }>): InsuranceProfileClaim {
  return {
    hub: 'insurance',
    profileClass: identity.profileClass,
    identifierNamespace: identity.identifierNamespace,
    sourceIdentifier: identity.sourceIdentifier,
    jurisdiction: identity.jurisdiction,
    canonicalReturnPath: identity.canonicalReturnPath,
  };
}

export function profileDigest(profile: InsuranceProfileClaim): string {
  const ordered = PROFILE_KEYS.map((key) => profile[key]);
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}

export function insuranceManifest(
  identity: Extract<IdentityResolution, { ok: true }>,
): InsuranceManifest {
  const profile = closedProfile(identity);
  const slug = identity.canonicalReturnPath.slice('/providers/'.length);
  return {
    version: TRANSFER_VERSION_V3,
    sourceHub: 'insurance',
    audience: 'ask',
    selected: [
      {
        localItemId: slug,
        revision: '1',
        digest: profileDigest(profile),
        profile,
      },
    ],
    returnTask: {
      kind: 'profile',
      hub: 'insurance',
      canonicalSlug: slug,
      profile,
      canonicalReturnPath: identity.canonicalReturnPath,
    },
  };
}

/** Digest over the closed field set. providers.id is not an input. */
export function manifestDigest(manifest: InsuranceManifest): string {
  const profile = manifest.selected[0].profile;
  const task = manifest.returnTask;
  return createHash('sha256')
    .update(
      JSON.stringify([
        manifest.version,
        manifest.sourceHub,
        manifest.audience,
        PROFILE_KEYS.map((key) => profile[key]),
        manifest.selected[0].localItemId,
        manifest.selected[0].revision,
        manifest.selected[0].digest,
        task.kind,
        task.hub,
        task.canonicalSlug,
        task.canonicalReturnPath,
        PROFILE_KEYS.map((key) => task.profile[key]),
      ]),
    )
    .digest('hex');
}
