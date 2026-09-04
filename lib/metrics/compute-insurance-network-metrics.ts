import { createHash } from 'node:crypto';
import type {
  InsuranceNetworkMetric,
  InsuranceNetworkMetricsV1,
} from './insurance-network-metrics-v1';
import { INSURANCE_NETWORK_METRICS_VERSION } from './insurance-network-metrics-v1';

export type InsuranceNetworkMetricsInput = {
  generatedAt: string;
  liveProductionHost: string | null;
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
  cmsSourceAsOf: string;
  texasSnapshotFingerprint: string;
  texasAsOf: string;
  texasAgencyLicenseRows: number;
  texasDistinctAgencyNpn: number;
  texasAgencyAppointments: number;
  texasComplaintObservations: number;
  texasComplaintIndexRows: number;
  texasRateFilings: number;
  texasSurplusLinesRows: number;
  texasTitleAppointmentRows: number;
  texasPersonLicenseRowsUnpublished: number;
  texasPersonAppointmentsUnpublished: number;
  floridaSnapshotFingerprint: string;
  floridaAgenciesWithFlCredential: number;
  floridaAgencyCredentialRows: number;
  floridaPersonCredentialRows: number;
  floridaOirCompanyCodes: number;
  floridaAgencyAppointedBy: number;
  floridaMarketConductExamListings: number;
  floridaFinancialExamListings: number;
  floridaNfipRegistryListings: number;
  newJerseySnapshotFingerprint: string;
  newJerseyAsOf: string;
  newJerseyAdmittedLegalInsurers: number;
  newJerseyMarketConductExamReports: number;
  newJerseyFinancialExamReports: number;
  newJerseyEnforcementEvents: number;
  californiaSnapshotFingerprint: string;
  californiaAsOf: string;
  californiaCdiHealthInsurerListRows: number;
  californiaDmhcEnforcementRows: number;
  californiaImrRows: number;
  washingtonSnapshotFingerprint: string;
  washingtonAsOf: string;
  washingtonRegulatedEntitiesAnnualReport: number;
  publicLegalInsurerWave1: number;
  ingestedExamObservations: number;
  publishedStateIntelligencePaths: string[];
};

function metric(
  partial: Omit<InsuranceNetworkMetric, 'unit'> & { generatedAt: string }
): InsuranceNetworkMetric {
  return { unit: 'count', ...partial };
}

export function assertGrainSafety(input: InsuranceNetworkMetricsInput): void {
  if (input.agencies === input.persons) {
    throw new Error('agency must not equal producer');
  }
  if (input.agencies === input.legalInsurers) {
    throw new Error('agency must not equal legal insurer');
  }
  if (input.persons === input.legalInsurers) {
    throw new Error('producer must not equal legal insurer');
  }
  if (input.legalInsurers === input.appointingCarriers) {
    throw new Error('legal insurer must not equal appointing carrier');
  }
  if (input.texasAgencyAppointments === input.agencies) {
    throw new Error('appointments must not equal agencies');
  }
  if (input.texasAgencyAppointments === input.persons) {
    throw new Error('appointments must not equal producers');
  }
  if (input.texasAgencyAppointments === input.legalInsurers) {
    throw new Error('appointments must not equal legal insurers');
  }
  if (input.credentials === input.agencies) {
    throw new Error('credentials must not equal agencies');
  }
  if (input.texasTitleAppointmentRows === input.agencies) {
    throw new Error('title appointments must not equal agencies');
  }
  if (input.texasTitleAppointmentRows === input.texasAgencyAppointments) {
    throw new Error('title appointments must not equal agency appointments');
  }
  if (input.cmsMarketplaceObservations === input.legalInsurers) {
    throw new Error('CMS marketplace observations must not equal companies');
  }
  if (input.cmsMarketplaceObservations === input.agencies) {
    throw new Error('CMS marketplace observations must not equal agencies');
  }
  if (input.cmsMarketplaceObservations === input.persons) {
    throw new Error('CMS marketplace observations must not equal producers');
  }
  if (input.texasRateFilings === input.legalInsurers) {
    throw new Error('rate filings must not equal companies');
  }
  if (input.floridaMarketConductExamListings === input.floridaFinancialExamListings) {
    throw new Error('market conduct exams must not equal financial exams');
  }
  if (input.newJerseyMarketConductExamReports === input.newJerseyFinancialExamReports) {
    throw new Error('NJ market conduct exams must not equal financial exams');
  }
  if (input.texasComplaintObservations === input.legalInsurers) {
    throw new Error('complaints must not equal companies');
  }
  if (input.texasSurplusLinesRows === input.agencies) {
    throw new Error('surplus-lines observations must not equal agencies');
  }
  if (input.texasSurplusLinesRows === input.legalInsurers) {
    throw new Error('surplus-lines observations must not equal legal insurers');
  }
  if (input.texasAgencyLicenseRows === input.agencies) {
    throw new Error('Texas TDI agency license rows must not equal national graph agencies');
  }
  if (input.floridaOirCompanyCodes === input.legalInsurers) {
    throw new Error('Florida OIR company codes must not equal national legal insurers');
  }
  if (input.newJerseyAdmittedLegalInsurers === input.legalInsurers) {
    throw new Error('NJ admitted insurers must not equal national legal insurers');
  }
  if (input.publicDirectoryListings === input.agencies) {
    throw new Error('directory listings must not equal graph agencies');
  }
  if (input.agencyCredentials + input.personCredentials !== input.credentials) {
    throw new Error('agency + person credentials must equal credential total');
  }
  if (input.publicLegalInsurerWave1 === input.legalInsurers) {
    throw new Error('wave-1 public legal-insurer profiles must not equal the legal-insurer spine');
  }
  if (input.appointedBy === input.agencies) {
    throw new Error('appointed_by must not inflate agency counts');
  }
  if (input.floridaNfipRegistryListings === input.agencies) {
    throw new Error('NFIP registry listings must not equal agencies');
  }
  if (!input.publishedStateIntelligencePaths.includes('/florida')) {
    throw new Error('Florida state intelligence path missing');
  }
  if (!input.publishedStateIntelligencePaths.includes('/texas')) {
    throw new Error('Texas state intelligence path missing');
  }
  if (!input.publishedStateIntelligencePaths.includes('/new-jersey')) {
    throw new Error('New Jersey state intelligence path missing');
  }
  if (!input.publishedStateIntelligencePaths.includes('/california')) {
    throw new Error('California state intelligence path missing');
  }
  if (!input.publishedStateIntelligencePaths.includes('/washington')) {
    throw new Error('Washington state intelligence path missing');
  }
  if (input.washingtonRegulatedEntitiesAnnualReport === input.legalInsurers) {
    throw new Error('Washington annual-report entities must not equal national legal insurers');
  }
  if (input.publishedStateIntelligencePaths.length === input.agencies) {
    throw new Error('state pages must not equal agencies');
  }
}

export function computeInsuranceNetworkMetrics(
  input: InsuranceNetworkMetricsInput
): InsuranceNetworkMetricsV1 {
  assertGrainSafety(input);
  const generatedAt = input.generatedAt;
  const documentedDates = [
    input.censusAsOf,
    input.cmsSourceAsOf,
    input.texasAsOf,
    input.newJerseyAsOf,
    input.californiaAsOf,
    input.washingtonAsOf,
  ]
    .filter(Boolean)
    .map((d) => d.slice(0, 10))
    .sort();
  const newestDocumentedSourceAsOf = documentedDates.at(-1) ?? null;

  const commonTrace = (
    counts: string,
    doesNotCount: string,
    systems: string[],
    geo: string,
    sourceDates: string,
    extra?: Partial<InsuranceNetworkMetric['trace']>
  ) => ({
    counts,
    doesNotCount,
    contributingSourceSystems: systems,
    geographicCoverage: geo,
    sourceDates,
    generationDate: generatedAt.slice(0, 10),
    ...extra,
  });

  const metrics: InsuranceNetworkMetric[] = [
    metric({
      key: 'insurance_agencies',
      label: 'Insurance agencies',
      value: input.agencies,
      valueState: 'KNOWN',
      grain: 'canonical_agency_entity',
      denominator: "national_entities.entity_kind = 'agency'",
      description:
        'NPN-keyed agency identities in the national insurance research graph. Not a U.S. agency census and not the public directory listing count.',
      coverage: 'National research graph',
      contributingSourceSystems: ['national_entities', 'florida_dfs', 'texas_tdi', 'vermont_dfr', 'massachusetts_doi_regulatory', 'ohio_odi'],
      sourceAsOf: input.censusAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One national_entities row with entity_kind=agency.',
        'Not producers, not legal insurers, not appointing carriers, not appointments, not TDI agency license rows, not public directory listings.',
        ['national_entities'],
        'Research-graph identities; public graph-agency profiles = 0',
        `Graph census ${input.censusAsOf.slice(0, 10)}; not Git/deploy time.`
      ),
    }),
    metric({
      key: 'licensed_insurance_companies',
      label: 'Licensed insurance companies',
      value: input.legalInsurers,
      valueState: 'KNOWN',
      grain: 'canonical_legal_insurer_entity',
      denominator: "national_entities.entity_kind = 'legal_insurer' (NAIC CoCode spine)",
      description:
        'NAIC legal-insurer identities. Not appointing-carrier rows, not consumer brands, and not 6,185 public profile pages.',
      coverage: 'National NAIC listing spine',
      contributingSourceSystems: ['national_entities', 'naic_listing_of_companies'],
      sourceAsOf: input.censusAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One legal_insurer entity per NAIC company code.',
        'Not entity_kind=carrier appointing rows, not Florida OIR company codes, not NJ admitted rows, not Texas authorized companies (not acquired), not CMS Marketplace observations.',
        ['national_entities'],
        'National identity spine. Public legal-insurer kind remains unpublished; a 26-firm evidence cohort is a different grain.',
        `Graph census ${input.censusAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'insurance_producer_records',
      label: 'Insurance producer records',
      value: input.persons,
      valueState: 'KNOWN',
      grain: 'canonical_person_entity',
      denominator: "national_entities.entity_kind = 'person'",
      description:
        'Person identities in the research graph. Public producer profile pages remain 0.',
      coverage: 'National research graph',
      contributingSourceSystems: ['national_entities'],
      sourceAsOf: input.censusAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC_RESEARCH_GRAPH',
      trace: commonTrace(
        'One person entity in the national graph.',
        'Not agencies, not legal insurers, not a public people directory, not Texas unpublished person license rows.',
        ['national_entities'],
        'Research graph only. Public people = 0.',
        `Graph census ${input.censusAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'appointments',
      label: 'Appointments',
      value: input.texasAgencyAppointments,
      valueState: 'KNOWN',
      grain: 'agency_appointment',
      denominator: 'TDI active agency-to-company appointment rows (avjc-7u2m)',
      description:
        'Active Texas agency↔company appointments. Appointment count is not quality and is not an agency count.',
      coverage: 'Texas TDI',
      contributingSourceSystems: ['texas_tdi_agency_appointments'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One active TDI appointment between an agency NPN and a company NAIC.',
        'Not agencies, not producers, not legal insurers, not title-county appointments, not Florida appointed_by rows, not person APPOINTED_TO relationships.',
        ['texas_tdi'],
        'Texas. County appointment is not statewide authority.',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`,
        { currentActiveRule: 'Source file is active appointments only.' }
      ),
    }),
    metric({
      key: 'consumer_complaint_observations',
      label: 'Consumer complaint observations',
      value: input.texasComplaintObservations,
      valueState: 'KNOWN',
      grain: 'consumer_complaint_observation',
      denominator: 'TDI complaint-name rows (ubdr-4uff)',
      description:
        'Texas complaint-name observations. A complaint is not a violation and is not a company count.',
      coverage: 'Texas TDI',
      contributingSourceSystems: ['texas_tdi_complaints'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One TDI complaint-name row (person or organization named in a complaint).',
        'Not legal insurers, not agencies, not the TDI complaint index, not a TrustHub score, not proof of wrongdoing.',
        ['texas_tdi'],
        'Texas complaints 2011-04-28 through 2026-08-31',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'market_conduct_examinations',
      label: 'Market conduct examinations',
      value: input.floridaMarketConductExamListings,
      valueState: 'KNOWN',
      grain: 'market_conduct_examination_listing',
      denominator: 'Florida OIR market-regulation listing inventory (FL-INS-004)',
      description:
        'Florida market-conduct examination listings. Not financial exams and not a count of bad insurers.',
      coverage: 'Florida OIR listings',
      contributingSourceSystems: ['florida_oir_market_conduct_exams'],
      sourceAsOf: '2026-08-28',
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One OIR market-conduct listing/PDF inventory row.',
        'Not financial examinations, not legal insurers, not NJ market-conduct reports, not ingested PUBLIC_READY exam attachments.',
        ['florida_oir'],
        'Florida listing catalog. Name-only attach forbidden; listings are unattached.',
        'FL-INS-004 listing census 2026-08-28'
      ),
    }),
    metric({
      key: 'rate_filing_observations',
      label: 'Rate filing observations',
      value: input.texasRateFilings,
      valueState: 'KNOWN',
      grain: 'rate_filing_observation',
      denominator: 'TDI home/auto rate filings (iubg-btfs)',
      description:
        'Texas rate-filing rows. A rate filing is not a consumer premium and is not a company count.',
      coverage: 'Texas TDI',
      contributingSourceSystems: ['texas_tdi_rate_filings'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One TDI home/auto rate-filing row (SERFF-identified when present).',
        'Not licensed insurance companies, not quoted consumer premiums, not NJ SERFF (not acquired).',
        ['texas_tdi'],
        'Texas',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'cms_marketplace_evidence_observations',
      label: 'CMS Marketplace evidence observations',
      value: input.cmsMarketplaceObservations,
      valueState: 'KNOWN',
      grain: 'cms_marketplace_observation',
      denominator: 'cms_marketplace_observations table',
      description:
        'CMS FFM Marketplace registration observations. Not plans, not companies, not agencies, and not people.',
      coverage: 'Federal Marketplace overlay, plan year 2026 sources',
      contributingSourceSystems: ['cms_marketplace_observations', 'cms_ffm'],
      sourceAsOf: input.cmsSourceAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One CMS Marketplace observation row in the research graph.',
        'Not a state license, not certification, not a plan count, not an agency count, not a producer count, not a legal-insurer count.',
        ['cms_ffm'],
        'Federal overlay, not a DOI license',
        `CMS source-modified ${input.cmsSourceAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'appointing_carrier_entities',
      label: 'Appointing-entity (carrier-kind) records',
      value: input.appointingCarriers,
      valueState: 'KNOWN',
      grain: 'appointing_carrier_entity',
      denominator: "national_entities.entity_kind = 'carrier'",
      description:
        'Appointing-entity grain (FL DFS + TX TDI keys). Not the NAIC legal-insurer spine.',
      coverage: 'National research graph',
      contributingSourceSystems: ['national_entities', 'florida_dfs', 'texas_tdi'],
      sourceAsOf: input.censusAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One entity_kind=carrier appointing-entity row.',
        'Not licensed insurance companies (legal_insurer), not agencies, not appointments.',
        ['national_entities'],
        'FL DFS and TX TDI appointing keys',
        `Graph census ${input.censusAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'credential_observations',
      label: 'Credential observations',
      value: input.credentials,
      valueState: 'KNOWN',
      grain: 'license_credential_row',
      denominator: 'license_credentials table',
      description: 'Person + agency credential rows. A credential is not an appointment and is not an entity.',
      coverage: 'FL, TX, VT, MA, OH credential families currently stored',
      contributingSourceSystems: ['license_credentials'],
      sourceAsOf: input.censusAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One license_credentials row.',
        'Not agencies, not producers, not legal insurers, not appointments, not NJ/CA graph credentials (0 rows; missing is not a market of zero).',
        ['license_credentials'],
        'Source-state dependent',
        `Graph census ${input.censusAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'public_directory_listings',
      label: 'Public directory listings',
      value: input.publicDirectoryListings,
      valueState: 'KNOWN',
      grain: 'public_directory_listing',
      denominator: 'providers table',
      description: 'Live public directory listing rows. Not graph agencies and not a producer directory.',
      coverage: 'Public /directory surface',
      contributingSourceSystems: ['providers'],
      sourceAsOf: input.censusAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One providers listing row currently stored.',
        'Not canonical graph agencies, not producers, not legal insurers.',
        ['providers'],
        'Public ZIP directory, not the research graph',
        `Production providers count ${input.censusAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'texas_tdi_agency_license_rows',
      label: 'Texas TDI agency license rows',
      value: input.texasAgencyLicenseRows,
      valueState: 'KNOWN',
      grain: 'tdi_agency_license_row',
      denominator: 'TDI agencies-and-businesses file (3yqc-fcdt)',
      description:
        'One row per TDI license held by an agency or business. Not the national graph agency count and not a person directory.',
      coverage: 'Texas',
      contributingSourceSystems: ['texas_tdi'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One TDI agency/business license row.',
        'Not national graph agencies, not distinct NPN, not appointments, not person licenses. state=TX is listed/home-office state, not the licensed universe.',
        ['texas_tdi'],
        'Texas TDI',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'florida_agencies_with_fl_credential',
      label: 'Florida-credentialed agencies',
      value: input.floridaAgenciesWithFlCredential,
      valueState: 'KNOWN',
      grain: 'florida_credentialed_agency',
      denominator: 'Distinct graph agencies with at least one Florida credential',
      description: 'Agencies that hold a Florida credential row. Not the national agency denominator.',
      coverage: 'Florida',
      contributingSourceSystems: ['florida_dfs', 'license_credentials'],
      sourceAsOf: '2026-08-28',
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'Distinct agencies with a Florida credential.',
        'Not national graph agencies, not appointments, not legal insurers.',
        ['florida_dfs'],
        'Florida credential jurisdiction, not service territory',
        'FL-INS-006 snapshot 2026-08-28'
      ),
    }),
    metric({
      key: 'florida_agency_appointed_by',
      label: 'Florida agency appointed_by rows',
      value: input.floridaAgencyAppointedBy,
      valueState: 'KNOWN',
      grain: 'agency_appointment',
      denominator: "national_relationships.relationship_type = 'appointed_by'",
      description:
        'Florida DFS agency appointment evidence at the appointing-entity identifier. Not NAIC legal-insurer identity.',
      coverage: 'Florida',
      contributingSourceSystems: ['florida_dfs_appointments', 'national_relationships'],
      sourceAsOf: '2026-08-28',
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One appointed_by relationship row.',
        'Not Texas appointments, not agencies, not legal insurers, not employment, not county-wide authority.',
        ['florida_dfs'],
        'Florida DFS appointing-entity identifier, not NAIC CoCode',
        'FL-INS-006 appointment census'
      ),
    }),
    metric({
      key: 'florida_financial_examinations',
      label: 'Florida financial examination listings',
      value: input.floridaFinancialExamListings,
      valueState: 'KNOWN',
      grain: 'financial_examination_listing',
      denominator: 'Florida OIR financial-oversight listing inventory (FL-INS-004)',
      description: 'Florida financial-exam listings. Not market-conduct exams.',
      coverage: 'Florida OIR listings',
      contributingSourceSystems: ['florida_oir_financial_exams'],
      sourceAsOf: '2026-08-28',
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One OIR financial-exam listing/PDF inventory row.',
        'Not market-conduct examinations, not legal insurers, not misconduct findings.',
        ['florida_oir'],
        'Florida listing catalog',
        'FL-INS-004 listing census 2026-08-28'
      ),
    }),
    metric({
      key: 'nj_admitted_legal_insurers',
      label: 'New Jersey admitted legal insurers',
      value: input.newJerseyAdmittedLegalInsurers,
      valueState: 'KNOWN',
      grain: 'admitted_legal_insurer_row',
      denominator: 'NJDOBI licensed-carrier census with exact NAIC',
      description: 'NJ admitted legal entities. Not the national 6,185-insurer spine and not surplus-lines eligibility.',
      coverage: 'New Jersey',
      contributingSourceSystems: ['nj_dobi'],
      sourceAsOf: input.newJerseyAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One NJDOBI admitted-insurer row with exact NAIC.',
        'Not national legal insurers, not surplus-lines eligible companies (not acquired), not producers.',
        ['nj_dobi'],
        'New Jersey admitted census',
        `NJ snapshot as of ${input.newJerseyAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'nj_surplus_lines_eligible_companies',
      label: 'New Jersey surplus-lines eligible companies',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'surplus_lines_observation',
      denominator: 'NJDOBI surplus-lines eligible list — not acquired as a bulk census',
      description: 'Not acquired. Missing is not zero eligible companies.',
      coverage: 'New Jersey',
      contributingSourceSystems: ['nj_dobi'],
      sourceAsOf: null,
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'No bulk surplus-lines eligible census is stored.',
        'Not admitted insurers, not agencies, not a numeric zero.',
        ['nj_dobi'],
        'New Jersey',
        'SOURCE_NOT_ACQUIRED',
        { whyUnknown: 'Official surplus-lines whitelist was not acquired as a deterministic bulk file. Never render as zero.' }
      ),
    }),
    metric({
      key: 'texas_authorized_companies',
      label: 'Texas authorized companies',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'authorized_company_row',
      denominator: 'TDI company-licensing report — SOURCE_NOT_ACQUIRED',
      description: 'Interactive TDI company report. No deterministic bulk export. Missing is not zero companies.',
      coverage: 'Texas',
      contributingSourceSystems: ['texas_tdi'],
      sourceAsOf: null,
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'No bulk authorized-company universe is stored.',
        'Not appointment NAIC distinct counts, not national legal insurers, not a numeric zero.',
        ['texas_tdi'],
        'Texas',
        'SOURCE_NOT_ACQUIRED',
        { whyUnknown: 'TDI authorized-company report is interactive-only. Appointment NAIC is a relationship, not the complete authorized universe. Never render as zero.' }
      ),
    }),
    metric({
      key: 'ca_admitted_insurer_universe',
      label: 'California admitted-insurer universe',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'admitted_legal_insurer_row',
      denominator: 'CDI company lookup — OPEN_SEARCH_ONLY / SOURCE_NOT_ACQUIRED',
      description: 'Complete CDI admitted universe is not acquired. Missing is not zero companies.',
      coverage: 'California',
      contributingSourceSystems: ['california_cdi'],
      sourceAsOf: null,
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'No complete CDI admitted census is stored.',
        'Not the 28-row dated health-insurer list, not national legal insurers, not a numeric zero.',
        ['california_cdi'],
        'California',
        'SOURCE_NOT_ACQUIRED',
        { whyUnknown: 'CDI admitted/company lookup is open-search only. Never render as zero.' }
      ),
    }),
    metric({
      key: 'wa_oic_regulated_entities_annual_report',
      label: 'Washington OIC 2025 regulated entities (annual-report aggregate)',
      value: input.washingtonRegulatedEntitiesAnnualReport,
      valueState: 'KNOWN',
      grain: 'annual_report_entity_aggregate',
      denominator: 'OIC 2025 annual-report insurance and risk/non-risk bearing entities',
      description:
        'Dated OIC annual-report aggregate. Not a live authorized-company roster and not a count of Washington insurance companies.',
      coverage: 'Washington',
      contributingSourceSystems: ['washington_oic_annual_report'],
      sourceAsOf: input.washingtonAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One official 2025 annual-report regulated-entity total (domestic + foreign + alien).',
        'Not a live insurer roster, not national legal insurers, not agencies, not producers, not a numeric zero for missing rosters.',
        ['washington_oic'],
        'Washington; dated report year 2025',
        `OIC 2025 annual report as of ${input.washingtonAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'wa_authorized_companies',
      label: 'Washington authorized companies',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'authorized_company_row',
      denominator: 'OIC Agent and Company Lookup — OPEN_SEARCH_ONLY / SOURCE_NOT_ACQUIRED',
      description:
        'Current authorized-company roster is not acquired. The 2,924 annual-report aggregate is a different grain. Missing is not zero companies.',
      coverage: 'Washington',
      contributingSourceSystems: ['washington_oic'],
      sourceAsOf: null,
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'No bulk authorized-company universe is stored.',
        'Not the 2,924 annual-report aggregate, not national legal insurers, not a numeric zero.',
        ['washington_oic'],
        'Washington',
        'SOURCE_NOT_ACQUIRED',
        { whyUnknown: 'OIC company lookup is search-only. Annual-report 2,924 is not a live roster. Never render as zero.' }
      ),
    }),
    metric({
      key: 'texas_surplus_lines_observations',
      label: 'Texas surplus-lines observations',
      value: input.texasSurplusLinesRows,
      valueState: 'KNOWN',
      grain: 'surplus_lines_observation',
      denominator: 'TDI surplus-lines status detail (7isd-ex6t)',
      description: 'Surplus-lines person or firm license status rows. Not insurer authorization and not the standard agency universe.',
      coverage: 'Texas',
      contributingSourceSystems: ['texas_tdi'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One TDI surplus-lines status row (firm or individual).',
        'Not agencies, not legal insurers, not standard P&C appointments. Individual rows are not a public person directory.',
        ['texas_tdi'],
        'Texas',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'texas_title_appointment_rows',
      label: 'Texas title underwriter appointment rows',
      value: input.texasTitleAppointmentRows,
      valueState: 'KNOWN',
      grain: 'title_appointment_row',
      denominator: 'TDI title underwriter appointments by county (y9ze-ft94)',
      description: 'County-level title underwriter appointments. Not a general P&C appointment and not a county page.',
      coverage: 'Texas',
      contributingSourceSystems: ['texas_tdi'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One active title underwriter appointment by county.',
        'Not agency-company appointments, not agencies, not statewide authority, not a Texas county route.',
        ['texas_tdi'],
        'Texas counties in the title file; no county pages are published',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'tdi_complaint_index_rows',
      label: 'TDI complaint index rows',
      value: input.texasComplaintIndexRows,
      valueState: 'KNOWN',
      grain: 'complaint_index_row',
      denominator: 'TDI complaint index (pa9u-9s9w)',
      description: 'Native TDI complaint-index rows. Not a TrustHub score and not the complaint-name file.',
      coverage: 'Texas',
      contributingSourceSystems: ['texas_tdi'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One TDI complaint-index row (NAIC × year × line).',
        'Not complaint-name observations, not companies, not a TrustHub score, not wrongdoing.',
        ['texas_tdi'],
        'Texas',
        `TDI open data as of ${input.texasAsOf.slice(0, 10)}`
      ),
    }),
    metric({
      key: 'nfip_registry_listings',
      label: 'NFIP agency registry listings',
      value: input.floridaNfipRegistryListings,
      valueState: 'KNOWN',
      grain: 'nfip_registry_listing',
      denominator: 'FEMA/NFIP Agency Registry cards in the Florida snapshot',
      description: 'NFIP registry listing is not certification.',
      coverage: 'Florida snapshot overlay',
      contributingSourceSystems: ['nfip_agency_registry'],
      sourceAsOf: '2026-08-28',
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One NFIP Agency Registry card in the Florida inventory.',
        'Not agencies, not certification, not a flood-policy count.',
        ['nfip'],
        'Florida snapshot; NPN absent on cards',
        'FL-INS-006 NFIP census'
      ),
    }),
    metric({
      key: 'published_state_intelligence_pages',
      label: 'Published state intelligence pages',
      value: input.publishedStateIntelligencePaths.length,
      valueState: 'KNOWN',
      grain: 'published_state_intelligence_page',
      denominator: 'Indexable /florida /texas /new-jersey /california /washington publication gates',
      description: 'State intelligence routes currently published. Not an agency or company count.',
      coverage: 'FL, TX, NJ, CA, WA',
      contributingSourceSystems: ['state-intelligence-publication'],
      sourceAsOf: input.texasAsOf.slice(0, 10),
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'Published state intelligence routes.',
        'Not live researched-agency totals, not counties, not a 50-state census.',
        ['florida-intel', 'texas-intel', 'nj-intel', 'ca-intel', 'wa-intel'],
        input.publishedStateIntelligencePaths.join(', '),
        'Publication gates; Texas source clock is the newest documented official date among these pages'
      ),
    }),
    metric({
      key: 'public_legal_insurer_wave1_profiles',
      label: 'Published legal-insurer research profiles (wave 1)',
      value: input.publicLegalInsurerWave1,
      valueState: 'KNOWN',
      grain: 'public_legal_insurer_profile',
      denominator: 'INS-INSURER-006 PUBLIC_READY cohort',
      description: 'Evidence-gated public legal-insurer profiles. Not the 6,185-insurer identity spine.',
      coverage: 'Wave-1 cohort',
      contributingSourceSystems: ['legal-insurer-pilot'],
      sourceAsOf: '2026-08-29',
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One published /insurers profile in the locked 26-firm wave.',
        'Not all legal insurers, not mayPublishEntityKind(legal_insurer) which remains false.',
        ['ins-insurer-006'],
        'Selected PUBLIC_READY legal insurers',
        'INS-INSURER-006 cohort lock'
      ),
    }),
    metric({
      key: 'combined_insurance_companies',
      label: 'Combined insurance companies',
      value: null,
      valueState: 'UNKNOWN',
      grain: 'combined_incompatible_grains',
      denominator: 'Not a published denominator',
      description: 'Rejected. Agencies, producers, legal insurers, and appointing carriers are different grains.',
      coverage: 'Unsupported',
      contributingSourceSystems: [],
      sourceAsOf: null,
      generatedAt,
      publicationStatus: 'REJECTED',
      trace: commonTrace(
        'Not computed.',
        'Do not publish agencies + producers + legal insurers + carriers as one company total.',
        [],
        'None',
        'Rejected by grain contract'
      ),
    }),
  ];

  const canonical = {
    agencies: input.agencies,
    persons: input.persons,
    legalInsurers: input.legalInsurers,
    appointingCarriers: input.appointingCarriers,
    credentials: input.credentials,
    cms: input.cmsMarketplaceObservations,
    directory: input.publicDirectoryListings,
    appointedBy: input.appointedBy,
    appointedTo: input.appointedTo,
    regulatoryEvidence: input.regulatoryEvidence,
    texasFp: input.texasSnapshotFingerprint,
    texasAgencyRows: input.texasAgencyLicenseRows,
    texasAppointments: input.texasAgencyAppointments,
    texasComplaints: input.texasComplaintObservations,
    texasRates: input.texasRateFilings,
    texasSurplus: input.texasSurplusLinesRows,
    texasTitle: input.texasTitleAppointmentRows,
    floridaFp: input.floridaSnapshotFingerprint,
    floridaAgencies: input.floridaAgenciesWithFlCredential,
    floridaMc: input.floridaMarketConductExamListings,
    floridaFin: input.floridaFinancialExamListings,
    njFp: input.newJerseySnapshotFingerprint,
    njAdmitted: input.newJerseyAdmittedLegalInsurers,
    njMc: input.newJerseyMarketConductExamReports,
    njFin: input.newJerseyFinancialExamReports,
    caFp: input.californiaSnapshotFingerprint,
    caHealthList: input.californiaCdiHealthInsurerListRows,
    waFp: input.washingtonSnapshotFingerprint,
    waEntities: input.washingtonRegulatedEntitiesAnnualReport,
    paths: input.publishedStateIntelligencePaths,
    wave1: input.publicLegalInsurerWave1,
  };

  return {
    schemaVersion: INSURANCE_NETWORK_METRICS_VERSION,
    generatedAt,
    newestDocumentedSourceAsOf,
    newestDocumentedSourceAsOfNote:
      'Newest documented official source-effective date among metrics that carry a sourceAsOf. Not Git/deploy time and not a single network clock.',
    sourceFingerprint: createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    liveProductionHost: input.liveProductionHost,
    nationalGraph: {
      agencies: input.agencies,
      persons: input.persons,
      legalInsurers: input.legalInsurers,
      appointingCarriers: input.appointingCarriers,
      insuranceGroups: input.insuranceGroups,
      consumerBrands: input.consumerBrands,
      credentials: input.credentials,
      agencyCredentials: input.agencyCredentials,
      personCredentials: input.personCredentials,
      credentialsByJurisdiction: input.credentialsByJurisdiction,
      cmsMarketplaceObservations: input.cmsMarketplaceObservations,
      loaObservations: input.loaObservations,
      contactObservations: input.contactObservations,
      publicDirectoryListings: input.publicDirectoryListings,
      appointedBy: input.appointedBy,
      appointedTo: input.appointedTo,
      associatedWith: input.associatedWith,
      appointerResolvesTo: input.appointerResolvesTo,
      regulatoryEvidence: input.regulatoryEvidence,
      censusTask: input.censusTask,
      censusAsOf: input.censusAsOf,
      cohortRule:
        "national_entities.entity_kind grains stay separate; appointments, credentials, complaints, exams, rate filings, CMS, surplus-lines, and title never join the agency or legal-insurer denominators",
    },
    texas: {
      snapshotFingerprint: input.texasSnapshotFingerprint,
      asOf: input.texasAsOf,
      agencyLicenseRows: input.texasAgencyLicenseRows,
      distinctAgencyNpn: input.texasDistinctAgencyNpn,
      agencyAppointments: input.texasAgencyAppointments,
      complaintObservations: input.texasComplaintObservations,
      complaintIndexRows: input.texasComplaintIndexRows,
      rateFilings: input.texasRateFilings,
      surplusLinesRows: input.texasSurplusLinesRows,
      titleAppointmentRows: input.texasTitleAppointmentRows,
      personLicenseRowsUnpublished: input.texasPersonLicenseRowsUnpublished,
      personAppointmentsUnpublished: input.texasPersonAppointmentsUnpublished,
      authorizedCompanies: null,
      authorizedCompaniesCoverage: 'SOURCE_NOT_ACQUIRED',
    },
    florida: {
      snapshotFingerprint: input.floridaSnapshotFingerprint,
      agenciesWithFlCredential: input.floridaAgenciesWithFlCredential,
      agencyCredentialRows: input.floridaAgencyCredentialRows,
      personCredentialRows: input.floridaPersonCredentialRows,
      oirCompanyCodes: input.floridaOirCompanyCodes,
      agencyAppointedBy: input.floridaAgencyAppointedBy,
      marketConductExamListings: input.floridaMarketConductExamListings,
      financialExamListings: input.floridaFinancialExamListings,
      nfipRegistryListings: input.floridaNfipRegistryListings,
      cmsObservationsNational: input.cmsMarketplaceObservations,
    },
    newJersey: {
      snapshotFingerprint: input.newJerseySnapshotFingerprint,
      asOf: input.newJerseyAsOf,
      admittedLegalInsurers: input.newJerseyAdmittedLegalInsurers,
      surplusLinesEligible: null,
      surplusLinesCoverage: 'SOURCE_NOT_ACQUIRED',
      marketConductExamReports: input.newJerseyMarketConductExamReports,
      financialExamReports: input.newJerseyFinancialExamReports,
      enforcementEvents: input.newJerseyEnforcementEvents,
      serffFilingsDisplayed: null,
    },
    california: {
      snapshotFingerprint: input.californiaSnapshotFingerprint,
      asOf: input.californiaAsOf,
      admittedUniverse: null,
      admittedCoverage: 'SOURCE_NOT_ACQUIRED',
      cdiHealthInsurerListRows: input.californiaCdiHealthInsurerListRows,
      dmhcEnforcementRows: input.californiaDmhcEnforcementRows,
      imrRows: input.californiaImrRows,
    },
    washington: {
      snapshotFingerprint: input.washingtonSnapshotFingerprint,
      asOf: input.washingtonAsOf,
      regulatedEntitiesAnnualReport: input.washingtonRegulatedEntitiesAnnualReport,
      regulatedEntitiesCoverage: 'ANNUAL_REPORT_AGGREGATE_NOT_LIVE_ROSTER',
      producerRosterCoverage: 'SOURCE_USE_RESTRICTED / SEARCH_ONLY',
      agencyRosterCoverage: 'SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY',
      authorizedCompanies: null,
      authorizedCompaniesCoverage: 'SOURCE_NOT_ACQUIRED',
    },
    publication: {
      publicPeople: 0,
      publicGraphAgencies: 0,
      publicLegalInsurerWave1: input.publicLegalInsurerWave1,
      mayPublishPerson: false,
      mayPublishLegalInsurerKind: false,
      publishedStateIntelligencePaths: input.publishedStateIntelligencePaths,
    },
    rejectedTotals: {
      combinedInsuranceCompanies: {
        status: 'REJECTED',
        publishAsHeadline: false,
        candidateSum: input.agencies + input.persons + input.legalInsurers + input.appointingCarriers,
        reason:
          'Agencies, producers, legal insurers, and appointing-carrier rows are different grains and must not be summed as insurance companies.',
      },
      combinedIncompatibleEvidence: {
        status: 'REJECTED',
        publishAsHeadline: false,
        reason:
          'Appointments, complaints, exams, rate filings, CMS observations, surplus-lines rows, and title rows are different grains and are not a combined evidence headline.',
      },
    },
    metrics,
  };
}
