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

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const direct = row[k];
    if (direct?.trim()) return direct.trim();
    // case-insensitive
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found]?.trim()) return row[found].trim();
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
  const s = status.toLowerCase();
  if (!s) return true; // bulk “valid licenses” files are pre-filtered
  if (/inactive|expired|revoked|suspended|cancelled|canceled|lapsed/.test(s)) return false;
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
  const licenseNumber = cleanLicenseNumber(licenseRaw) ?? '';

  const legalName =
    pick(row, [
      'Business Name',
      'BusinessName',
      'DBA Name',
      'Legal Name',
      'Name',
      'Agency Name',
      'LICENSEE NAME',
    ]) ||
    [pick(row, ['First Name', 'FirstName']), pick(row, ['Last Name', 'LastName'])]
      .filter(Boolean)
      .join(' ')
      .trim();

  const displayName =
    pick(row, ['DBA Name', 'Doing Business As', 'Display Name']) || legalName;

  const loaRaw = pick(row, [
    'License Type',
    'License Types',
    'Line of Authority',
    'Lines of Authority',
    'LOA',
    'Authority',
    'Type',
  ]);
  const linesOfAuthority = parseLoaField(loaRaw);
  // Some files use multi-column LOAs — gather any cell mentioning known keywords
  if (linesOfAuthority.length === 0) {
    for (const [k, v] of Object.entries(row)) {
      if (/license|authority|type|line/i.test(k) && v?.trim()) {
        linesOfAuthority.push(...parseLoaField(v));
      }
    }
  }
  const uniqueLoas = Array.from(new Set(linesOfAuthority));
  const capabilities = classifyLoas(uniqueLoas);

  const county = pick(row, ['County', 'County Name', 'COUNTY']) || null;
  const city = pick(row, ['City', 'CITY', 'Mailing City', 'Business City']) || null;
  const zip = normalizeZip(pick(row, ['Zip', 'ZIP', 'Zip Code', 'Postal Code', 'ZipCode']));
  const phone = normalizePhone(
    pick(row, ['Phone', 'Phone Number', 'Business Phone', 'Telephone', 'PHONE'])
  );
  const email = pick(row, ['Email', 'E-mail', 'Email Address']) || null;
  const npn = pick(row, ['NPN', 'National Producer Number', 'Npn']) || null;
  const status = pick(row, ['Status', 'License Status', 'LicenseStatus']) || 'valid';
  const residentRaw = pick(row, ['Resident', 'Resident Flag', 'FL Resident']);

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
