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
  const coPub = read("lib/colorado-intelligence/publication.ts");
  const vaPub = read("lib/virginia-intelligence/publication.ts");
  const nyPub = read("lib/new-york-intelligence/publication.ts");
  const ilPub = read("lib/illinois-intelligence/publication.ts");
  const orPub = read("lib/oregon-intelligence/publication.ts");
  const paPub = read("lib/pennsylvania-intelligence/publication.ts");
  const ncPub = read("lib/north-carolina-intelligence/publication.ts");
  const ohPub = read("lib/ohio-intelligence/publication.ts");
  const gaPub = read("lib/georgia-intelligence/publication.ts");
  const maPub = read("lib/massachusetts-intelligence/publication.ts");
  const tnPub = read("lib/tennessee-intelligence/publication.ts");
  const nvPub = read("lib/nevada-intelligence/publication.ts");
  const mnPub = read("lib/minnesota-intelligence/publication.ts");
  const njPub = read("lib/new-jersey-intelligence/publication.ts");
  const flPub = read("lib/national/fl-state-intel.ts");
  const tx = readJson("lib/texas-intelligence/accepted-snapshot.json");
  const ca = readJson("lib/california-intelligence/accepted-snapshot.json");
  const wa = readJson("lib/washington-intelligence/accepted-snapshot.json");
  const co = readJson("lib/colorado-intelligence/accepted-snapshot.json");
  const va = readJson("lib/virginia-intelligence/accepted-snapshot.json");
  const ny = readJson("lib/new-york-intelligence/accepted-snapshot.json");
  const il = readJson("lib/illinois-intelligence/accepted-snapshot.json");
  const or = readJson("lib/oregon-intelligence/accepted-snapshot.json");
  const pa = readJson("lib/pennsylvania-intelligence/accepted-snapshot.json");
  const nc = readJson("lib/north-carolina-intelligence/accepted-snapshot.json");
  const oh = readJson("lib/ohio-intelligence/accepted-snapshot.json");
  const ma = readJson("lib/massachusetts-intelligence/accepted-snapshot.json");
  const tn = readJson("lib/tennessee-intelligence/accepted-snapshot.json");
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
  const coPath = coPub.match(/path: '(\/[^']+)'/)?.[1];
  const vaPath = vaPub.match(/path: '(\/[^']+)'/)?.[1];
  const nyPath = nyPub.match(/path: '(\/[^']+)'/)?.[1];
  const ilPath = ilPub.match(/path: '(\/[^']+)'/)?.[1];
  const orPath = orPub.match(/path: '(\/[^']+)'/)?.[1];
  const paPath = paPub.match(/path: '(\/[^']+)'/)?.[1];
  const ncPath = ncPub.match(/path: '(\/[^']+)'/)?.[1];
  const ohPath = ohPub.match(/path: '(\/[^']+)'/)?.[1];
  const gaPath = gaPub.match(/path: '(\/[^']+)'/)?.[1];
  const maPath = maPub.match(/path: '(\/[^']+)'/)?.[1];
  const tnPath = tnPub.match(/path: '(\/[^']+)'/)?.[1];
  const nvPath = nvPub.match(/path: '(\/[^']+)'/)?.[1];
  const mnPath = mnPub.match(/path: '(\/[^']+)'/)?.[1];
  if (txPath && existsSync(join(root, "app/texas/page.tsx"))) paths.push(txPath);
  if (njPath && existsSync(join(root, "app/new-jersey/page.tsx"))) paths.push(njPath);
  if (caPath && existsSync(join(root, "app/california/page.tsx"))) paths.push(caPath);
  if (waPath && existsSync(join(root, "app/washington/page.tsx"))) paths.push(waPath);
  if (coPath && existsSync(join(root, "app/colorado/page.tsx"))) paths.push(coPath);
  if (vaPath && existsSync(join(root, "app/virginia/page.tsx"))) paths.push(vaPath);
  if (nyPath && existsSync(join(root, "app/new-york/page.tsx"))) paths.push(nyPath);
  if (ilPath && existsSync(join(root, "app/illinois/page.tsx"))) paths.push(ilPath);
  if (orPath && existsSync(join(root, "app/oregon/page.tsx"))) paths.push(orPath);
  if (paPath && existsSync(join(root, "app/pennsylvania/page.tsx"))) paths.push(paPath);
  if (ncPath && existsSync(join(root, "app/north-carolina/page.tsx"))) paths.push(ncPath);
  if (ohPath && existsSync(join(root, "app/ohio/page.tsx"))) paths.push(ohPath);
  if (gaPath && existsSync(join(root, "app/georgia/page.tsx"))) paths.push(gaPath);
  if (maPath && existsSync(join(root, "app/massachusetts/page.tsx"))) paths.push(maPath);
  if (tnPath && existsSync(join(root, "app/tennessee/page.tsx"))) paths.push(tnPath);
  if (nvPath && existsSync(join(root, "app/nevada/page.tsx"))) paths.push(nvPath);
  if (mnPath && existsSync(join(root, "app/minnesota/page.tsx"))) paths.push(mnPath);

  const cmsSourceAsOf = cms.match(/modified: '([^']+)'/)?.[1]?.slice(0, 10) ;
  if (!cmsSourceAsOf) throw new Error("Missing CMS source clock");
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
    floridaNfipRegistryListings: fl.nfip.registry_cards,
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
    coloradoSnapshotFingerprint: co.fingerprint,
    coloradoAsOf: co.as_of,
    coloradoStatisticalDirectoryRows: co.statistical_report.naic_companies_tab.company_directory_rows,
    coloradoSurplusLinesEligibleIdentities: co.surplus_lines.eligible_identities,
    virginiaSnapshotFingerprint: va.fingerprint,
    virginiaAsOf: va.period_end,
    virginiaStatisticalDirectoryRows: va.statistical_report.distinct_naic,
    newYorkSnapshotFingerprint: ny.fingerprint,
    newYorkAsOf: ny.snapshot_as_of,
    newYorkDirectoryRows: ny.company_directory.directory_rows,
    illinoisSnapshotFingerprint: il.fingerprint,
    illinoisAsOf: il.snapshot_as_of,
    illinoisDirectorsOrderObservations: il.directors_orders.observation_rows,
    oregonSnapshotFingerprint: or.fingerprint,
    oregonAsOf: or.snapshot_as_of,
    oregonDfrInsuranceOrderDocuments: or.dfr_orders.document_rows,
    oregonComplaintTableRows: or.complaints.row_total,
    pennsylvaniaSnapshotFingerprint: pa.fingerprint,
    pennsylvaniaAsOf: pa.company_lookup.source_as_of,
    pennsylvaniaLicensedCompaniesDistinctNaic: pa.company_lookup.distinct_naic,
    pennsylvaniaEnforcementActions: pa.enforcement.enforcement_actions,
    pennsylvaniaComplaintTableRows: pa.complaints.row_total,
    northCarolinaSnapshotFingerprint: nc.fingerprint,
    northCarolinaAsOf: nc.retrieved_at,
    northCarolinaLicensingActionRows: nc.licensing_actions.document_rows,
    ohioSnapshotFingerprint: oh.fingerprint,
    ohioAsOf: oh.source_as_of,
    ohioAuthorizedCompaniesDistinctNaic: oh.authorized_companies.distinct_naic,
    massachusettsSnapshotFingerprint: ma.fingerprint,
    massachusettsAsOf: ma.source_as_of,
    massachusettsLicensedOrApprovedDistinctNaic: ma.licensed_or_approved.distinct_naic,
    tennesseeSnapshotFingerprint: tn.fingerprint,
    tennesseeAsOf: tn.source_as_of,
    tennesseeLicensedCompaniesDistinctNaic: tn.licensed_companies.distinct_naic,
    censusTask: census.task,
    censusAsOf: census.at,
    censusAgencies: census.entities.agency,
    censusPersons: census.entities.person,
    censusLegalInsurers: census.entities.legalInsurer,
    insurerCarrierKind: insurer.grains.carrier,
    cmsSourceAsOf,
    publicLegalInsurerWave1: readJson("data/reports/ins-insurer-005b-public-ready-cohort.json").cohort_size,
  };
}
