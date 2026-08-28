/**
 * FL-INS-001 — Florida DFS Business (agency) appointments.
 * AGENCY → appointed_by → carrier:fl-dfs:{number}.
 * Exact NPN only. No person inheritance. No legal-insurer attach.
 * Appointment type is never an LOA.
 */

import { normalizeNpn } from './npn';
import {
  appointmentCurrency,
  carrierProvisionalKey,
  normalizeAppointingEntityNumber,
  type AppointmentCurrency,
} from './carrier-identity';

export const FL_AGENCY_APPOINTMENT_SOURCE = {
  portal: 'https://licenseesearch.fldfs.com/BulkDownload',
  regulator: 'Florida Department of Financial Services',
  file: 'AllActiveAppointmentsBusiness.csv',
  fileUrl:
    'https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllActiveAppointmentsBusiness.csv',
  sourceDataset: 'florida_dfs_appointments',
  relationshipType: 'appointed_by',
  task: 'FL-INS-001',
} as const;

export const COUNTY_APPOINTMENT_FILE = {
  file: 'All Active County Appointments',
  approxBytes: 235 * 1024 * 1024,
  ingest: false as const,
  notServiceTerritory: true as const,
};

export const SAFE_APPOINTMENT_COPY =
  'Appointment record found in Florida DFS data';

export const FORBIDDEN_APPOINTMENT_COPY = [
  'Authorized carrier partner',
  'Works with',
  'Represents',
  'Preferred carrier',
  'Certified by',
  'Approved by',
] as const;

export type AgencyAppointmentJoin =
  | { action: 'attach'; confidence: 'CONFIRMED'; npn: string; agencyEntityId: string }
  | { action: 'hold'; confidence: 'REVIEW_REQUIRED'; npn: string; reason: string }
  | { action: 'hold'; confidence: 'UNRESOLVED'; npn: string | null; reason: string };

export function agencyAppointmentUsesName(): false {
  return false;
}
export function agencyAppointmentUsesFuzzy(): false {
  return false;
}
export function personAppointmentInheritsToAgency(): false {
  return false;
}
export function associatedWithInheritsAppointment(): false {
  return false;
}
export function appointmentTypeIsLoa(): false {
  return false;
}
export function unknownCredentialStatusMeansInactive(): false {
  return false;
}
export function mayAttachLegalInsurerWithoutConfirmedCrosswalk(): false {
  return false;
}

export function decideAgencyAppointmentJoin(input: {
  npn: string | null | undefined;
  agencyIdsForNpn: string[];
}): AgencyAppointmentJoin {
  const npn = normalizeNpn(input.npn ?? null);
  if (!npn) {
    return { action: 'hold', confidence: 'UNRESOLVED', npn: null, reason: 'missing_or_invalid_npn' };
  }
  if (input.agencyIdsForNpn.length === 0) {
    return { action: 'hold', confidence: 'UNRESOLVED', npn, reason: 'no_canonical_agency_for_npn' };
  }
  if (input.agencyIdsForNpn.length > 1) {
    return {
      action: 'hold',
      confidence: 'REVIEW_REQUIRED',
      npn,
      reason: 'duplicate_canonical_agency_npn',
    };
  }
  return {
    action: 'attach',
    confidence: 'CONFIRMED',
    npn,
    agencyEntityId: input.agencyIdsForNpn[0]!,
  };
}

export function appointerKey(number: string | null | undefined): string | null {
  const n = normalizeAppointingEntityNumber(number);
  if (!n) return null;
  return carrierProvisionalKey(n);
}

export function sourceDedupeKey(input: {
  licenseNumber: string;
  appointingEntityNumber: string;
  appointmentType: string;
}): string {
  return `${input.licenseNumber}|${input.appointingEntityNumber}|${input.appointmentType}`;
}

/** Official graph source_record_id when staging UUID is unavailable. */
export function flDfsBizSourceRecordId(input: {
  licenseNumber: string;
  appointingEntityNumber: string;
  appointmentType: string;
}): string {
  return `fl-dfs-biz:${sourceDedupeKey(input)}`;
}

/** INS-NAT-007 rows absent from the 2026-08-28 All Active file. Not proven terminations. */
export const RETAINED_HISTORICAL_APPOINTED_BY_IDS = [
  '31c6fbf8-3b84-4eb6-9baa-c750fc77c473',
  'ea5441f1-97a6-4137-a2bd-74e0ae37e656',
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidSourceRecordId(id: string | null | undefined): boolean {
  return UUID_RE.test(String(id || ''));
}

/**
 * Transient TypeScript writer grain: license|appointer|tycl|issueDate.
 * Canonical grains are staging UUID or fl-dfs-biz:{license}|{number}|{type}.
 */
export function isConflictingPipeGrain(sourceRecordId: string | null | undefined): boolean {
  const id = String(sourceRecordId || '');
  if (!id) return false;
  if (id.startsWith('fl-dfs-biz:')) return false;
  if (isUuidSourceRecordId(id)) return false;
  return id.split('|').length >= 4;
}

export function mayDeleteAppointedById(id: string): boolean {
  return !(RETAINED_HISTORICAL_APPOINTED_BY_IDS as readonly string[]).includes(id);
}

export { appointmentCurrency };
export type { AppointmentCurrency };
