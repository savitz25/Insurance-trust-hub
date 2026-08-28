/**
 * FL-INS-007 — exact-identity Florida modules on existing public provider profiles.
 * Independent gates. Missing evidence is omitted, never shown as zero/clean.
 */
import type {
  InsuranceAgencyTrustReportV1,
  TrustReportAppointment,
  TrustReportCredential,
} from '@/lib/national/agency-trust-report';
import { APPOINTER_SAFE_COPY, PROFILE_GATE } from '@/lib/national/fl-state-intel';

const UNKNOWN_STATUS = new Set(['', 'unknown', 'null', 'undefined']);

export type FloridaCredentialRow = {
  licenseNumber: string;
  licenseClass: string | null;
  jurisdiction: string;
  sourceDataset: string;
  sourceObservedAt: string | null;
  regulatoryStatus: string | null;
};

export type FloridaAppointmentSummary = {
  observationCount: number;
  currentCount: number;
  historicalCount: number;
  statuses: string[];
  limitation: string;
};

export type FloridaProfileModules = {
  credentialGate: typeof PROFILE_GATE.FL_CREDENTIAL_READY | null;
  appointmentGate: typeof PROFILE_GATE.FL_APPOINTMENT_READY | null;
  withheld: Array<(typeof PROFILE_GATE)[keyof typeof PROFILE_GATE]>;
  credentials: FloridaCredentialRow[];
  appointments: FloridaAppointmentSummary | null;
};

export function isUnknownCredentialStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return UNKNOWN_STATUS.has(status.trim().toLowerCase());
}

export function flCredentialsFromReport(
  report: InsuranceAgencyTrustReportV1
): TrustReportCredential[] {
  return report.credentials.filter((c) => String(c.jurisdiction || '').toUpperCase() === 'FL');
}

export function flAppointmentsFromReport(
  report: InsuranceAgencyTrustReportV1
): TrustReportAppointment[] {
  return report.appointments.filter((a) => a.relationshipType === 'appointed_by');
}

export function classifyFloridaProfileModules(
  report: InsuranceAgencyTrustReportV1 | null
): FloridaProfileModules {
  const withheld: FloridaProfileModules['withheld'] = [
    PROFILE_GATE.CMS_NOT_READY,
    PROFILE_GATE.MIR_NOT_ENTITY_COMPATIBLE,
    PROFILE_GATE.SURPLUS_NOT_ENTITY_COMPATIBLE,
    PROFILE_GATE.FL_REGULATORY_NOT_DETERMINISTICALLY_LINKED,
    PROFILE_GATE.NFIP_NOT_DETERMINISTICALLY_LINKED,
  ];

  if (!report || report.entity.kind !== 'agency') {
    return {
      credentialGate: null,
      appointmentGate: null,
      withheld,
      credentials: [],
      appointments: null,
    };
  }

  const flCreds = flCredentialsFromReport(report);
  const flApts = flAppointmentsFromReport(report);

  const credentials: FloridaCredentialRow[] = flCreds.map((c) => ({
    licenseNumber: c.licenseNumber,
    licenseClass: c.licenseClass,
    jurisdiction: 'FL',
    sourceDataset: c.sourceDataset,
    sourceObservedAt: c.sourceObservedAt,
    regulatoryStatus: isUnknownCredentialStatus(c.regulatoryStatus) ? null : c.regulatoryStatus,
  }));

  const currentCount = flApts.filter((a) => String(a.status || '').toUpperCase() === 'CURRENT').length;
  const historicalCount = flApts.filter((a) => String(a.status || '').toUpperCase() === 'HISTORICAL').length;
  const statuses = Array.from(
    new Set(flApts.map((a) => a.status).filter((s): s is string => Boolean(s)))
  );

  return {
    credentialGate: credentials.length > 0 ? PROFILE_GATE.FL_CREDENTIAL_READY : null,
    appointmentGate: flApts.length > 0 ? PROFILE_GATE.FL_APPOINTMENT_READY : null,
    withheld,
    credentials,
    appointments:
      flApts.length > 0
        ? {
            observationCount: flApts.length,
            currentCount,
            historicalCount,
            statuses,
            limitation: APPOINTER_SAFE_COPY,
          }
        : null,
  };
}

export function moduleRendersCredential(mods: FloridaProfileModules): boolean {
  return mods.credentialGate === PROFILE_GATE.FL_CREDENTIAL_READY && mods.credentials.length > 0;
}

export function moduleRendersAppointment(mods: FloridaProfileModules): boolean {
  return mods.appointmentGate === PROFILE_GATE.FL_APPOINTMENT_READY && mods.appointments !== null;
}
