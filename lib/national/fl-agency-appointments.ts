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

export { appointmentCurrency };
export type { AppointmentCurrency };
