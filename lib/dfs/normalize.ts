/**
 * Phase 4 — normalize Florida DFS bulk CSV rows into dfs_producers shape.
 * Column names vary slightly by file vintage — map flexibly.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  classifyLoas,
  parseLoaField,
  type LoaCapability,
} from '@/lib/dfs/loa';
import { matchLaunchCounty, normalizeCountyName } from '@/lib/dfs/launch-counties';

export type DfsEntityType = 'individual' | 'business';

export type NormalizedDfsProducer = {
  entityType: DfsEntityType;
  licenseNumber: string;
  npn: string | null;
  legalName: string;
  displayName: string;
  licenseStatus: string;
  linesOfAuthority: string[];
  capabilities: LoaCapability[];
  city: string | null;
  county: string | null;
  countyNormalized: string | null;
  state: string;
  zip: string | null;
  phone: string | null;
  email: string | null;
  residentFlag: boolean | null;
  identityKey: string;
  launchCountyId: string | null;
  skipReason?: string;
};

/** Strip Excel formula-style cells: ="12345" or =12345 */
function cleanCell(raw: string | undefined | null): string {
  if (raw == null) return '';
  let s = String(raw).trim();
  // strip surrounding quotes left by some parsers
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // Excel CSV export: ="value"
  const excel = s.match(/^=\s*"([^"]*)"\s*$/);
  if (excel) return excel[1].trim();
  const excel2 = s.match(/^=\s*(.+)\s*$/);
  if (excel2 && !s.includes(' ')) return excel2[1].replace(/^"|"$/g, '').trim();
  return s;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const direct = cleanCell(row[k]);
    if (direct) return direct;
    // case-insensitive exact header match
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found) {
      const v = cleanCell(row[found]);
      if (v) return v;
    }
  }
  return '';
}

function normalizePhone(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const d = digits.slice(-10);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function normalizeZip(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(/\d{5}/);
  return m ? m[0] : null;
}

function isActiveStatus(status: string): boolean {
  const s = status.toLowerCase().trim();
  if (!s) return true; // bulk “valid licenses” files are pre-filtered
  if (/inactive|expired|revoked|suspended|cancelled|canceled|lapsed|terminated/.test(s)) {
    return false;
  }
  // FL bulk uses "VALID"
  return /active|valid|current|licensed/.test(s) || s.length > 0;
}

/**
 * Normalize one CSV row. Returns skipReason when row cannot enter staging.
 */
export function normalizeDfsRow(
  row: Record<string, string>,
  entityType: DfsEntityType
): NormalizedDfsProducer {
  const licenseRaw = pick(row, [
    'License Number',
    'LicenseNumber',
    'License #',
    'LicenseNo',
    'License',
    'LICENSE_NUMBER',
  ]);
  // FL business licenses often look like E041603 — cleanLicenseNumber requires a digit (ok)
  const licenseNumber = cleanLicenseNumber(licenseRaw) ?? '';

  const legalName =
    pick(row, [
      'Full Name',
      'Business Name',
      'BusinessName',
      'DBA Name',
      'Legal Name',
      'Name',
      'Agency Name',
      'LICENSEE NAME',
      'Licensee Name',
    ]) ||
    [pick(row, ['First Name', 'FirstName']), pick(row, ['Last Name', 'LastName'])]
      .filter(Boolean)
      .join(' ')
      .trim();

  const displayName =
    pick(row, ['DBA Name', 'Doing Business As', 'Display Name', 'Full Name']) ||
    legalName;

  // FL bulk: "License TYCL Desc" is the human-readable line of authority
  const loaRaw = pick(row, [
    'License TYCL Desc',
    'License TYCL Description',
    'License Type',
    'License Types',
    'Line of Authority',
    'Lines of Authority',
    'LOA',
    'Authority',
    'Type',
  ]);
  const loaCode = pick(row, ['License TYCL', 'TYCL', 'License Type Code']);
  const linesOfAuthority = parseLoaField(loaRaw);
  if (loaCode && !linesOfAuthority.includes(loaCode)) {
    // keep human desc primary; code is secondary signal only if desc empty
  }
  if (linesOfAuthority.length === 0 && loaCode) {
    linesOfAuthority.push(loaCode);
  }
  // Some files use multi-column LOAs
  if (linesOfAuthority.length === 0) {
    for (const [k, v] of Object.entries(row)) {
      if (/license|authority|type|line|tycl/i.test(k) && cleanCell(v)) {
        linesOfAuthority.push(...parseLoaField(cleanCell(v)));
      }
    }
  }
  const uniqueLoas = Array.from(new Set(linesOfAuthority));
  const capabilities = classifyLoas(uniqueLoas);

  const county =
    pick(row, [
      'Business County',
      'County',
      'County Name',
      'COUNTY',
      'Mailing County',
    ]) || null;
  const city =
    pick(row, [
      'Business City',
      'City',
      'CITY',
      'Mailing City',
    ]) || null;
  const zip = normalizeZip(
    pick(row, [
      'Business Zip',
      'Zip',
      'ZIP',
      'Zip Code',
      'Postal Code',
      'ZipCode',
      'Mailing Zip',
    ])
  );
  const phone = normalizePhone(
    pick(row, [
      'Business Phone',
      'Phone',
      'Phone Number',
      'Telephone',
      'PHONE',
    ])
  );
  const email =
    pick(row, ['Email Address', 'Email', 'E-mail', 'Business Email']) || null;
  const npn = pick(row, [
    'NPN Number',
    'NPN',
    'National Producer Number',
    'Npn',
  ]) || null;
  const status =
    pick(row, ['License Status', 'Status', 'LicenseStatus']) || 'valid';
  const residentRaw = pick(row, [
    'Residency Type',
    'Resident',
    'Resident Flag',
    'FL Resident',
  ]);

  const countyNormalized = normalizeCountyName(county);
  const launch = matchLaunchCounty(county);

  if (!licenseNumber) {
    return {
      entityType,
      licenseNumber: '',
      npn: npn || null,
      legalName: legalName || 'Unknown',
      displayName: displayName || legalName || 'Unknown',
      licenseStatus: status,
      linesOfAuthority: uniqueLoas,
      capabilities,
      city,
      county,
      countyNormalized,
      state: 'FL',
      zip,
      phone,
      email: email || null,
      residentFlag: residentRaw ? /y|yes|true|1/i.test(residentRaw) : null,
      identityKey: `missing-license:${entityType}:${legalName}`,
      launchCountyId: launch?.id ?? null,
      skipReason: 'missing_recheckable_license_number',
    };
  }

  if (!legalName && !displayName) {
    return {
      entityType,
      licenseNumber,
      npn: npn || null,
      legalName: 'Unknown',
      displayName: 'Unknown',
      licenseStatus: status,
      linesOfAuthority: uniqueLoas,
      capabilities,
      city,
      county,
      countyNormalized,
      state: 'FL',
      zip,
      phone,
      email: email || null,
      residentFlag: null,
      identityKey: `fl:${entityType}:${licenseNumber}`,
      launchCountyId: launch?.id ?? null,
      skipReason: 'missing_name',
    };
  }

  if (!isActiveStatus(status)) {
    return {
      entityType,
      licenseNumber,
      npn: npn || null,
      legalName,
      displayName: displayName || legalName,
      licenseStatus: status,
      linesOfAuthority: uniqueLoas,
      capabilities,
      city,
      county,
      countyNormalized,
      state: 'FL',
      zip,
      phone,
      email: email || null,
      residentFlag: null,
      identityKey: `fl:${entityType}:${licenseNumber}`,
      launchCountyId: launch?.id ?? null,
      skipReason: 'inactive_status',
    };
  }

  return {
    entityType,
    licenseNumber,
    npn: npn || null,
    legalName,
    displayName: displayName || legalName,
    licenseStatus: status.toLowerCase() || 'valid',
    linesOfAuthority: uniqueLoas,
    capabilities,
    city,
    county,
    countyNormalized,
    state: 'FL',
    zip,
    phone,
    email: email || null,
    residentFlag: residentRaw ? /y|yes|true|1/i.test(residentRaw) : null,
    identityKey: `fl:${entityType}:${licenseNumber}`,
    launchCountyId: launch?.id ?? null,
  };
}

export function slugifyProducer(name: string, licenseNumber: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const lic = licenseNumber.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${base || 'fl-producer'}-${lic}`.slice(0, 90);
}
