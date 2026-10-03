/**
 * Insurance-side parent handoff prep.
 * Device Save stays local. This module never calls Ask and never turns sync on.
 */

export const INSURANCE_PARENT_SYNC = 'OFF' as const;

export const SAVE_CONTROL_OFF = '♡ Save';
export const SAVE_CONTROL_ON = '♥ Saved';
export const SAVE_ACKNOWLEDGEMENT = 'Saved on this device';
export const UNSAVE_ACKNOWLEDGEMENT = 'Removed from this device';

export const INSURANCE_PROVIDER_CLASS = 'insurance_provider' as const;
export const PROVIDER_ID_NAMESPACE = 'insurance.providers.id' as const;
export const PROVIDER_PUBLICATION_SOURCE = 'insurance.providers' as const;
export const PROVIDER_PUBLICATION_GRAIN = 'agency_provider' as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATE_RE = /^[A-Z]{2}$/;

export type InsuranceProfileClass =
  | 'insurance_provider'
  | 'legal_insurer'
  | 'carrier';

export type ParentSaveReadiness = 'READY' | 'NOT_READY';

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
 * Classes that exist in Insurance today.
 * Only a published agency row with providers.id can become a parent Save later.
 * Legal insurers and carrier brands have no profile Save control.
 */
export const PROFILE_CLASS_CONTRACTS: readonly ProfileClassContract[] = [
  {
    profileClass: 'insurance_provider',
    parentSave: 'READY',
    nativeIdentity: 'providers.id UUID',
    identifierNamespace: PROVIDER_ID_NAMESPACE,
    publicationSource: PROVIDER_PUBLICATION_SOURCE,
    publicationGrain: PROVIDER_PUBLICATION_GRAIN,
    jurisdiction: 'primary license state when it is a two-letter code; not the save key',
    reason: 'Published agency profile. Return path is /providers/{canonical slug}.',
  },
  {
    profileClass: 'legal_insurer',
    parentSave: 'NOT_READY',
    nativeIdentity: 'cohort entity_id UUID (not NAIC, not slug)',
    identifierNamespace: 'insurance.legal_insurer.entity_id',
    publicationSource: 'ins-insurer-005b-public-ready-cohort',
    publicationGrain: 'legal_insurer',
    jurisdiction: 'examination jurisdiction list; not the save key',
    reason: 'No Save control. NAIC and slug are not parent Save keys.',
  },
  {
    profileClass: 'carrier',
    parentSave: 'NOT_READY',
    nativeIdentity: 'none',
    identifierNamespace: 'none',
    publicationSource: 'lib/carriers/registry.ts',
    publicationGrain: 'curated_carrier_brand',
    jurisdiction: 'none',
    reason: 'Slug-only curated brand. No stable provider id and no Save control.',
  },
];

export const UNSAFE_PROFILE_CLASSES = ['carrier', 'fallback_provider'] as const;

export type IdentityFailure =
  | 'unresolved'
  | 'ambiguous'
  | 'synthetic'
  | 'slug_only'
  | 'unsafe_class';

export type ProviderIdentity = {
  ok: true;
  profileClass: typeof INSURANCE_PROVIDER_CLASS;
  nativeIdentity: string;
  identifierNamespace: typeof PROVIDER_ID_NAMESPACE;
  publicationSource: typeof PROVIDER_PUBLICATION_SOURCE;
  publicationGrain: typeof PROVIDER_PUBLICATION_GRAIN;
  jurisdiction: string | null;
  returnPath: `/providers/${string}`;
  createsWatch: false;
};

export type IdentityResolution =
  | ProviderIdentity
  | { ok: false; reason: IdentityFailure };

export type PendingParentSync = {
  version: 'insurance-parent-prep/1';
  profileClass: typeof INSURANCE_PROVIDER_CLASS;
  nativeIdentity: string;
  identifierNamespace: typeof PROVIDER_ID_NAMESPACE;
  returnPath: `/providers/${string}`;
  status: 'pending';
  transmitted: false;
  createsWatch: false;
  acknowledgement: typeof SAVE_ACKNOWLEDGEMENT;
};

export type ParentHandoffResult =
  | { ok: true; pending: PendingParentSync }
  | { ok: false; reason: IdentityFailure | 'parent_sync_off' };

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

export function isPublishedProviderId(value: string | null | undefined): value is string {
  if (!value) return false;
  const id = value.trim().toLowerCase();
  if (id === NIL_UUID) return false;
  if (id.startsWith('fallback-')) return false;
  return UUID_RE.test(id);
}

export function resolveInsuranceProviderIdentity(input: {
  publishedId: string | null | undefined;
  publishedSlug: string | null | undefined;
  clientSuppliedId?: string | null;
  licenseState?: string | null;
}): IdentityResolution {
  const publishedSlug = input.publishedSlug?.trim() ?? '';
  const publishedId = input.publishedId?.trim().toLowerCase() ?? '';
  const clientSuppliedId = input.clientSuppliedId?.trim().toLowerCase() ?? '';

  if (clientSuppliedId.startsWith('fallback-') && !isPublishedProviderId(publishedId)) {
    return { ok: false, reason: 'synthetic' };
  }
  if (!publishedId && publishedSlug) {
    return { ok: false, reason: 'slug_only' };
  }
  if (!isPublishedProviderId(publishedId) || !SLUG_RE.test(publishedSlug)) {
    return { ok: false, reason: publishedId.startsWith('fallback-') ? 'synthetic' : 'unresolved' };
  }
  if (clientSuppliedId && clientSuppliedId !== publishedId) {
    return { ok: false, reason: 'ambiguous' };
  }

  const licenseState = input.licenseState?.trim().toUpperCase() ?? '';
  return {
    ok: true,
    profileClass: INSURANCE_PROVIDER_CLASS,
    nativeIdentity: publishedId,
    identifierNamespace: PROVIDER_ID_NAMESPACE,
    publicationSource: PROVIDER_PUBLICATION_SOURCE,
    publicationGrain: PROVIDER_PUBLICATION_GRAIN,
    jurisdiction: STATE_RE.test(licenseState) ? licenseState : null,
    returnPath: `/providers/${publishedSlug}`,
    createsWatch: false,
  };
}

export function stageParentHandoff(resolution: IdentityResolution): ParentHandoffResult {
  if (!resolution.ok) return resolution;
  return {
    ok: true,
    pending: {
      version: 'insurance-parent-prep/1',
      profileClass: resolution.profileClass,
      nativeIdentity: resolution.nativeIdentity,
      identifierNamespace: resolution.identifierNamespace,
      returnPath: resolution.returnPath,
      status: 'pending',
      transmitted: false,
      createsWatch: false,
      acknowledgement: SAVE_ACKNOWLEDGEMENT,
    },
  };
}

/** Production parent sync stays off. This does not call Ask. */
export function transmitParentSync(_pending: PendingParentSync): {
  ok: false;
  reason: 'PRODUCTION_PARENT_SYNC_OFF';
  transmitted: false;
} {
  return { ok: false, reason: 'PRODUCTION_PARENT_SYNC_OFF', transmitted: false };
}

export function parentSaveReady(profileClass: InsuranceProfileClass): boolean {
  return (
    PROFILE_CLASS_CONTRACTS.find((row) => row.profileClass === profileClass)?.parentSave ===
    'READY'
  );
}
