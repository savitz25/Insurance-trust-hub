/**
 * Phase 6A — Florida DFS appointment normalization + public snapshot shape.
 * Regulatory enrichment only — never endorsement, ranking, or Medicare inference.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  FL_DFS_LOOKUP_URL,
  FL_DFS_REGULATOR,
  FL_DFS_SOURCE_URL,
  matchLaunchCounty,
  normalizeCountyName,
} from '@/lib/dfs/launch-counties';

export type AppointmentEntityType = 'business' | 'individual';

export type NormalizedAppointment = {
  licenseNumber: string;
  fullName: string | null;
  npn: string | null;
  appointingEntityNumber: string | null;
  appointingEntityName: string;
  appointmentType: string | null;
  appointmentTypeDesc: string | null;
  appointmentStatus: string | null;
  effectiveDate: string | null; // ISO date
  expirationDate: string | null;
  county: string | null;
  countyNormalized: string | null;
  entityType: AppointmentEntityType;
  launchCountyId: string | null;
  skipReason?: string;
};

/** Public denormalized snapshot stored on providers.contact.appointment_snapshot */
export type ProviderAppointmentCarrier = {
  name: string;
  type?: string | null;
  status?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
};

export type ProviderAppointmentSnapshot = {
  source: string;
  sourceUrl: string;
  lookupUrl: string;
  asOf: string;
  totalCount: number;
  /** Neutral list for display — not a quality ranking */
  carriers: ProviderAppointmentCarrier[];
  honesty: string[];
};

export const APPOINTMENT_HONESTY = [
  'Regulatory snapshot from Florida DFS',
  'Not an endorsement of this agency or any carrier',
  'Appointment status can change; re-check on official DFS tools',
] as const;

function cleanCell(raw: string | undefined | null): string {
  if (raw == null) return '';
  let s = String(raw).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
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
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found) {
      const v = cleanCell(row[found]);
      if (v) return v;
    }
  }
  return '';
}

function parseDate(raw: string): string | null {
  if (!raw?.trim()) return null;
  // 6/19/2026 12:00:00 AM
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Normalize one Active Appointments Business CSV row.
 */
export function normalizeAppointmentRow(
  row: Record<string, string>,
  entityType: AppointmentEntityType = 'business'
): NormalizedAppointment {
  const licenseRaw = pick(row, [
    'License Number',
    'LicenseNumber',
    'License #',
    'Agency License Number',
  ]);
  const licenseNumber = cleanLicenseNumber(licenseRaw) || licenseRaw.replace(/\s+/g, '').toUpperCase();

  const appointingEntityName = pick(row, [
    'Appointing Entity Name',
    'AppointingEntityName',
    'Carrier Name',
    'Company Name',
  ]);

  if (!licenseNumber || licenseNumber.length < 3) {
    return {
      licenseNumber: '',
      fullName: null,
      npn: null,
      appointingEntityNumber: null,
      appointingEntityName: '',
      appointmentType: null,
      appointmentTypeDesc: null,
      appointmentStatus: null,
      effectiveDate: null,
      expirationDate: null,
      county: null,
      countyNormalized: null,
      entityType,
      launchCountyId: null,
      skipReason: 'missing_license',
    };
  }

  if (!appointingEntityName) {
    return {
      licenseNumber,
      fullName: null,
      npn: null,
      appointingEntityNumber: null,
      appointingEntityName: '',
      appointmentType: null,
      appointmentTypeDesc: null,
      appointmentStatus: null,
      effectiveDate: null,
      expirationDate: null,
      county: null,
      countyNormalized: null,
      entityType,
      launchCountyId: null,
      skipReason: 'missing_appointing_entity',
    };
  }

  const county = pick(row, ['Business County', 'County', 'BusinessCounty']) || null;
  const countyNormalized = normalizeCountyName(county);
  const launch = matchLaunchCounty(county);

  return {
    licenseNumber,
    fullName: pick(row, ['Full Name', 'FullName', 'Legal Name']) || null,
    npn: pick(row, ['NPN Number', 'NPN']) || null,
    appointingEntityNumber:
      pick(row, ['Appointing Entity Number', 'AppointingEntityNumber']) || null,
    appointingEntityName,
    appointmentType: pick(row, ['Appointment TYCL', 'Appointment Type Code']) || null,
    appointmentTypeDesc:
      pick(row, ['Appointment TYCL Desc', 'Appointment Type', 'Appointment Type Description']) ||
      null,
    appointmentStatus: pick(row, ['Appointment Status', 'Status']) || null,
    effectiveDate: parseDate(
      pick(row, ['Appointment Issue Date', 'Issue Date', 'Effective Date'])
    ),
    expirationDate: parseDate(
      pick(row, ['Appointment Expiration Date', 'Expiration Date'])
    ),
    county,
    countyNormalized,
    entityType,
    launchCountyId: launch?.id ?? null,
  };
}

const MAX_PUBLIC_CARRIERS = 40;

/** Build consumer-safe snapshot from appointment rows (alphabetical, capped). */
export function buildAppointmentSnapshot(
  rows: Array<{
    appointing_entity_name?: string | null;
    carrier_name?: string | null;
    appointment_type?: string | null;
    appointment_status?: string | null;
    effective_date?: string | null;
    expiration_date?: string | null;
  }>,
  asOf: string = new Date().toISOString()
): ProviderAppointmentSnapshot | null {
  const byName = new Map<string, ProviderAppointmentCarrier>();

  for (const r of rows) {
    const name = (r.appointing_entity_name || r.carrier_name || '').trim();
    if (!name) continue;
    const key = name.toUpperCase();
    if (byName.has(key)) continue;
    byName.set(key, {
      name,
      type: r.appointment_type ?? null,
      status: r.appointment_status ?? null,
      effectiveDate: r.effective_date ?? null,
      expirationDate: r.expiration_date ?? null,
    });
  }

  if (!byName.size) return null;

  const carriers = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    source: FL_DFS_REGULATOR,
    sourceUrl: FL_DFS_SOURCE_URL,
    lookupUrl: FL_DFS_LOOKUP_URL,
    asOf,
    totalCount: carriers.length,
    carriers: carriers.slice(0, MAX_PUBLIC_CARRIERS),
    honesty: [...APPOINTMENT_HONESTY],
  };
}

export function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return /active/i.test(status) && !/inactive|cancel|term|expir/i.test(status);
}
