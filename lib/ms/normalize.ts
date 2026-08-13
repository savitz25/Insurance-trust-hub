/**
 * Phase 24 — normalize Mississippi MID Insurance Producer Entity rows.
 * Dedupe by AGENCYID / license number.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  inferMsCounty,
  matchMsLaunchMarket,
  type MsLaunchMarketId,
} from '@/lib/ms/launch-markets';
import {
  isExcludedClass,
  isMississippiFirm,
  isPromoteLicenseType,
} from '@/lib/ms/firm-heuristic';
import { classifyMsStrings } from '@/lib/ms/qualifications';
import type { LoaCapability } from '@/lib/dfs/loa';

export type MsRawRow = {
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
};

export type NormalizedMsProducer = {
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
  msAddress: boolean;
  launchMarketId: MsLaunchMarketId | null;
  promoteEligible: boolean;
  identityKey: string;
  sourceFile: string;
  skipReason?: string;
};

export function decodeMsHtmlName(raw: string): string {
  return (raw || '')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/(INSURANCE)(LLC|INC)\b/gi, '$1 $2')
    .replace(/(AGENCY)(LLC|INC)\b/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
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

export function normalizeMsZip(raw: string, hqState: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (hqState === 'MS' && digits.length >= 5) return digits.slice(0, 5);
  if (digits.length === 4) return `0${digits}`;
  if (digits.length >= 5) return digits.slice(0, 5);
  return null;
}

export function normalizeMsPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

function emptySkip(reason: string, licenseNumber = ''): NormalizedMsProducer {
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
    msAddress: false,
    launchMarketId: null,
    promoteEligible: false,
    identityKey: '',
    sourceFile: '',
    skipReason: reason,
  };
}

function normalizeState(raw: string): string {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'MISSISSIPPI' || s === 'MISS') return 'MS';
  return s.slice(0, 2);
}

export function cityDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function slugifyMsProducer(name: string, license: string): string {
  const base = (name || 'agency')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = (license || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${base}-${lic}`.slice(0, 80);
}

export function normalizeMsLicenseRow(row: MsRawRow): NormalizedMsProducer {
  const licenseNumber = cleanLicenseNumber(row.licenseNo) ?? '';
  if (!licenseNumber) return emptySkip('missing_license_number');
  const legalName = decodeMsHtmlName(row.name);
  if (!legalName) return emptySkip('missing_name', licenseNumber);

  const hqState = normalizeState(row.state);
  const zip = normalizeMsZip(row.zip, hqState);
  const city = cityDisplay(row.city);
  const countyRaw = (row.county || '').trim();
  const county =
    countyRaw && !/^united states$/i.test(countyRaw)
      ? countyRaw
      : inferMsCounty(row.city);
  const issueDate = parseDate(row.issueDate);
  const expirationDate = parseDate(row.expirationDate);
  let licenseStatus = (row.licenseStatus || 'active').trim().toLowerCase();
  if (isExpired(expirationDate)) licenseStatus = 'expired';

  const firm = isMississippiFirm({
    name: legalName,
    entityTypeRaw: row.licenseType,
  });
  const entityType: 'business' | 'individual' = firm ? 'business' : 'individual';
  const msAddress = hqState === 'MS';
  const market = matchMsLaunchMarket({ city: row.city, zip, hqState });
  const typeOk = isPromoteLicenseType(row.licenseType);
  const excluded = isExcludedClass(row.licenseType);
  const active = !/inactive|expired|revoked|suspended|lapsed|cancelled/i.test(licenseStatus);

  const promoteEligible =
    entityType === 'business' &&
    msAddress &&
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
    displayName: decodeMsHtmlName(row.dba) || legalName,
    licenseTypes: [row.licenseType].filter(Boolean),
    qualifications: [row.licenseType].filter(Boolean),
    capabilities: classifyMsStrings([row.licenseType, legalName]),
    licenseStatus: active ? 'active' : licenseStatus,
    issueDate,
    expirationDate,
    address: row.address1?.trim() || null,
    city: city || null,
    hqState,
    zip,
    county,
    phone: normalizeMsPhone(row.phone),
    msAddress,
    launchMarketId: market?.id ?? null,
    promoteEligible,
    identityKey: `ms:${licenseNumber}`,
    sourceFile: row.sourceFile,
    skipReason: firm ? undefined : 'not_firm',
  };
}

export function mergeMsProducers(rows: NormalizedMsProducer[]): NormalizedMsProducer | null {
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
