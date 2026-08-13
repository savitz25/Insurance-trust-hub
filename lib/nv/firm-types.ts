/**
 * Phase 14 — Nevada firm license type policy.
 * All types are staged. Default promote is consumer-facing producer / agency /
 * surplus / title / MGA / consultant firms with a Nevada physical address.
 *
 * Staged but not default-promoted: Independent Adjuster, External Review
 * Organization, TPA, Utilization Review, service contracts, bail, funeral,
 * cemetery, motor club, appraisers, viatical, reinsurance intermediaries.
 */

export const NV_PROMOTE_FIRM_TYPES = [
  'Resident Producer Firm',
  'Non-Resident Producer Firm',
  'Resident Surplus Lines Broker',
  'Non-Resident Surplus Lines Broker',
  'Resident Managing General Agency',
  'Non-Resident Managing General Agency',
  'Resident Title Agency',
  'Non-Resident Title Agency',
  'Resident Insurance Consultant',
] as const;

export type NvPromoteFirmType = (typeof NV_PROMOTE_FIRM_TYPES)[number];

export function normalizeFirmLicenseType(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

export function isPromoteEligibleFirmType(raw: string | null | undefined): boolean {
  const t = normalizeFirmLicenseType(raw);
  return (NV_PROMOTE_FIRM_TYPES as readonly string[]).some(
    (allowed) => allowed.toLowerCase() === t.toLowerCase()
  );
}

export function isAdjusterOrClaimsOnlyType(raw: string | null | undefined): boolean {
  const t = normalizeFirmLicenseType(raw).toLowerCase();
  return (
    /independent adjuster/.test(t) ||
    /external review/.test(t) ||
    /third party administrator/.test(t) ||
    /utilization review/.test(t) ||
    /damage appraiser/.test(t)
  );
}
