/**
 * Phase 9 — normalize New Jersey organization/agency license rows (flexible CSV headers).
 * One organization may appear as multiple qualification rows — merge by license number.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  matchNjLaunchRegion,
  normalizeCityName,
  normalizeCountyName,
  type NjLaunchRegionId,
} from '@/lib/nj/launch-regions';
import { classifyNjStrings } from '@/lib/nj/qualifications';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NormalizedNjProducer = {
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
  launchRegionId: NjLaunchRegionId | null;
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
    return `${mdy[3]}-${mdy[1]!.padStart(2, '0')}-${mdy[2]!.padStart(2, '0')}`;
  }
  return null;
}

function isExpired(expirationDate: string | null, now = new Date()): boolean {
  if (!expirationDate) return false;
  const d = new Date(expirationDate + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

/** Heuristic: skip obvious individual person rows if entity_type column present. */
function looksLikeIndividual(row: Record<string, string>): boolean {
  const et = pick(row, [
    'entity_type',
    'Entity Type',
    'EntityType',
    'Licensee Type',
    'licensee_type',
    'Business Type',
  ]).toLowerCase();
  if (!et) return false;
  if (/individual|person|producer\s*individual|agent\s*individual/.test(et)) {
    return true;
  }
  if (/organization|agency|business|firm|company|corp|llc/.test(et)) {
    return false;
  }
  return false;
}

export function normalizeNjAgencyRow(
  row: Record<string, string>
): NormalizedNjProducer {
  if (looksLikeIndividual(row)) {
    return emptySkip('not_business_entity');
  }

  const licenseRaw = pick(row, [
    'license_number',
    'License Number',
    'License number',
    'License #',
    'LicenseNo',
    'Reference Number',
    'reference_number',
    'License ID',
  ]);
  const licenseNumber =
    cleanLicenseNumber(licenseRaw) ?? licenseRaw.replace(/\s+/g, '');

  const legalName = pick(row, [
    'organization_name',
    'Organization Name',
    'Business Name',
    'business_name',
    'Agency Name',
    'agency_name',
    'Legal Name',
    'legal_name',
    'Name',
    'org_name',
    'Firm Name',
  ]);

  const orgType =
    pick(row, [
      'org_type',
      'Org Type',
      'Organization Type',
      'Business Type',
      'Entity Type',
    ]) || null;

  const licenseType = pick(row, [
    'license_type',
    'License Type',
    'License type',
    'Authority Type',
  ]);
  const qualification = pick(row, [
    'qualification',
    'Qualification',
    'Line of Authority',
    'Lines of Authority',
    'LOA',
    'Authority',
    'Qualifications',
  ]);
  const npn = pick(row, ['npn', 'NPN', 'National Producer Number']) || null;

  const cityRaw = pick(row, ['city', 'City', 'Business City', 'Mailing City']);
  const countyRaw = pick(row, ['county', 'County', 'Business County']);
  const state = (
    pick(row, ['state', 'State', 'Business State']) || 'NJ'
  )
    .toUpperCase()
    .slice(0, 2);
  const zip = normalizeZip(
    pick(row, ['zip', 'Zip', 'ZIP', 'Postal Code', 'postal_code', 'Zip Code'])
  );
  const issueDate = parseDate(
    pick(row, ['issue_date', 'Issue Date', 'License Issue Date', 'Effective Date'])
  );
  const expirationDate = parseDate(
    pick(row, [
      'expiration_date',
      'Expiration Date',
      'License Expiration',
      'Expiry Date',
    ])
  );
  const statusRaw = pick(row, [
    'license_status',
    'Status',
    'License Status',
    'Active Status',
  ]);

  if (!licenseNumber) return emptySkip('missing_license_number');
  if (!legalName) return emptySkip('missing_name', licenseNumber);

  const county = countyRaw || null;
  const countyNormalized = county ? normalizeCountyName(county) : null;
  const region = matchNjLaunchRegion({
    county,
    city: cityRaw,
    zip,
  });

  const licenseTypes = licenseType ? [licenseType] : [];
  const qualifications = qualification
    ? qualification.split(/[|;,/]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const capabilities = classifyNjStrings([...licenseTypes, ...qualifications]);

  let licenseStatus = statusRaw || 'active';
  if (isExpired(expirationDate)) licenseStatus = 'expired';
  if (/inactive|expired|revoked|suspended|cancelled|canceled|lapsed/i.test(licenseStatus)) {
    licenseStatus = licenseStatus.toLowerCase().includes('expir')
      ? 'expired'
      : 'inactive';
  } else if (!statusRaw) {
    licenseStatus = 'active';
  }

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
    launchRegionId: region?.id ?? null,
    identityKey: `nj:biz:${licenseNumber.toUpperCase()}`,
  };
}

function emptySkip(
  reason: string,
  licenseNumber = ''
): NormalizedNjProducer {
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
    state: 'NJ',
    zip: null,
    launchRegionId: null,
    identityKey: '',
    skipReason: reason,
  };
}

export function mergeNjProducers(
  rows: NormalizedNjProducer[]
): NormalizedNjProducer | null {
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
    if (/inactive|expired/i.test(r.licenseStatus)) {
      base.licenseStatus = r.licenseStatus;
    }
  }
  base.licenseTypes = [...licenseTypes];
  base.qualifications = [...qualifications];
  base.capabilities = classifyNjStrings([
    ...base.licenseTypes,
    ...base.qualifications,
  ]);
  const region = matchNjLaunchRegion({
    county: base.county,
    city: base.city,
    zip: base.zip,
  });
  base.launchRegionId = region?.id ?? null;
  base.identityKey = `nj:biz:${base.licenseNumber.toUpperCase()}`;
  return base;
}

export function slugifyNjProducer(name: string, licenseNumber: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}-${lic}`.slice(0, 80);
}
