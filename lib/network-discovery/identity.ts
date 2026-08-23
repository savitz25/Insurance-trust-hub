import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import { normalizeStateCode } from '@/lib/network-discovery/geography';

export type IdentityKind = 'doi_license' | 'npn' | 'provider_uuid' | 'carrier_slug';

export type NetworkIdentity = {
  network_id: string;
  identity_kind: IdentityKind;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Stable discovery identity. Never name-only.
 *
 * Preference:
 *   1. NPN when present on the source row (not inferred from staging joins)
 *   2. DOI license + jurisdiction
 *   3. providers.id UUID
 *   4. carrier slug
 */
export function buildProviderIdentity(input: {
  id: string;
  licenseNumber?: string | null;
  licenseState?: string | null;
  npn?: string | null;
}): NetworkIdentity | null {
  const npn = (input.npn || '').trim();
  if (npn && /^\d{5,10}$/.test(npn)) {
    return { network_id: `insurance:npn:${npn}`, identity_kind: 'npn' };
  }

  const license = cleanLicenseNumber(input.licenseNumber);
  const state = normalizeStateCode(input.licenseState);
  if (license && state) {
    return {
      network_id: `insurance:doi:${state}:${license}`,
      identity_kind: 'doi_license',
    };
  }

  if (isUuid(input.id)) {
    return {
      network_id: `insurance:provider:${input.id.toLowerCase()}`,
      identity_kind: 'provider_uuid',
    };
  }

  return null;
}

export function buildCarrierIdentity(slug: string): NetworkIdentity {
  return {
    network_id: `insurance:carrier:${slug}`,
    identity_kind: 'carrier_slug',
  };
}

/** Deterministic disambiguation when two rows share a DOI/NPN key. */
export function disambiguateNetworkId(
  networkId: string,
  sourcePk: string
): string {
  return `${networkId}:src:${sourcePk}`;
}
