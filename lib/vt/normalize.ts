/**
 * Phase 15 — normalize Vermont DFR quarterly licensee rows.
 * One license often appears once per LOA — merge by license number.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  matchVtLaunchMarket,
  type VtLaunchMarketId,
} from '@/lib/vt/launch-markets';
import {
  isAdjusterClass,
  isPromoteLicenseClass,
  isVermontFirm,
} from '@/lib/vt/firm-heuristic';
import { classifyVtStrings } from '@/lib/vt/qualifications';
import type { LoaCapability } from '@/lib/dfs/loa';

export type VtRawRow = {
  firstName: string;
  lastOrBusinessName: string;
  npn: string;
  resState: string;
  licenseNo: string;
  licenseStatus: string;
  licenseClass: string;
  licenseEffectiveDate: string;
  licenseExpirationDate: string;
  loaName: string;
  loaStatus: string;
  address1: string;
  address2: string;
  city: string;
  businessStateAbbr: string;
  zip: string;
  county: string;
};

export type NormalizedVtProducer = {
  entityType: 'business' | 'individual';
  licenseNumber: string;
  npn: string | null;
  legalName: string;
  displayName: string;
  firstName: string | null;
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
  vtAddress: boolean;
  launchMarketId: VtLaunchMarketId | null;
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

/** Vermont zips are 05xxx; Excel often drops the leading zero. */
export function normalizeVtZip(raw: string, hqState: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const vt = hqState === 'VT';
  if (vt && digits.length === 4) return `0${digits}`;
  if (vt && digits.length === 8) return `0${digits.slice(0, 4)}`;
  if (vt && digits.length === 9 && !digits.startsWith('0')) return `0${digits.slice(0, 4)}`;
  if (digits.length >= 5) return digits.slice(0, 5);
  return null;
}

function emptySkip(reason: string, licenseNumber = ''): NormalizedVtProducer {
  return {
    entityType: 'individual',
    licenseNumber,
    npn: null,
    legalName: '',
    displayName: '',
    firstName: null,
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
    vtAddress: false,
    launchMarketId: null,
    promoteEligible: false,
    identityKey: '',
    skipReason: reason,
  };
}

export function normalizeVtLicenseRow(row: VtRawRow): NormalizedVtProducer {
  const licenseNumber =
    cleanLicenseNumber(row.licenseNo) ?? row.licenseNo.replace(/\s+/g, '');
  const last = (row.lastOrBusinessName || '').trim();
  const first = (row.firstName || '').trim();
  if (!licenseNumber) return emptySkip('missing_license_number');
  if (!last) return emptySkip('missing_name', licenseNumber);

  const firm = isVermontFirm({ firstName: first, lastOrBusinessName: last });
  const displayName = firm ? last : [first, last].filter(Boolean).join(' ');
  const hqState = (row.businessStateAbbr || '').toUpperCase().slice(0, 2);
  const zip = normalizeVtZip(row.zip, hqState);
  const city = (row.city || '').trim();
  const vtAddress = hqState === 'VT';
  const issueDate = parseDate(row.licenseEffectiveDate);
  const expirationDate = parseDate(row.licenseExpirationDate);
  let licenseStatus = (row.licenseStatus || 'active').toLowerCase();
  if (!row.licenseStatus) licenseStatus = 'active';
  if (isExpired(expirationDate)) licenseStatus = 'expired';

  const licenseClass = (row.licenseClass || '').trim();
  const loa = (row.loaName || '').trim();
  const market = matchVtLaunchMarket({ city, zip, hqState });
  const promoteEligible =
    firm &&
    vtAddress &&
    isPromoteLicenseClass(licenseClass) &&
    !isAdjusterClass(licenseClass) &&
    licenseStatus !== 'expired';

  return {
    entityType: firm ? 'business' : 'individual',
    licenseNumber,
    npn: (row.npn || '').trim() || null,
    legalName: last,
    displayName,
    firstName: first || null,
    licenseTypes: licenseClass ? [licenseClass] : [],
    qualifications: loa ? [loa] : [],
    capabilities: classifyVtStrings([licenseClass, loa].filter(Boolean)),
    licenseStatus,
    issueDate,
    expirationDate,
    address: [row.address1, row.address2].filter(Boolean).join(', ') || null,
    city: city || null,
    hqState,
    zip,
    county: (row.county || '').trim() || null,
    vtAddress,
    launchMarketId: market?.id ?? null,
    promoteEligible,
    identityKey: `vtdfr:${firm ? 'firm' : 'ind'}:${licenseNumber.toUpperCase()}`,
  };
}

export function mergeVtProducers(rows: NormalizedVtProducer[]): NormalizedVtProducer | null {
  const good = rows.filter((r) => !r.skipReason && r.licenseNumber);
  if (!good.length) return null;
  const base = { ...good[0]! };
  const types = new Set<string>();
  const quals = new Set<string>();
  for (const r of good) {
    r.licenseTypes.forEach((t) => types.add(t));
    r.qualifications.forEach((q) => quals.add(q));
    if (!base.npn && r.npn) base.npn = r.npn;
    if (!base.city && r.city) base.city = r.city;
    if (!base.zip && r.zip) base.zip = r.zip;
    if (!base.address && r.address) base.address = r.address;
    if (r.vtAddress) base.vtAddress = true;
    if (r.entityType === 'business') base.entityType = 'business';
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
  base.licenseTypes = [...types];
  base.qualifications = [...quals];
  base.capabilities = classifyVtStrings([...base.licenseTypes, ...base.qualifications]);
  const market = matchVtLaunchMarket({
    city: base.city,
    zip: base.zip,
    hqState: base.hqState,
  });
  base.launchMarketId = market?.id ?? null;
  base.promoteEligible =
    base.entityType === 'business' &&
    base.vtAddress &&
    base.licenseTypes.some((t) => isPromoteLicenseClass(t)) &&
    !base.licenseTypes.some((t) => isAdjusterClass(t)) &&
    base.licenseStatus !== 'expired';
  base.identityKey = `vtdfr:${base.entityType === 'business' ? 'firm' : 'ind'}:${base.licenseNumber.toUpperCase()}`;
  return base;
}

export function slugifyVtProducer(name: string, licenseNumber: string): string {
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
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
