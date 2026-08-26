/**
 * INS-NAT-002 — slug is not an identity key.
 *
 * Legacy promote looked up providers by slug only, then UPDATED the hit.
 * Two unrelated licenses that slugify to the same string would overwrite
 * states_licensed / license_info / contact.
 *
 * This helper: update only when jurisdiction + license number match;
 * otherwise insert under a disambiguated slug. Existing public slugs
 * are not rewritten.
 */

import type { LicenseInfo } from '@/types/supabase';
import { allLicenseEntries } from '@/lib/providers/license-entries';
import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';

export type ExistingProviderIdentity = {
  id: string;
  slug: string;
  license_info?: LicenseInfo | null;
};

export type ProviderWritePlan =
  | { action: 'insert'; slug: string; reason: 'no_existing_slug' }
  | { action: 'update'; id: string; slug: string; reason: 'same_license_identity' }
  | {
      action: 'insert_disambiguated';
      slug: string;
      collidedWithId: string;
      reason: 'slug_collision_different_license';
    };

function compactLicense(raw: string | null | undefined): string {
  return (cleanLicenseNumber(raw || '') || String(raw || ''))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function rowMatchesLicense(
  row: ExistingProviderIdentity,
  licenseState: string,
  licenseNumber: string
): boolean {
  const wantState = licenseState.trim().toUpperCase();
  const wantLic = compactLicense(licenseNumber);
  if (!wantState || !wantLic) return false;
  return allLicenseEntries(row.license_info).some((l) => {
    const st = String(l.state || '').trim().toUpperCase();
    const lic = compactLicense(l.license_number);
    return st === wantState && lic === wantLic;
  });
}

export function disambiguateProviderSlug(
  candidateSlug: string,
  licenseState: string,
  licenseNumber: string
): string {
  const st = licenseState.trim().toLowerCase().slice(0, 2);
  const lic = compactLicense(licenseNumber).toLowerCase().slice(0, 16);
  const base = candidateSlug.replace(/-+$/, '');
  const extra = [st, lic].filter(Boolean).join('-');
  const next = extra ? `${base}-${extra}` : `${base}-x`;
  return next.slice(0, 90);
}

export function licenseIdentityFromPromoteInsert(insert: {
  license_info?: LicenseInfo | null;
  states_licensed?: string[] | null;
}): { licenseState: string; licenseNumber: string } {
  const first = allLicenseEntries(insert.license_info)[0];
  return {
    licenseState:
      String(first?.state || insert.states_licensed?.[0] || '').toUpperCase(),
    licenseNumber: first?.license_number || '',
  };
}

export function resolveLegacyProviderWrite(input: {
  candidateSlug: string;
  licenseState: string;
  licenseNumber: string;
  existingBySlug: ExistingProviderIdentity | null;
}): ProviderWritePlan {
  const slug = input.candidateSlug;
  if (!input.existingBySlug) {
    return { action: 'insert', slug, reason: 'no_existing_slug' };
  }
  if (
    rowMatchesLicense(
      input.existingBySlug,
      input.licenseState,
      input.licenseNumber
    )
  ) {
    return {
      action: 'update',
      id: input.existingBySlug.id,
      slug: input.existingBySlug.slug,
      reason: 'same_license_identity',
    };
  }
  return {
    action: 'insert_disambiguated',
    slug: disambiguateProviderSlug(
      slug,
      input.licenseState,
      input.licenseNumber
    ),
    collidedWithId: input.existingBySlug.id,
    reason: 'slug_collision_different_license',
  };
}
