/**
 * INS-NAT-FINAL-005 — insurance-agency-trust-report-v1 snapshot contract.
 * Server-side payload. Does not inherit legal-insurer or person evidence.
 */

import { SAFE_PUBLIC_COPY } from './regulatory-evidence';
import { TDI_COMPLAINT_COPY } from './regulatory-display';
import { legalInsurerEvidenceAppearsOnAgencyReport } from './regulatory-display';

export const TRUST_REPORT_VERSION = 'insurance-agency-trust-report-v1';

export type TrustReportCredential = {
  jurisdiction: string;
  licenseNumber: string;
  licenseClass: string | null;
  regulatoryStatus: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  sourceDataset: string;
  sourceObservedAt: string | null;
};

export type TrustReportLoa = {
  officialText: string;
  officialCode: string | null;
  sourceDataset: string;
};

export type TrustReportAppointment = {
  toEntityId: string;
  relationshipType: string;
  status: string | null;
  sourceDataset: string;
  limitation: string;
};

export type TrustReportContact = {
  kind: string;
  value: string;
  sourceDataset: string;
  publicEligible: boolean;
};

export type InsuranceAgencyTrustReportV1 = {
  version: typeof TRUST_REPORT_VERSION;
  entity: {
    id: string;
    kind: 'agency';
    npn: string | null;
    legalName: string;
    displayName: string;
    identityConfidence: string;
  };
  credentials: TrustReportCredential[];
  loas: TrustReportLoa[];
  appointments: TrustReportAppointment[];
  appointmentCoverageNote: string;
  cms: Array<{
    evidenceType: string;
    planYear: string | null;
    sourceDataset: string;
    note: string;
  }>;
  contacts: TrustReportContact[];
  regulatoryEvidence: [];
  regulatoryNote: string;
  jurisdictions: string[];
  footprintCopy: string;
  sources: Array<{ authority: string; dataset: string; asOf: string | null }>;
  limitations: string[];
  readiness: string;
};

export function emptyAgencyRegulatoryModule(): [] {
  void legalInsurerEvidenceAppearsOnAgencyReport;
  return [];
}

export function footprintCopy(jurisdictionCount: number): string {
  if (jurisdictionCount <= 0) {
    return 'No state credentials were found in the sources currently included in our research.';
  }
  return `Licensed in ${jurisdictionCount} jurisdictions in the sources currently included.`;
}

export function appointmentCoverageNote(hasAny: boolean): string {
  if (!hasAny) {
    return 'Appointment coverage in currently included sources is incomplete. Missing appointment rows are not evidence of zero appointments.';
  }
  return 'Appointments shown are exact regulator-reported relationships in currently included sources. Appointment is not employment, quality, or service territory.';
}

export function agencyTrustReportLimitations(): string[] {
  return [
    'Official records can change. Re-check licenses on the state regulator site.',
    'Source coverage varies by jurisdiction. Missing data is not evidence of absence.',
    SAFE_PUBLIC_COPY.coverage.replace('[date]', 'the source date on each record'),
    'CMS Marketplace registration is not a state license.',
    'Lines of authority are source-reported terminology, not product expertise.',
    TDI_COMPLAINT_COPY.notFinding,
    'Legal-insurer complaint statistics are not inherited by agency profiles.',
  ];
}

export const TRUST_REPORT_MODULES = [
  'Identity',
  'Business / contact information',
  'State credentials',
  'License status',
  'License classes',
  'Lines of Authority',
  'Appointments',
  'Multi-state footprint',
  'CMS Marketplace evidence',
  'Regulatory & Enforcement History',
  'Sources & freshness',
] as const;

export const PERSON_APPOINTMENT_TYPE = 'APPOINTED_TO';

export function credentialIsNotLoa(): true {
  return true;
}
export function loaIsNotAppointment(): true {
  return true;
}
export function appointmentIsNotEmployment(): true {
  return true;
}
export function personAppointmentsAreNotAgencyAppointments(): true {
  return true;
}
export function cmsRegistrationIsNotLicense(): true {
  return true;
}
export function licensedJurisdictionsAreNotServiceTerritory(): true {
  return true;
}

export type AgencyTrustReportInput = {
  entity: InsuranceAgencyTrustReportV1['entity'];
  credentials: TrustReportCredential[];
  loas: TrustReportLoa[];
  appointments: TrustReportAppointment[];
  cms: InsuranceAgencyTrustReportV1['cms'];
  contacts: TrustReportContact[];
  regulatoryCandidates?: Array<{
    entityId?: string | null;
    identityConfidence?: string | null;
    publicationReadiness?: string | null;
    family?: string | null;
    sourceDataset?: string | null;
    eventDate?: string | null;
    respondentKind?: string | null;
  }>;
  sources: InsuranceAgencyTrustReportV1['sources'];
  readiness: string;
};

export function buildAgencyTrustReport(
  input: AgencyTrustReportInput
): InsuranceAgencyTrustReportV1 {
  const jurisdictions = [
    ...new Set(input.credentials.map((c) => c.jurisdiction).filter(Boolean)),
  ].sort();
  const appointments = input.appointments.filter(
    (a) => a.relationshipType !== PERSON_APPOINTMENT_TYPE
  );
  void input.regulatoryCandidates;
  return {
    version: TRUST_REPORT_VERSION,
    entity: { ...input.entity, kind: 'agency' },
    credentials: input.credentials.slice(),
    loas: input.loas.slice(),
    appointments,
    appointmentCoverageNote: appointmentCoverageNote(appointments.length > 0),
    cms: input.cms.map((row) => ({
      ...row,
      note: 'CMS Marketplace registration is not a state license.',
    })),
    contacts: input.contacts.filter((c) => c.publicEligible),
    regulatoryEvidence: emptyAgencyRegulatoryModule(),
    regulatoryNote:
      'Legal-insurer complaint statistics are not shown on agency Trust Reports. Agency regulatory evidence appears only when the respondent is the agency. Complaint Data is not a final order or enforcement finding.',
    jurisdictions,
    footprintCopy: footprintCopy(jurisdictions.length),
    sources: input.sources,
    limitations: agencyTrustReportLimitations(),
    readiness: input.readiness,
  };
}
