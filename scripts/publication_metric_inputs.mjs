/**
 * Parse publication/config sources the Insurance network rollup must track.
 * A new live state intelligence page or Texas/Florida/CMS/complaint/exam/rate-filing
 * snapshot change fails CI until insurance-network-metrics-v1 is regenerated.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

export function publicationMetricInputs() {
  const txPub = read("lib/texas-intelligence/publication.ts");
  const caPub = read("lib/california-intelligence/publication.ts");
  const waPub = read("lib/washington-intelligence/publication.ts");
  const njPub = read("lib/new-jersey-intelligence/publication.ts");
  const flPub = read("lib/national/fl-state-intel.ts");
  const tx = readJson("lib/texas-intelligence/accepted-snapshot.json");
  const ca = readJson("lib/california-intelligence/accepted-snapshot.json");
  const wa = readJson("lib/washington-intelligence/accepted-snapshot.json");
  const nj = readJson("lib/new-jersey-intelligence/accepted-snapshot.json");
  const fl = readJson("data/reports/fl-ins-006-state-snapshot.json");
  const flMc = readJson("data/reports/fl-ins-004-market-exam-census.json");
  const flFin = readJson("data/reports/fl-ins-004-financial-exam-census.json");
  const census = readJson("data/reports/ins-nat-final-006-census.json");
  const insurer = readJson("data/reports/ins-insurer-001-census.json");
  const cms = read("lib/national/cms-marketplace.ts");

  const paths = [];
  if (flPub.includes("FLORIDA_ROUTE = '/florida'") && existsSync(join(root, "app/florida/page.tsx"))) {
    paths.push("/florida");
  }
  const txPath = txPub.match(/path: '(\/[^']+)'/)?.[1];
  const njPath = njPub.match(/path: '(\/[^']+)'/)?.[1];
  const caPath = caPub.match(/path: '(\/[^']+)'/)?.[1];
  const waPath = waPub.match(/path: '(\/[^']+)'/)?.[1];
  if (txPath && existsSync(join(root, "app/texas/page.tsx"))) paths.push(txPath);
  if (njPath && existsSync(join(root, "app/new-jersey/page.tsx"))) paths.push(njPath);
  if (caPath && existsSync(join(root, "app/california/page.tsx"))) paths.push(caPath);
  if (waPath && existsSync(join(root, "app/washington/page.tsx"))) paths.push(waPath);

  const cmsSourceAsOf = cms.match(/modified: '([^']+)'/)?.[1]?.slice(0, 10) || "2026-08-21";
  const flFp = flPub.match(/CANONICAL_SNAPSHOT_FINGERPRINT =\s*'([a-f0-9]{64})'/)?.[1];
  const txFp = txPub.match(/CANONICAL_TX_SNAPSHOT_FINGERPRINT =\s*'([a-f0-9]{64})'/)?.[1];
  const njFp = njPub.match(/CANONICAL_NJ_SNAPSHOT_FINGERPRINT =\s*'([a-f0-9]{64})'/)?.[1];
  const caFp = caPub.match(/CANONICAL_CA_SNAPSHOT_FINGERPRINT =\s*'([a-f0-9]{64})'/)?.[1];

  return {
    publishedStateIntelligencePaths: paths,
    texasSnapshotFingerprint: tx.fingerprint,
    texasPublicationFingerprint: txFp,
    texasAsOf: tx.as_of,
    texasAgencyLicenseRows: tx.agencies.rows,
    texasDistinctAgencyNpn: tx.agencies.distinct_npn,
    texasAgencyAppointments: tx.appointments.rows,
    texasComplaintObservations: tx.complaints.rows,
    texasComplaintIndexRows: tx.complaint_index.rows,
    texasRateFilings: tx.rate_filings.rows,
    texasSurplusLinesRows: tx.surplus.rows,
    texasTitleAppointmentRows: tx.title.rows,
    texasPersonLicenseRowsUnpublished: tx.person_licenses.rows,
    texasPersonAppointmentsUnpublished: tx.person_appointments.rows,
    texasAuthorizedCompanies: tx.authorized_companies.count,
    floridaSnapshotFingerprint: flFp,
    floridaAgenciesWithFlCredential: fl.agencyMetrics.distinct_agencies_with_fl_credential,
    floridaAgencyCredentialRows: fl.credentialMetrics.fl_agency_rows,
    floridaPersonCredentialRows: fl.credentialMetrics.fl_person_rows,
    floridaOirCompanyCodes: fl.headlineMetrics.fl_oir_company_code,
    floridaAgencyAppointedBy: fl.headlineMetrics.appointed_by,
    floridaMarketConductExamListings: flMc.reports,
    floridaFinancialExamListings: flFin.reports,
    floridaNfipRegistryListings: 1474,
    newJerseySnapshotFingerprint: nj.fingerprint,
    newJerseyPublicationFingerprint: njFp,
    newJerseyAsOf: nj.as_of,
    newJerseyAdmittedLegalInsurers: nj.authorization.admitted,
    newJerseySurplusLinesEligible: nj.authorization.surplus_lines_eligible,
    newJerseyMarketConductExamReports: nj.market_conduct.reports,
    newJerseyFinancialExamReports: nj.financial_exams.reports,
    newJerseyEnforcementEvents: nj.enforcement.events,
    californiaSnapshotFingerprint: ca.fingerprint || caFp,
    californiaAsOf: ca.as_of,
    californiaAdmittedUniverse: ca.cdi_admitted.complete_count,
    californiaCdiHealthInsurerListRows: ca.cdi_health_list.companies.length,
    californiaDmhcEnforcementRows: ca.enforcement.rows,
    californiaImrRows: ca.imr.rows,
    washingtonSnapshotFingerprint: wa.fingerprint,
    washingtonAsOf: wa.as_of,
    washingtonRegulatedEntities: wa.annual_aggregates.regulated_entities,
    censusTask: census.task,
    censusAsOf: census.at,
    censusAgencies: census.entities.agency,
    censusPersons: census.entities.person,
    censusLegalInsurers: census.entities.legalInsurer,
    insurerCarrierKind: insurer.grains.carrier,
    cmsSourceAsOf,
    publicLegalInsurerWave1: 26,
  };
}
