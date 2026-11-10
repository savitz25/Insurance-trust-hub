/**
 * License JSON helpers.
 *
 * LEGACY PUBLIC MAPPING (INS-NAT-001 / INS-NAT-009):
 * mapRowToProvider still copies licenses[0] onto license_number / license_state.
 * That is documented, tested, and NOT a multi-state identity API.
 *
 * Graph / future projection MUST use allLicenseEntries().
 * Public per-license badges use badgeEligibleLicenses() and never informational[].
 */

import type { InformationalLicense, LicenseEntry, LicenseInfo } from '@/types/supabase';
import { getLicenseDepartment } from '@/lib/tools/license-verification';

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

/**
 * A date-only expiration is still valid on that UTC calendar day.
 * Unparseable values are treated as expired so they are not badged.
 */
export function isLicenseExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (expiresAt == null) return false;
  const raw = String(expiresAt).trim();
  if (!raw) return false;
  const day = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return day < now.toISOString().slice(0, 10);
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return true;
  return parsed < now.getTime();
}

/** Verified, identity-matched, sourced, checked, and not expired. */
export function isBadgeEligibleLicense(
  entry: LicenseEntry | null | undefined,
  now: Date = new Date()
): entry is LicenseEntry {
  if (!entry) return false;
  if (entry.status !== 'verified') return false;
  if (entry.identityMatchAccepted !== true) return false;
  if (typeof entry.source !== 'string' || !entry.source.trim()) return false;
  if (typeof entry.checkedAt !== 'string' || !entry.checkedAt.trim()) return false;
  if (typeof entry.license_number !== 'string' || !entry.license_number.trim()) return false;
  if (typeof entry.state !== 'string' || !entry.state.trim()) return false;
  if (isLicenseExpired(entry.expires_at, now)) return false;
  return true;
}

export function badgeEligibleLicenses(
  licenseInfo: LicenseInfo | null | undefined,
  now: Date = new Date()
): LicenseEntry[] {
  return allLicenseEntries(licenseInfo).filter((entry) => isBadgeEligibleLicense(entry, now));
}

/**
 * One-license profiles already render the legacy verification badge.
 * Extra credential badges are only added once the licenses array has another entry,
 * so a single-license profile's markup stays the same.
 */
export function shouldRenderLicenseCredentialBadges(
  licenseInfo: LicenseInfo | null | undefined,
  now: Date = new Date()
): boolean {
  return allLicenseEntries(licenseInfo).length > 1 && badgeEligibleLicenses(licenseInfo, now).length > 0;
}

export function licenseClassLabel(entry: LicenseEntry): string {
  const type = (entry.type || '').trim();
  return type || 'not on file';
}

export function licenseExpirationLabel(expiresAt: string | null | undefined): string {
  if (expiresAt == null || !String(expiresAt).trim()) return 'none on file';
  const raw = String(expiresAt).trim();
  const day = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return raw;
}

export function licenseResidencyLabel(
  residency: LicenseEntry['residency'] | string | null | undefined
): 'non-resident' | 'resident' | null {
  const raw = String(residency || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (raw === 'non_resident' || raw === 'nonresident') return 'non-resident';
  if (raw === 'resident') return 'resident';
  return null;
}

export function licenseRecheckUrl(entry: LicenseEntry): string {
  const raw = (entry.verification_url || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const department = getLicenseDepartment(entry.state);
  return department?.lookupUrl ?? 'https://content.naic.org/consumer.htm';
}

export function licenseRecheckLabel(entry: LicenseEntry): string {
  const department = getLicenseDepartment(entry.state);
  const name = department?.department ?? 'the state regulator';
  return `Re-check with ${name}`;
}

function isInformationalLicense(value: unknown): value is InformationalLicense {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.state === 'string' &&
    Boolean(record.state.trim()) &&
    typeof record.license_number === 'string' &&
    Boolean(record.license_number.trim())
  );
}

/** Plain-text records. Never merged into licenses[] and never badged. */
export function informationalLicenseEntries(
  licenseInfo: LicenseInfo | null | undefined
): InformationalLicense[] {
  const raw = licenseInfo?.informational;
  if (!Array.isArray(raw)) return [];
  const out: InformationalLicense[] = [];
  for (const item of raw) {
    if (!isInformationalLicense(item)) continue;
    out.push({
      state: item.state.trim(),
      license_number: item.license_number.trim(),
      type: typeof item.type === 'string' ? item.type.trim() : undefined,
      issued_at: typeof item.issued_at === 'string' ? item.issued_at : item.issued_at ?? null,
      source: typeof item.source === 'string' ? item.source : undefined,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
    });
  }
  return out;
}

export function informationalLicenseSentence(entry: InformationalLicense): string {
  const state = entry.state.trim().toUpperCase();
  const detail = [entry.type?.trim(), entry.license_number.trim()].filter(Boolean).join(' ');
  return `Also on the ${state} record (informational, not badged): ${detail}`;
}

export const LEGACY_LICENSE_FIRST_ONLY_PATHS = [
  'lib/providers/map-db-provider.ts — license_number/state/source from licenses[0]',
  'lib/admin/provider-mapper.ts — dbProviderToForm uses licenses[0]',
  'actions/my-insurance.ts — checkedAt / states_licensed[0]',
  'scripts/dfs/audit-nonresident-fl.ts — license_number from licenses[0]',
  'scripts/tdi/audit-nonresident-tx.ts — license_number from licenses[0]',
] as const;
