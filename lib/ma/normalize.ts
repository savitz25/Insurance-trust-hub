/**
 * Phase 23 — normalize Massachusetts DOI agency-list rows.
 * Multiple line files may list the same license — merge by license number.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  inferMaCounty,
  matchMaLaunchMarket,
  type MaLaunchMarketId,
} from '@/lib/ma/launch-markets';
import {
  isExcludedClass,
  isLicensedCompanyRecord,
  isMassachusettsFirm,
  isPromoteLicenseType,
} from '@/lib/ma/firm-heuristic';
import { classifyMaStrings } from '@/lib/ma/qualifications';
import type { LoaCapability } from '@/lib/dfs/loa';

export type MaRecordKind = 'agency' | 'licensed_company';

export type MaRawRow = {
  name: string;
  dba: string;
  licenseNo: string;
  licenseType: string;
  licenseStatus: string;
  npn: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  issueDate: string;
  expirationDate: string;
  sourceFile: string;
  recordKind: MaRecordKind;
};

export type NormalizedMaProducer = {
  entityType: 'business' | 'individual';
  licenseNumber: string;
  npn: string | null;
  legalName: string;
  displayName: string;
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
  county: string | null;
  phone: string | null;
  maAddress: boolean;
  launchMarketId: MaLaunchMarketId | null;
  promoteEligible: boolean;
  identityKey: string;
  sourceFile: string;
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
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime()) && dt.getFullYear() > 1900) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function isExpired(expirationDate: string | null, now = new Date()): boolean {
  if (!expirationDate) return false;
  const d = new Date(expirationDate + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

/** MA zips are 0xxxx; Excel often drops the leading zero. */
export function normalizeMaZip(raw: string, hqState: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const ma = hqState === 'MA';
  if (ma && digits.length === 4) return `0${digits}`;
  if (ma && digits.length === 8) return `0${digits.slice(0, 4)}`;
  if (ma && digits.length === 9 && !digits.startsWith('0')) return `0${digits.slice(0, 4)}`;
  if (digits.length >= 5) return digits.slice(0, 5);
  return null;
}

export function normalizeMaPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

function emptySkip(reason: string, licenseNumber = ''): NormalizedMaProducer {
  return {
    entityType: 'individual',
    licenseNumber,
    npn: null,
    legalName: '',
    displayName: '',
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
    county: null,
    phone: null,
    maAddress: false,
    launchMarketId: null,
    promoteEligible: false,
    identityKey: '',
    sourceFile: '',
    skipReason: reason,
  };
}

function normalizeState(raw: string): string {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'MASSACHUSETTS' || s === 'MASS') return 'MA';
  return s.slice(0, 2);
}

export function cityDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function slugifyMaProducer(name: string, license: string): string {
  const base = (name || 'agency')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = (license || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${base}-${lic}`.slice(0, 80);
}

export function normalizeMaLicenseRow(row: MaRawRow): NormalizedMaProducer {
  const licenseNumber = cleanLicenseNumber(row.licenseNo) ?? '';
  const legalName = (row.name || '').trim();
  if (isLicensedCompanyRecord(row)) {
    return emptySkip('carrier_company_not_agency', licenseNumber);
  }
  if (!licenseNumber) return emptySkip('missing_license_number');
  if (!legalName) return emptySkip('missing_name', licenseNumber);

  const hqState = normalizeState(row.state);
  const zip = normalizeMaZip(row.zip, hqState);
  const city = cityDisplay(row.city);
  const countyRaw = (row.county || '').trim();
  const county =
    countyRaw && !/^united states$/i.test(countyRaw)
      ? countyRaw
      : inferMaCounty(row.city);
  const issueDate = parseDate(row.issueDate);
  let expirationDate = parseDate(row.expirationDate);
  let licenseStatus = (row.licenseStatus || 'active').trim().toLowerCase();
  if (isExpired(expirationDate)) licenseStatus = 'expired';

  const firm = isMassachusettsFirm({ name: legalName });
  const entityType: 'business' | 'individual' = firm ? 'business' : 'individual';
  const maAddress = hqState === 'MA';
  const market = matchMaLaunchMarket({ city: row.city, zip, hqState });
  const typeOk = isPromoteLicenseType(row.licenseType) || isPromoteLicenseType(row.sourceFile);
  const excluded = isExcludedClass(row.licenseType) || isExcludedClass(row.sourceFile);
  const active = !/inactive|expired|revoked|suspended|lapsed|cancelled/i.test(licenseStatus);

  const promoteEligible =
    entityType === 'business' &&
    maAddress &&
    Boolean(market) &&
    typeOk &&
    !excluded &&
    active &&
    Boolean(licenseNumber);

  return {
    entityType,
    licenseNumber,
    npn: row.npn?.trim() || null,
    legalName,
    displayName: (row.dba || '').trim() || legalName,
    licenseTypes: [row.licenseType || row.sourceFile].filter(Boolean),
    qualifications: [row.licenseType || row.sourceFile].filter(Boolean),
    capabilities: classifyMaStrings([row.licenseType, row.sourceFile, legalName]),
    licenseStatus: active ? 'active' : licenseStatus,
    issueDate,
    expirationDate,
    address: row.address1?.trim() || null,
    city: city || null,
    hqState,
    zip,
    county,
    phone: normalizeMaPhone(row.phone),
    maAddress,
    launchMarketId: market?.id ?? null,
    promoteEligible,
    identityKey: `ma:${licenseNumber}`,
    sourceFile: row.sourceFile,
    skipReason: firm ? undefined : 'not_firm',
  };
}

export function mergeMaProducers(rows: NormalizedMaProducer[]): NormalizedMaProducer | null {
  const usable = rows.filter((r) => !r.skipReason && r.licenseNumber);
  if (!usable.length) return null;
  const base = { ...usable[0]! };
  const types = new Set(base.licenseTypes);
  const quals = new Set(base.qualifications);
  const caps = new Set(base.capabilities);
  for (const r of usable.slice(1)) {
    r.licenseTypes.forEach((t) => types.add(t));
    r.qualifications.forEach((q) => quals.add(q));
    r.capabilities.forEach((c) => caps.add(c));
    if (r.phone && !base.phone) base.phone = r.phone;
    if (r.npn && !base.npn) base.npn = r.npn;
    if (r.promoteEligible) base.promoteEligible = true;
    if (r.launchMarketId && !base.launchMarketId) base.launchMarketId = r.launchMarketId;
  }
  base.licenseTypes = Array.from(types);
  base.qualifications = Array.from(quals);
  base.capabilities = Array.from(caps);
  return base;
}
