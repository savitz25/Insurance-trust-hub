import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  computeInsuranceNetworkMetrics,
  type InsuranceNetworkMetricsInput,
} from '../lib/metrics/compute-insurance-network-metrics';
import { metricByKey, requiredPublicKeys } from '../lib/metrics/insurance-network-metrics-v1';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function baseInput(over: Partial<InsuranceNetworkMetricsInput> = {}): InsuranceNetworkMetricsInput {
  return {
    generatedAt: '2026-09-03T22:00:00.000Z',
    liveProductionHost: 'example.supabase.co',
    agencies: 82071,
    persons: 1029860,
    legalInsurers: 6185,
    appointingCarriers: 13547,
    insuranceGroups: 720,
    consumerBrands: 14,
    credentials: 1531158,
    agencyCredentials: 117354,
    personCredentials: 1413804,
    credentialsByJurisdiction: { FL: 750316, TX: 718894, VT: 50514, MA: 7187, OH: 4247, NJ: 0, CA: 0 },
    cmsMarketplaceObservations: 1300108,
    loaObservations: 1791158,
    contactObservations: 144864,
    publicDirectoryListings: 170499,
    appointedBy: 2680,
    appointedTo: 7334179,
    associatedWith: 52827,
    appointerResolvesTo: 1510,
    regulatoryEvidence: 6004,
    censusTask: 'INS-NAT-FINAL-006',
    censusAsOf: '2026-08-28T14:43:51.753Z',
    cmsSourceAsOf: '2026-08-21',
    texasSnapshotFingerprint: '3be93a9cd2b1ab7edada6c783ccfbfd7a5723589920fee1524601e9218c76319',
    texasAsOf: '2026-09-03',
    texasAgencyLicenseRows: 56625,
    texasDistinctAgencyNpn: 43597,
    texasAgencyAppointments: 622019,
    texasComplaintObservations: 305156,
    texasComplaintIndexRows: 5966,
    texasRateFilings: 18001,
    texasSurplusLinesRows: 18816,
    texasTitleAppointmentRows: 23115,
    texasPersonLicenseRowsUnpublished: 962001,
    texasPersonAppointmentsUnpublished: 4400210,
    floridaSnapshotFingerprint: '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93',
    floridaAgenciesWithFlCredential: 56939,
    floridaAgencyCredentialRows: 59189,
    floridaPersonCredentialRows: 691127,
    floridaOirCompanyCodes: 1897,
    floridaAgencyAppointedBy: 2680,
    floridaMarketConductExamListings: 1007,
    floridaFinancialExamListings: 1060,
    floridaNfipRegistryListings: 1474,
    newJerseySnapshotFingerprint: 'bcab35631a0494038667647244863a9510f5c76a36495fd14217bb0afd2a59e5',
    newJerseyAsOf: '2026-09-02',
    newJerseyAdmittedLegalInsurers: 1370,
    newJerseyMarketConductExamReports: 93,
    newJerseyFinancialExamReports: 129,
    newJerseyEnforcementEvents: 3821,
    californiaSnapshotFingerprint: 'dc1eb54c514def4663c33551ee6835a41f38349f8fcfae2647e514cd7711f468',
    californiaAsOf: '2026-06-01',
    californiaCdiHealthInsurerListRows: 28,
    californiaDmhcEnforcementRows: 5435,
    californiaImrRows: 42749,
    publicLegalInsurerWave1: 26,
    ingestedExamObservations: 26,
    publishedStateIntelligencePaths: ['/florida', '/texas', '/new-jersey', '/california'],
    ...over,
  };
}

describe('insurance-network-metrics-v1 grain safety — 13 forbidden mixes', () => {
  it('1 agency != producer', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'insurance_agencies').value, metricByKey(m, 'insurance_producer_records').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ agencies: 1029860 })), /agency must not equal producer/);
  });

  it('2 agency != legal insurer/carrier', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'insurance_agencies').value, metricByKey(m, 'licensed_insurance_companies').value);
    assert.notEqual(metricByKey(m, 'insurance_agencies').value, metricByKey(m, 'appointing_carrier_entities').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ agencies: 6185 })), /agency must not equal legal insurer/);
  });

  it('3 producer != legal insurer', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'insurance_producer_records').value, metricByKey(m, 'licensed_insurance_companies').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ persons: 6185, agencies: 1 })), /producer must not equal legal insurer/);
  });

  it('4 appointment != agency', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'appointments').value, metricByKey(m, 'insurance_agencies').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ texasAgencyAppointments: 82071 })), /appointments must not equal agencies/);
  });

  it('5 appointment != producer', () => {
    assert.throws(
      () => computeInsuranceNetworkMetrics(baseInput({ texasAgencyAppointments: 1029860, agencies: 1 })),
      /appointments must not equal producers/
    );
  });

  it('6 appointment != legal insurer', () => {
    assert.throws(
      () => computeInsuranceNetworkMetrics(baseInput({ texasAgencyAppointments: 6185, agencies: 1, persons: 2 })),
      /appointments must not equal legal insurers/
    );
  });

  it('7 license/credential != agency', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'credential_observations').value, metricByKey(m, 'insurance_agencies').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ credentials: 82071, agencyCredentials: 0, personCredentials: 82071 })), /credentials must not equal agencies/);
  });

  it('8 title entity/branch appointment != agency and != P&C appointment', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'texas_title_appointment_rows').value, metricByKey(m, 'insurance_agencies').value);
    assert.notEqual(metricByKey(m, 'texas_title_appointment_rows').value, metricByKey(m, 'appointments').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ texasTitleAppointmentRows: 82071 })), /title appointments must not equal agencies/);
  });

  it('9 CMS marketplace observation != plans/companies/agencies/people', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'cms_marketplace_evidence_observations').value, metricByKey(m, 'licensed_insurance_companies').value);
    assert.notEqual(metricByKey(m, 'cms_marketplace_evidence_observations').value, metricByKey(m, 'insurance_agencies').value);
    assert.notEqual(metricByKey(m, 'cms_marketplace_evidence_observations').value, metricByKey(m, 'insurance_producer_records').value);
    assert.match(metricByKey(m, 'cms_marketplace_evidence_observations').trace.doesNotCount, /not a plan count/i);
  });

  it('10 rate filing != company', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'rate_filing_observations').value, metricByKey(m, 'licensed_insurance_companies').value);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ texasRateFilings: 6185 })), /rate filings must not equal companies/);
  });

  it('11 market conduct exam != financial exam', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'market_conduct_examinations').value, metricByKey(m, 'florida_financial_examinations').value);
    assert.throws(
      () => computeInsuranceNetworkMetrics(baseInput({ floridaMarketConductExamListings: 1060 })),
      /market conduct exams must not equal financial exams/
    );
  });

  it('12 complaint != company and complaint != wrongdoing', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'consumer_complaint_observations').value, metricByKey(m, 'licensed_insurance_companies').value);
    assert.match(metricByKey(m, 'consumer_complaint_observations').trace.doesNotCount, /not proof of wrongdoing/i);
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ texasComplaintObservations: 6185 })), /complaints must not equal companies/);
  });

  it('13 surplus-lines observation != agency and != legal insurer', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.notEqual(metricByKey(m, 'texas_surplus_lines_observations').value, metricByKey(m, 'insurance_agencies').value);
    assert.notEqual(metricByKey(m, 'texas_surplus_lines_observations').value, metricByKey(m, 'licensed_insurance_companies').value);
    assert.equal(metricByKey(m, 'nj_surplus_lines_eligible_companies').value, null);
    assert.equal(metricByKey(m, 'nj_surplus_lines_eligible_companies').valueState, 'NOT_ACQUIRED');
  });
});

describe('missing is not zero; generatedAt is not sourceAsOf', () => {
  it('does not convert unacquired Texas authorized companies or CA admitted universe to zero', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.equal(metricByKey(m, 'texas_authorized_companies').value, null);
    assert.equal(metricByKey(m, 'ca_admitted_insurer_universe').value, null);
    assert.match(metricByKey(m, 'texas_authorized_companies').trace.whyUnknown ?? '', /never render as zero/i);
    assert.match(metricByKey(m, 'ca_admitted_insurer_universe').trace.whyUnknown ?? '', /never render as zero/i);
  });

  it('does not replace sourceAsOf with generatedAt', () => {
    const m = computeInsuranceNetworkMetrics(baseInput({ generatedAt: '2026-09-03T22:00:00.000Z' }));
    assert.equal(metricByKey(m, 'appointments').sourceAsOf, '2026-09-03');
    assert.equal(metricByKey(m, 'cms_marketplace_evidence_observations').sourceAsOf, '2026-08-21');
    assert.notEqual(metricByKey(m, 'cms_marketplace_evidence_observations').sourceAsOf, m.generatedAt.slice(0, 10));
    assert.equal(m.newestDocumentedSourceAsOf, '2026-09-03');
  });

  it('keeps public labels on the required consumer-facing keys', () => {
    const m = computeInsuranceNetworkMetrics(baseInput());
    const labels = Object.fromEntries(requiredPublicKeys().map((k) => [k, metricByKey(m, k).label]));
    assert.equal(labels.insurance_agencies, 'Insurance agencies');
    assert.equal(labels.licensed_insurance_companies, 'Licensed insurance companies');
    assert.equal(labels.insurance_producer_records, 'Insurance producer records');
    assert.equal(labels.appointments, 'Appointments');
    assert.equal(labels.consumer_complaint_observations, 'Consumer complaint observations');
    assert.equal(labels.market_conduct_examinations, 'Market conduct examinations');
    assert.equal(labels.rate_filing_observations, 'Rate filing observations');
    assert.equal(labels.cms_marketplace_evidence_observations, 'CMS Marketplace evidence observations');
  });

  it('rejects mixing NFIP registry listings into agencies and county title rows into statewide appointments', () => {
    assert.throws(() => computeInsuranceNetworkMetrics(baseInput({ floridaNfipRegistryListings: 82071 })), /NFIP/);
    const m = computeInsuranceNetworkMetrics(baseInput());
    assert.match(metricByKey(m, 'texas_title_appointment_rows').trace.doesNotCount, /not statewide authority/i);
  });
});

describe('checked-in manifest vs homepage wiring', () => {
  it('keeps homepage consumers on the v1 artifact path', () => {
    const page = readFileSync(join(root, 'app/page.tsx'), 'utf8');
    const load = readFileSync(join(root, 'lib/national/load-home-intel.ts'), 'utf8');
    assert.match(page, /loadInsuranceNetworkMetrics|projectHomeIntelFromNetworkMetrics/);
    assert.match(load, /insurance-network-metrics-v1|projectHomeIntelFromNetworkMetrics|loadInsuranceNetworkMetrics/);
  });
});
