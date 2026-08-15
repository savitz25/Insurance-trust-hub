/**
 * Phase 8 — normalize Texas TDI agency open-data rows (Socrata / CSV).
 * One license may appear as multiple rows (one per qualification) — merge by license number.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  matchTxLaunchMarket,
  normalizeCityName,
  normalizeCountyName,
  type TxLaunchMarketId,
} from '@/lib/tdi/launch-markets';
import { classifyTdiStrings } from '@/lib/tdi/qualifications';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NormalizedTdiProducer = {
  entityType: 'business';
  licenseNumber: string;
  npn: string | null;
  legalName: string;
  displayName: string;
  orgType: string | null;
  licenseTypes: string[];
  qualifications: string[];
  capabilities: LoaCapability[];
  licenseStatus: string;
  issueDate: string | null;
  expirationDate: string | null;
  city: string | null;
  county: string | null;
  countyNormalized: string | null;
  state: string;
  zip: string | null;
  /** Inferred from HQ State only. Blank HQ → null (not non-resident proof). */
  residency: 'resident' | 'non_resident' | null;
  homeAddressState: string | null;
  launchMarketId: TxLaunchMarketId | null;
  identityKey: string;
  skipReason?: string;
};

/**
 * HQ State → residency metadata. Blank / invalid is unknown, not non-resident.
 * Never infers a home-state license.
 */
export function inferTxResidency(
  hqState: string | null | undefined
): 'resident' | 'non_resident' | null {
  const s = (hqState || '').toUpperCase().trim().slice(0, 2);
  if (s === 'TX') return 'resident';
  if (/^[A-Z]{2}$/.test(s)) return 'non_resident';
  return null;
}

function cleanCell(raw: string | undefined | null): string {
  if (raw == null) return '';
  let s = String(raw).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const direct = cleanCell(row[k]);
    if (direct) return direct;
    const found = Object.keys(row).find(
      (rk) => rk.toLowerCase() === k.toLowerCase()
    );
    if (found) {
      const v = cleanCell(row[found]);
      if (v) return v;
    }
  }
  return '';
}

function normalizeZip(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 5) return digits.slice(0, 5);
  return null;
}

function parseDate(raw: string): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  // ISO-ish
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    const mm = mdy[1]!.padStart(2, '0');
    const dd = mdy[2]!.padStart(2, '0');
    return `${mdy[3]}-${mm}-${dd}`;
  }
  return null;
}

function isExpired(expirationDate: string | null, now = new Date()): boolean {
  if (!expirationDate) return false;
  const d = new Date(expirationDate + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

/**
 * Normalize a single raw TDI row (one qualification). Prefer mergeTdiRows for staging.
 */
export function normalizeTdiAgencyRow(
  row: Record<string, string>
): NormalizedTdiProducer {
  const licenseRaw = pick(row, [
    'agency_license_number',
    'License number',
    'License Number',
    'license_number',
    'License #',
  ]);
  const licenseNumber = cleanLicenseNumber(licenseRaw) ?? licenseRaw.replace(/\s+/g, '');

  const legalName = pick(row, [
    'org_name',
    'Name',
    'Organization Name',
    'Org Name',
    'Business Name',
    'Agency Name',
  ]);

  const orgType = pick(row, ['agency_type', 'Org type', 'Org Type', 'Organization Type']) || null;
  const licenseType = pick(row, ['license_type', 'License type', 'License Type']);
  const qualification = pick(row, ['qualification', 'Qualification']);
  const npn = pick(row, ['npn', 'NPN']) || null;

  const cityRaw = pick(row, ['city', 'City']);
  const countyRaw = pick(row, [
    'county',
    'County (if title agency)',
    'County',
  ]);
  const stateRaw = pick(row, ['state', 'State']).toUpperCase().trim();
  /** Blank HQ is unknown, not proof of non-residency. Do not default to TX. */
  const state = stateRaw.slice(0, 2);
  const txAddress = state === 'TX';
  const zip = normalizeZip(pick(row, ['pstl_cd', 'Postal code', 'Postal Code', 'Zip', 'ZIP']));
  const issueDate = parseDate(
    pick(row, ['license_issue_date', 'Issue date', 'Issue Date'])
  );
  const expirationDate = parseDate(
    pick(row, ['expiration_date', 'Expiration date', 'Expiration Date'])
  );

  if (!licenseNumber) {
    return emptySkip('missing_license_number');
  }
  if (!legalName) {
    return emptySkip('missing_name', licenseNumber);
  }

  const city = cityRaw ? normalizeCityName(cityRaw) : null;
  const county = countyRaw || null;
  const countyNormalized = county ? normalizeCountyName(county) : null;
  const residency = inferTxResidency(state);
  const homeAddressState = residency === 'non_resident' ? state : null;
  const market = txAddress
    ? matchTxLaunchMarket({
        county,
        city: cityRaw,
        zip,
        hqState: state,
      })
    : null;

  const licenseTypes = licenseType ? [licenseType] : [];
  const qualifications = qualification ? [qualification] : [];
  const capabilities = classifyTdiStrings([...licenseTypes, ...qualifications]);

  let licenseStatus = 'active';
  if (isExpired(expirationDate)) licenseStatus = 'expired';

  return {
    entityType: 'business',
    licenseNumber,
    npn,
    legalName,
    displayName: legalName,
    orgType,
    licenseTypes,
    qualifications,
    capabilities,
    licenseStatus,
    issueDate,
    expirationDate,
    city: cityRaw || null,
    county,
    countyNormalized,
    state,
    zip,
    residency,
    homeAddressState,
    launchMarketId: market?.id ?? null,
    identityKey: `tdi:biz:${licenseNumber.toUpperCase()}`,
  };
}

function emptySkip(
  reason: string,
  licenseNumber = ''
): NormalizedTdiProducer {
  return {
    entityType: 'business',
    licenseNumber,
    npn: null,
    legalName: '',
    displayName: '',
    orgType: null,
    licenseTypes: [],
    qualifications: [],
    capabilities: [],
    licenseStatus: 'unknown',
    issueDate: null,
    expirationDate: null,
    city: null,
    county: null,
    countyNormalized: null,
    state: '',
    zip: null,
    residency: null,
    homeAddressState: null,
    launchMarketId: null,
    identityKey: '',
    skipReason: reason,
  };
}

/** Merge multiple qualification rows for the same license number. */
export function mergeTdiProducers(
  rows: NormalizedTdiProducer[]
): NormalizedTdiProducer | null {
  const good = rows.filter((r) => !r.skipReason && r.licenseNumber);
  if (!good.length) return null;
  const base = { ...good[0]! };
  const licenseTypes = new Set<string>();
  const qualifications = new Set<string>();
  for (const r of good) {
    r.licenseTypes.forEach((t) => licenseTypes.add(t));
    r.qualifications.forEach((q) => qualifications.add(q));
    if (!base.npn && r.npn) base.npn = r.npn;
    if (!base.county && r.county) {
      base.county = r.county;
      base.countyNormalized = r.countyNormalized;
    }
    if (!base.city && r.city) base.city = r.city;
    if (!base.zip && r.zip) base.zip = r.zip;
    if (!base.state && r.state) base.state = r.state;
    if (!base.orgType && r.orgType) base.orgType = r.orgType;
    if (r.expirationDate) {
      if (
        !base.expirationDate ||
        r.expirationDate > base.expirationDate
      ) {
        base.expirationDate = r.expirationDate;
      }
    }
    if (r.issueDate) {
      if (!base.issueDate || r.issueDate < base.issueDate) {
        base.issueDate = r.issueDate;
      }
    }
    if (r.licenseStatus === 'expired') base.licenseStatus = 'expired';
  }
  base.licenseTypes = [...licenseTypes];
  base.qualifications = [...qualifications];
  base.capabilities = classifyTdiStrings([
    ...base.licenseTypes,
    ...base.qualifications,
  ]);
  // Re-resolve market after merge (county may appear on title row only)
  const market =
    base.state === 'TX'
      ? matchTxLaunchMarket({
          county: base.county,
          city: base.city,
          zip: base.zip,
          hqState: base.state,
        })
      : null;
  base.launchMarketId = market?.id ?? null;
  base.residency = inferTxResidency(base.state);
  base.homeAddressState = base.residency === 'non_resident' ? base.state : null;
  base.identityKey = `tdi:biz:${base.licenseNumber.toUpperCase()}`;
  return base;
}

export function slugifyTdiProducer(name: string, licenseNumber: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}-${lic}`.slice(0, 80);
}
