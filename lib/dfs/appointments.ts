/**
 * Phase 6A/6B — Florida DFS appointment normalization + public snapshot shape.
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

/** Neutral type bucket from DFS appointment type description — never a quality rank. */
export type AppointmentTypeGroup = 'agent' | 'mga' | 'broker' | 'other';

export type NormalizedAppointment = {
  licenseNumber: string;
  /** Uppercase compact key for producer match maps */
  licenseKey: string;
  fullName: string | null;
  npn: string | null;
  appointingEntityNumber: string | null;
  appointingEntityName: string;
  appointmentType: string | null;
  appointmentTypeDesc: string | null;
  appointmentStatus: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  county: string | null;
  countyNormalized: string | null;
  entityType: AppointmentEntityType;
  launchCountyId: string | null;
  skipReason?: string;
};

export type ProviderAppointmentCarrier = {
  name: string;
  type?: string | null;
  /** Neutral DFS-derived bucket */
  typeGroup?: AppointmentTypeGroup | null;
  status?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
};

export type ProviderAppointmentSnapshot = {
  source: string;
  sourceUrl: string;
  lookupUrl: string;
  asOf: string;
  /** Unique appointing entities after dedupe (full count) */
  totalCount: number;
  /** How many active-status rows contributed (neutral fact) */
  activeCount?: number;
  /** Carriers shown in UI (capped) */
  carriers: ProviderAppointmentCarrier[];
  /** True when more carriers exist than displayed */
  displayCapped?: boolean;
  honesty: string[];
  schemaVersion?: number;
};

export const APPOINTMENT_HONESTY = [
  'Regulatory snapshot from Florida DFS',
  'Not an endorsement of this agency or any carrier',
  'Appointment status can change; re-check on official DFS tools',
] as const;

/** UI display cap — full totalCount still reported */
export const MAX_PUBLIC_CARRIERS = 48;

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
 * Stronger license keys for appointment↔producer matching.
 * Always uppercase, strip spaces; keep letter+digit agency forms (R003721, L091607).
 */
export function appointmentLicenseKeys(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const cleaned = cleanLicenseNumber(raw) || cleanCell(raw);
  if (!cleaned) return [];
  const compact = cleaned.replace(/\s+/g, '').toUpperCase();
  if (compact.length < 3 || !/\d/.test(compact)) return [];

  const keys = new Set<string>([compact]);
  // Variant: strip non-alphanumeric (rare punctuation in exports)
  const alnum = compact.replace(/[^A-Z0-9]/g, '');
  if (alnum.length >= 3) keys.add(alnum);

  return [...keys];
}

export function primaryLicenseKey(raw: string | null | undefined): string | null {
  const keys = appointmentLicenseKeys(raw);
  return keys[0] ?? null;
}

export function normalizeCarrierName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]+$/g, '')
    .toUpperCase();
}

/** Neutral grouping from DFS type description — no quality judgment. */
export function classifyAppointmentTypeGroup(
  typeDesc: string | null | undefined
): AppointmentTypeGroup {
  if (!typeDesc?.trim()) return 'other';
  const t = typeDesc.toLowerCase();
  if (/managing general agent|\bmga\b/.test(t)) return 'mga';
  if (/\bbroker\b|surplus lines broker|reinsurance intermediary broker/.test(t)) {
    return 'broker';
  }
  if (
    /\bagent\b|producer|solicitor|customer representative|insurance agency/.test(t)
  ) {
    return 'agent';
  }
  return 'other';
}

export function isActiveStatus(status: string | null | undefined): boolean {
  if (!status?.trim()) return true; // unknown → keep
  const s = status.toLowerCase();
  if (/inactive|cancel|terminat|revok|suspend|expir|lapsed/.test(s)) return false;
  if (/active/.test(s)) return true;
  return true;
}

function statusRank(status: string | null | undefined): number {
  if (!status?.trim()) return 1;
  if (isActiveStatus(status)) return 0;
  return 2;
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
  const licenseKey = primaryLicenseKey(licenseRaw);
  const licenseNumber =
    cleanLicenseNumber(licenseRaw) ||
    cleanCell(licenseRaw).replace(/\s+/g, '').toUpperCase();

  const appointingEntityName = pick(row, [
    'Appointing Entity Name',
    'AppointingEntityName',
    'Carrier Name',
    'Company Name',
  ]);

  const empty = (skipReason: string): NormalizedAppointment => ({
    licenseNumber: licenseNumber || '',
    licenseKey: licenseKey || '',
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
    skipReason,
  });

  if (!licenseKey || !licenseNumber || licenseNumber.length < 3) {
    return empty('missing_license');
  }

  if (!appointingEntityName) {
    return empty('missing_appointing_entity');
  }

  const county = pick(row, ['Business County', 'County', 'BusinessCounty']) || null;
  const countyNormalized = normalizeCountyName(county);
  const launch = matchLaunchCounty(county);

  return {
    licenseNumber,
    licenseKey,
    fullName: pick(row, ['Full Name', 'FullName', 'Legal Name']) || null,
    npn: pick(row, ['NPN Number', 'NPN']) || null,
    appointingEntityNumber:
      pick(row, ['Appointing Entity Number', 'AppointingEntityNumber']) || '',
    appointingEntityName: appointingEntityName.replace(/\s+/g, ' ').trim(),
    appointmentType: pick(row, ['Appointment TYCL', 'Appointment Type Code']) || '',
    appointmentTypeDesc:
      pick(row, [
        'Appointment TYCL Desc',
        'Appointment Type',
        'Appointment Type Description',
      ]) || null,
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

type SnapshotInputRow = {
  appointing_entity_name?: string | null;
  carrier_name?: string | null;
  appointment_type?: string | null;
  appointment_status?: string | null;
  effective_date?: string | null;
  expiration_date?: string | null;
};

/**
 * Build consumer-safe snapshot:
 * - prefer active status when choosing among duplicates
 * - dedupe by normalized carrier name
 * - sort alpha by name, then type
 * - cap display list; totalCount remains full unique set
 */
export function buildAppointmentSnapshot(
  rows: SnapshotInputRow[],
  asOf: string = new Date().toISOString()
): ProviderAppointmentSnapshot | null {
  const byCarrier = new Map<string, ProviderAppointmentCarrier & { _rank: number }>();
  let activeCount = 0;

  for (const r of rows) {
    const name = (r.appointing_entity_name || r.carrier_name || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) continue;

    const status = r.appointment_status ?? null;
    if (isActiveStatus(status)) activeCount++;

    const typeLabel = (r.appointment_type || '').trim() || null;
    const key = normalizeCarrierName(name);
    const candidate: ProviderAppointmentCarrier & { _rank: number } = {
      name,
      type: typeLabel,
      typeGroup: classifyAppointmentTypeGroup(typeLabel),
      status,
      effectiveDate: r.effective_date ?? null,
      expirationDate: r.expiration_date ?? null,
      _rank: statusRank(status),
    };

    const existing = byCarrier.get(key);
    if (!existing) {
      byCarrier.set(key, candidate);
      continue;
    }
    // Prefer active / better rank; then richer type label
    if (candidate._rank < existing._rank) {
      byCarrier.set(key, candidate);
    } else if (
      candidate._rank === existing._rank &&
      (candidate.type?.length ?? 0) > (existing.type?.length ?? 0)
    ) {
      byCarrier.set(key, candidate);
    }
  }

  if (!byCarrier.size) return null;

  const carriers = [...byCarrier.values()]
    .map(({ _rank: _r, ...rest }) => rest)
    .sort((a, b) => {
      const n = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
      if (n !== 0) return n;
      return (a.type ?? '').localeCompare(b.type ?? '', 'en', {
        sensitivity: 'base',
      });
    });

  const displayCapped = carriers.length > MAX_PUBLIC_CARRIERS;

  return {
    source: FL_DFS_REGULATOR,
    sourceUrl: FL_DFS_SOURCE_URL,
    lookupUrl: FL_DFS_LOOKUP_URL,
    asOf,
    totalCount: carriers.length,
    activeCount,
    carriers: carriers.slice(0, MAX_PUBLIC_CARRIERS),
    displayCapped,
    honesty: [...APPOINTMENT_HONESTY],
    schemaVersion: 2,
  };
}
