/**
 * Phase 14 — normalize NV DOI firm rows from Firms-by-License-Type export.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  matchNvLaunchMarket,
  normalizeCityName,
  type NvLaunchMarketId,
} from '@/lib/nv/launch-markets';
import {
  isPromoteEligibleFirmType,
  normalizeFirmLicenseType,
} from '@/lib/nv/firm-types';
import { classifyNvStrings } from '@/lib/nv/qualifications';
import type { NvFirmRawRow } from '@/lib/nv/parse-workbook';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NormalizedNvProducer = {
  entityType: 'business';
  licenseNumber: string;
  legalName: string;
  displayName: string;
  firmLicenseType: string;
  licenseTypes: string[];
  qualifications: string[];
  capabilities: LoaCapability[];
  licenseStatus: string;
  issueDate: string | null;
  expirationDate: string | null;
  address: string | null;
  city: string | null;
  hqState: string;
  zip: string | null;
  phone: string | null;
  email: string | null;
  nvAddress: boolean;
  launchMarketId: NvLaunchMarketId | null;
  promoteEligible: boolean;
  identityKey: string;
  skipReason?: string;
};

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

function cleanPhone(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim();
  return s || null;
}

function cleanEmail(raw: string): string | null {
  const s = raw.trim();
  if (!s || !s.includes('@')) return null;
  return s;
}

function emptySkip(reason: string, licenseNumber = ''): NormalizedNvProducer {
  return {
    entityType: 'business',
    licenseNumber,
    legalName: '',
    displayName: '',
    firmLicenseType: '',
    licenseTypes: [],
    qualifications: [],
    capabilities: [],
    licenseStatus: 'unknown',
    issueDate: null,
    expirationDate: null,
    address: null,
    city: null,
    hqState: '',
    zip: null,
    phone: null,
    email: null,
    nvAddress: false,
    launchMarketId: null,
    promoteEligible: false,
    identityKey: '',
    skipReason: reason,
  };
}

export function normalizeNvFirmRow(row: NvFirmRawRow): NormalizedNvProducer {
  const firmType = normalizeFirmLicenseType(row.firmLicenseType);
  const licenseNumber =
    cleanLicenseNumber(row.license) ?? row.license.replace(/\s+/g, '');
  const legalName = (row.name || '').trim();
  if (!licenseNumber) return emptySkip('missing_license_number');
  if (!legalName) return emptySkip('missing_name', licenseNumber);
  if (!firmType) return emptySkip('missing_firm_type', licenseNumber);

  const hqState = (row.state || '').toUpperCase().slice(0, 2);
  const zipDigits = (row.zip || '').replace(/\D/g, '');
  const zip = zipDigits.length >= 5 ? zipDigits.slice(0, 5) : null;
  const cityRaw = (row.city || '').trim();
  const nvAddress = hqState === 'NV';
  const issueDate = parseDate(row.originalIssueDate);
  const expirationDate = parseDate(row.expirationDate);
  let licenseStatus = 'active';
  if (isExpired(expirationDate)) licenseStatus = 'expired';

  const market = matchNvLaunchMarket({
    city: cityRaw,
    zip,
    hqState,
  });
  const capabilities = classifyNvStrings([firmType]);
  const promoteEligible =
    isPromoteEligibleFirmType(firmType) &&
    nvAddress &&
    licenseStatus !== 'expired';

  return {
    entityType: 'business',
    licenseNumber,
    legalName,
    displayName: legalName,
    firmLicenseType: firmType,
    licenseTypes: [firmType],
    qualifications: [firmType],
    capabilities,
    licenseStatus,
    issueDate,
    expirationDate,
    address: row.address?.trim() || null,
    city: cityRaw || null,
    hqState,
    zip,
    phone: cleanPhone(row.phone),
    email: cleanEmail(row.email),
    nvAddress,
    launchMarketId: market?.id ?? null,
    promoteEligible,
    identityKey: `nvdoi:firm:${licenseNumber.toUpperCase()}`,
  };
}

export function mergeNvProducers(rows: NormalizedNvProducer[]): NormalizedNvProducer | null {
  const good = rows.filter((r) => !r.skipReason && r.licenseNumber);
  if (!good.length) return null;
  const base = { ...good[0]! };
  const types = new Set<string>();
  for (const r of good) {
    r.licenseTypes.forEach((t) => types.add(t));
    if (!base.phone && r.phone) base.phone = r.phone;
    if (!base.email && r.email) base.email = r.email;
    if (!base.address && r.address) base.address = r.address;
    if (!base.city && r.city) base.city = r.city;
    if (!base.zip && r.zip) base.zip = r.zip;
    if (r.nvAddress) base.nvAddress = true;
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
  if (types.size > 1) {
    base.firmLicenseType = [...types].join('; ');
  }
  base.licenseTypes = [...types];
  base.qualifications = [...types];
  base.capabilities = classifyNvStrings(base.licenseTypes);
  const market = matchNvLaunchMarket({
    city: base.city,
    zip: base.zip,
    hqState: base.hqState,
  });
  base.launchMarketId = market?.id ?? null;
  base.promoteEligible =
    base.licenseTypes.some((t) => isPromoteEligibleFirmType(t)) &&
    base.nvAddress &&
    base.licenseStatus !== 'expired';
  base.identityKey = `nvdoi:firm:${base.licenseNumber.toUpperCase()}`;
  return base;
}

export function slugifyNvProducer(name: string, licenseNumber: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}-${lic}`.slice(0, 80);
}

export function cityDisplay(raw: string | null): string {
  if (!raw) return '';
  return normalizeCityName(raw)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
