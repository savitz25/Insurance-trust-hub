/**
 * Florida DFS individual carrier appointments.
 * Official source: All Active Appointments — Individual (A–Z splits).
 * PERSON → APPOINTED_TO → CARRIER. Exact NPN + exact DFS appointing entity number.
 * Not employment, not ASSOCIATED_WITH, not LOA, not Marketplace.
 */

import { normalizeNpn } from './npn';
import { normalizeAppointingEntityNumber } from './carrier-identity';
import { appointmentCurrency, type AppointmentCurrency } from './carrier-identity';
import { healthLoaImpliesMarketplace } from './loa';

export const FL_INDIVIDUAL_APPOINTMENT_SOURCE = {
  portal: 'https://licenseesearch.fldfs.com/BulkDownload',
  regulator: 'Florida Department of Financial Services',
  sourceDataset: 'florida_dfs_individual_appointments',
  sourceTable: 'dfs_individual_appointments_csv',
  files: [
    'AllActiveAppointmentsIndividual(A-C).csv',
    'AllActiveAppointmentsIndividual(D-G).csv',
    'AllActiveAppointmentsIndividual(H-L).csv',
    'AllActiveAppointmentsIndividual(M-P).csv',
    'AllActiveAppointmentsIndividual(Q-S).csv',
    'AllActiveAppointmentsIndividual(T-Z).csv',
  ],
  fileUrl: (name: string) =>
    `https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/${encodeURIComponent(name)}`,
} as const;

export const PERSON_CARRIER_APPOINTMENT_TYPE = 'APPOINTED_TO' as const;
export const AGENCY_CARRIER_APPOINTMENT_TYPE = 'appointed_by' as const;
export const PERSON_AGENCY_ASSOCIATION_TYPE = 'ASSOCIATED_WITH' as const;

export type PersonJoinPath = 'exact_npn' | 'exact_fl_license' | 'none';

export type PersonAppointmentJoin =
  | { action: 'attach'; confidence: 'CONFIRMED'; path: 'exact_npn'; npn: string }
  | { action: 'attach'; confidence: 'CONFIRMED'; path: 'exact_fl_license'; npn: string }
  | { action: 'skip'; confidence: 'UNRESOLVED'; reason: 'missing_or_invalid_npn' }
  | { action: 'skip'; confidence: 'UNRESOLVED'; reason: 'person_not_in_graph' }
  | { action: 'skip'; confidence: 'REVIEW_REQUIRED'; reason: 'ambiguous_license_join' }
  | { action: 'skip'; confidence: 'KIND_CONFLICT'; reason: 'npn_owned_by_agency' };

/** Appointment type is never an LOA. */
export function appointmentImpliesLoa(): false {
  return false;
}

/** Carrier appointment is never Marketplace evidence. */
export function appointmentImpliesMarketplace(): false {
  return healthLoaImpliesMarketplace();
}

export function appointmentImpliesEmployment(): false {
  return false;
}

export function appointmentJoinUsesName(): false {
  return false;
}

export function personCarrierRelationshipType(): typeof PERSON_CARRIER_APPOINTMENT_TYPE {
  return PERSON_CARRIER_APPOINTMENT_TYPE;
}

export function decidePersonAppointmentJoin(input: {
  npn: string | null | undefined;
  licenseNumber?: string | null;
  personByNpn: Set<string>;
  agencyNpns: Set<string>;
  /** license_number (upper) → person NPN when unique among FL person credentials */
  uniqueFlLicenseToNpn?: Map<string, string>;
  ambiguousFlLicenses?: Set<string>;
}): PersonAppointmentJoin {
  const npn = normalizeNpn(input.npn ?? null);
  if (npn) {
    if (input.agencyNpns.has(npn) && !input.personByNpn.has(npn)) {
      return { action: 'skip', confidence: 'KIND_CONFLICT', reason: 'npn_owned_by_agency' };
    }
    if (input.personByNpn.has(npn)) {
      return { action: 'attach', confidence: 'CONFIRMED', path: 'exact_npn', npn };
    }
    return { action: 'skip', confidence: 'UNRESOLVED', reason: 'person_not_in_graph' };
  }

  const lic = String(input.licenseNumber || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
  if (lic && input.ambiguousFlLicenses?.has(lic)) {
    return { action: 'skip', confidence: 'REVIEW_REQUIRED', reason: 'ambiguous_license_join' };
  }
  const mapped = lic ? input.uniqueFlLicenseToNpn?.get(lic) : undefined;
  if (mapped && input.personByNpn.has(mapped)) {
    return { action: 'attach', confidence: 'CONFIRMED', path: 'exact_fl_license', npn: mapped };
  }
  return { action: 'skip', confidence: 'UNRESOLVED', reason: 'missing_or_invalid_npn' };
}

export function appointmentSourceRecordId(input: {
  personNpn: string;
  appointingEntityNumber: string;
  appointmentType: string;
  effectiveDate: string | null;
}): string {
  return [
    input.personNpn,
    input.appointingEntityNumber,
    String(input.appointmentType || '').trim().toUpperCase(),
    input.effectiveDate || '',
  ].join('|');
}

export function individualAppointmentCurrency(input: {
  status?: string | null;
  expirationDate?: string | null;
  sourceIsActiveFile?: boolean;
  now?: Date;
}): AppointmentCurrency {
  const fromFields = appointmentCurrency({
    status: input.status,
    expirationDate: input.expirationDate,
    now: input.now,
  });
  if (fromFields !== 'UNKNOWN') return fromFields;
  // DFS bulk file title is "All Active Appointments". Status ACTIVE → CURRENT.
  if (input.sourceIsActiveFile && /active/i.test(String(input.status || 'active'))) {
    return 'CURRENT';
  }
  return fromFields;
}
