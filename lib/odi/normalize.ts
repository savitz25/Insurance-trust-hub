/**
 * Phase 10 — normalize Ohio ODI agency / business-entity rows (CSV / mailing-list export).
 * One license may appear as multiple LOA rows — merge by license number.
 * Individuals are skipped.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  matchOhLaunchMarket,
  normalizeCityName,
  normalizeCountyName,
  type OhLaunchMarketId,
} from '@/lib/odi/launch-markets';
import {
  classifyOdiStrings,
  looksLikeIndividualEntity,
} from '@/lib/odi/qualifications';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NormalizedOdiProducer = {
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
  launchMarketId: OhLaunchMarketId | null;
  identityKey: string;
  skipReason?: string;
};

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

function emptySkip(
  reason: string,
  licenseNumber = ''
): NormalizedOdiProducer {
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
    state: 'OH',
    zip: null,
    launchMarketId: null,
    identityKey: '',
    skipReason: reason,
  };
}

export function normalizeOdiAgencyRow(
  row: Record<string, string>
): NormalizedOdiProducer {
  const entityHint = pick(row, [
    'Entity Type',
    'entity_type',
    'EntityType',
    'Licensee Type',
    'Type',
    'Record Type',
  ]);
  if (looksLikeIndividualEntity(entityHint)) {
    return emptySkip('individual_excluded');
  }

  const licenseRaw = pick(row, [
    'License Number',
    'License number',
    'license_number',
    'License #',
    'Ohio License Number',
    'Reference Number',
  ]);
  const licenseNumber = cleanLicenseNumber(licenseRaw) ?? licenseRaw.replace(/\s+/g, '');

  const legalName = pick(row, [
    'Business Name',
    'Organization Name',
    'Agency Name',
    'Legal Name',
    'Name',
    'org_name',
    'Entity Name',
  ]);

  const orgType =
    pick(row, ['Org Type', 'Organization Type', 'Business Type', 'agency_type']) ||
    null;
  const licenseType = pick(row, [
    'License Type',
    'license_type',
    'License Class',
  ]);
  const qualification = pick(row, [
    'Line of Authority',
    'Lines of Authority',
    'Qualification',
    'Qualifications',
    'LOA',
  ]);
  const npn =
    pick(row, [
      'NPN',
      'npn',
      'National Producer Number',
      'NATIONALPROVIDERNUMBER',
      'NationalProviderNumber',
    ]) || null;

  const cityRaw = pick(row, ['City', 'city', 'Business City']);
  const countyRaw = pick(row, ['County', 'county', 'Business County']);
  const state = (pick(row, ['State', 'state', 'Business State']) || 'OH')
    .toUpperCase()
    .slice(0, 2);
  const zip = normalizeZip(
    pick(row, ['Zip', 'ZIP', 'Postal Code', 'Postal code', 'Zip Code'])
  );
  const issueDate = parseDate(
    pick(row, ['Issue Date', 'Effective Date', 'license_issue_date', 'Issued'])
  );
  const expirationDate = parseDate(
    pick(row, ['Expiration Date', 'Expires', 'expiration_date', 'Expiry'])
  );
  const statusRaw = pick(row, ['Status', 'License Status', 'license_status']);

  if (!licenseNumber) {
    return emptySkip('missing_license_number');
  }
  if (!legalName) {
    return emptySkip('missing_name', licenseNumber);
  }

  const city = cityRaw ? normalizeCityName(cityRaw) : null;
  const county = countyRaw || null;
  const countyNormalized = county ? normalizeCountyName(county) : null;
  const market = matchOhLaunchMarket({
    county,
    city: cityRaw,
    zip,
  });

  const licenseTypes = licenseType ? [licenseType] : [];
  const qualifications = qualification ? [qualification] : [];
  const capabilities = classifyOdiStrings([...licenseTypes, ...qualifications]);

  let licenseStatus = (statusRaw || 'active').toLowerCase();
  if (!statusRaw) licenseStatus = 'active';
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
    launchMarketId: market?.id ?? null,
    identityKey: `odi:biz:${licenseNumber.toUpperCase()}`,
  };
}

export function mergeOdiProducers(
  rows: NormalizedOdiProducer[]
): NormalizedOdiProducer | null {
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
    if (!base.orgType && r.orgType) base.orgType = r.orgType;
    if (r.expirationDate) {
      if (!base.expirationDate || r.expirationDate > base.expirationDate) {
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
  base.capabilities = classifyOdiStrings([
    ...base.licenseTypes,
    ...base.qualifications,
  ]);
  const market = matchOhLaunchMarket({
    county: base.county,
    city: base.city,
    zip: base.zip,
  });
  base.launchMarketId = market?.id ?? null;
  base.identityKey = `odi:biz:${base.licenseNumber.toUpperCase()}`;
  return base;
}

export function slugifyOdiProducer(name: string, licenseNumber: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}-${lic}`.slice(0, 80);
}
