/**
 * License JSON helpers.
 *
 * LEGACY PUBLIC MAPPING (INS-NAT-001 / INS-NAT-009):
 * mapRowToProvider still copies licenses[0] onto license_number / license_state.
 * That is documented, tested, and NOT a multi-state identity API.
 *
 * Graph / future projection MUST use allLicenseEntries().
 */

import type { LicenseEntry, LicenseInfo } from '@/types/supabase';

export function allLicenseEntries(
  licenseInfo: LicenseInfo | null | undefined
): LicenseEntry[] {
  const licenses = licenseInfo?.licenses;
  if (!Array.isArray(licenses)) return [];
  return licenses.filter((l) => l && typeof l.license_number === 'string');
}

/** Legacy display pick — first array element only. Do not use for identity. */
export function primaryLicenseEntry(
  licenseInfo: LicenseInfo | null | undefined
): LicenseEntry | undefined {
  return allLicenseEntries(licenseInfo)[0];
}

export const LEGACY_LICENSE_FIRST_ONLY_PATHS = [
  'lib/providers/map-db-provider.ts — license_number/state/source from licenses[0]',
  'lib/admin/provider-mapper.ts — dbProviderToForm uses licenses[0]',
  'actions/my-insurance.ts — checkedAt / states_licensed[0]',
  'scripts/dfs/audit-nonresident-fl.ts — license_number from licenses[0]',
  'scripts/tdi/audit-nonresident-tx.ts — license_number from licenses[0]',
] as const;
