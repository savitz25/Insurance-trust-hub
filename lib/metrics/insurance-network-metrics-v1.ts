/**
 * insurance-network-metrics-v1
 * Specialist-owned public metric contract. Grains never mix.
 * Missing / unacquired universes stay UNKNOWN / NOT_ACQUIRED — never numeric zero.
 */

export const INSURANCE_NETWORK_METRICS_VERSION = 'insurance-network-metrics-v1' as const;

export type MetricValueState =
  | 'KNOWN'
  | 'UNKNOWN'
  | 'PARTIAL'
  | 'NOT_ACQUIRED'
  | 'REQUEST_ONLY';

export type MetricGrain =
  | 'canonical_agency_entity'
  | 'canonical_person_entity'
  | 'canonical_legal_insurer_entity'
  | 'appointing_carrier_entity'
  | 'insurance_group_entity'
  | 'consumer_brand_entity'
  | 'license_credential_row'
  | 'agency_credential_row'
  | 'person_credential_row'
  | 'public_directory_listing'
  | 'agency_appointment'
  | 'person_appointment_relationship'
  | 'associated_with_relationship'
  | 'consumer_complaint_observation'
  | 'complaint_index_row'
  | 'regulatory_evidence_row'
  | 'market_conduct_examination_listing'
  | 'financial_examination_listing'
  | 'ingested_examination_observation'
  | 'rate_filing_observation'
  | 'cms_marketplace_observation'
  | 'surplus_lines_observation'
  | 'title_appointment_row'
  | 'nfip_registry_listing'
  | 'admitted_legal_insurer_row'
  | 'authorized_company_row'
  | 'oir_company_code'
  | 'tdi_agency_license_row'
  | 'tdi_agency_npn'
  | 'florida_credentialed_agency'
  | 'published_state_intelligence_page'
  | 'public_legal_insurer_profile'
  | 'contact_observation'
  | 'combined_incompatible_grains';

export type PublicationStatus =
  | 'PUBLIC'
  | 'PUBLIC_PARTIAL'
  | 'PUBLIC_RESEARCH_GRAPH'
  | 'PUBLIC_UNKNOWN'
  | 'INTERNAL'
  | 'REJECTED';

export type MetricTrace = {
  counts: string;
  doesNotCount: string;
  contributingSourceSystems: string[];
  geographicCoverage: string;
  currentActiveRule?: string;
  sourceDates: string;
  generationDate: string;
  whyUnknown?: string;
};

export type InsuranceNetworkMetric = {
  key: string;
  label: string;
  value: number | null;
  valueState: MetricValueState;
  unit: 'count';
  grain: MetricGrain;
  denominator: string;
  description: string;
  coverage: string;
  contributingSourceSystems: string[];
  sourceAsOf: string | null;
  generatedAt: string;
  publicationStatus: PublicationStatus;
  trace: MetricTrace;
};

export type InsuranceNetworkMetricsV1 = {
  schemaVersion: typeof INSURANCE_NETWORK_METRICS_VERSION;
  generatedAt: string;
  newestDocumentedSourceAsOf: string | null;
  newestDocumentedSourceAsOfNote: string;
  sourceFingerprint: string;
  liveProductionHost: string | null;
  nationalGraph: {
    agencies: number;
    persons: number;
    legalInsurers: number;
    appointingCarriers: number;
    insuranceGroups: number;
    consumerBrands: number;
    credentials: number;
    agencyCredentials: number;
    personCredentials: number;
    credentialsByJurisdiction: Record<string, number>;
    cmsMarketplaceObservations: number;
    loaObservations: number;
    contactObservations: number;
    publicDirectoryListings: number;
    appointedBy: number;
    appointedTo: number;
    associatedWith: number;
    appointerResolvesTo: number;
    regulatoryEvidence: number;
    censusTask: string;
    censusAsOf: string;
    cohortRule: string;
  };
  texas: {
    snapshotFingerprint: string;
    asOf: string;
    agencyLicenseRows: number;
    distinctAgencyNpn: number;
    agencyAppointments: number;
    complaintObservations: number;
    complaintIndexRows: number;
    rateFilings: number;
    surplusLinesRows: number;
    titleAppointmentRows: number;
    personLicenseRowsUnpublished: number;
    personAppointmentsUnpublished: number;
    authorizedCompanies: null;
    authorizedCompaniesCoverage: 'SOURCE_NOT_ACQUIRED';
  };
  florida: {
    snapshotFingerprint: string;
    agenciesWithFlCredential: number;
    agencyCredentialRows: number;
    personCredentialRows: number;
    oirCompanyCodes: number;
    agencyAppointedBy: number;
    marketConductExamListings: number;
    financialExamListings: number;
    nfipRegistryListings: number;
    cmsObservationsNational: number;
  };
  newJersey: {
    snapshotFingerprint: string;
    asOf: string;
    admittedLegalInsurers: number;
    surplusLinesEligible: null;
    surplusLinesCoverage: 'SOURCE_NOT_ACQUIRED';
    marketConductExamReports: number;
    financialExamReports: number;
    enforcementEvents: number;
    serffFilingsDisplayed: null;
  };
  california: {
    snapshotFingerprint: string;
    asOf: string;
    admittedUniverse: null;
    admittedCoverage: 'SOURCE_NOT_ACQUIRED';
    cdiHealthInsurerListRows: number;
    dmhcEnforcementRows: number;
    imrRows: number;
  };
  publication: {
    publicPeople: 0;
    publicGraphAgencies: 0;
    publicLegalInsurerWave1: number;
    mayPublishPerson: false;
    mayPublishLegalInsurerKind: false;
    publishedStateIntelligencePaths: string[];
  };
  rejectedTotals: {
    combinedInsuranceCompanies: {
      status: 'REJECTED';
      publishAsHeadline: false;
      candidateSum: number;
      reason: string;
    };
    combinedIncompatibleEvidence: {
      status: 'REJECTED';
      publishAsHeadline: false;
      reason: string;
    };
  };
  metrics: InsuranceNetworkMetric[];
};

export function metricByKey(m: InsuranceNetworkMetricsV1, key: string): InsuranceNetworkMetric {
  const found = m.metrics.find((row) => row.key === key);
  if (!found) throw new Error(`metric missing: ${key}`);
  return found;
}

export function requiredPublicKeys(): string[] {
  return [
    'insurance_agencies',
    'licensed_insurance_companies',
    'insurance_producer_records',
    'appointments',
    'consumer_complaint_observations',
    'market_conduct_examinations',
    'rate_filing_observations',
    'cms_marketplace_evidence_observations',
  ];
}
