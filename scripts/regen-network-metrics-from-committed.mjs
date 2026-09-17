/**
 * Rebuild insurance-network-metrics-v1.json from committed national counts
 * plus current publication inputs. Does not recount the live graph.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const existing = JSON.parse(readFileSync(join(root, "data/home/insurance-metric-census-r2-04.json"), "utf8"));
const check = process.argv.includes("--check");
const out = join(root, "data/home/insurance-network-metrics-v1.json");
const generatedAt = check ? JSON.parse(readFileSync(out, "utf8")).generatedAt : new Date().toISOString();
const { computeInsuranceNetworkMetrics } = await import(
  pathToFileURL(join(root, "lib/metrics/compute-insurance-network-metrics.ts")).href
);
const pub = publicationMetricInputs();
const g = existing.nationalGraph;

const manifest = computeInsuranceNetworkMetrics({
  generatedAt,
  liveProductionHost: existing.liveProductionHost,
  agencies: g.agencies,
  persons: g.persons,
  legalInsurers: g.legalInsurers,
  appointingCarriers: g.appointingCarriers,
  insuranceGroups: g.insuranceGroups,
  consumerBrands: g.consumerBrands,
  credentials: g.credentials,
  agencyCredentials: g.agencyCredentials,
  personCredentials: g.personCredentials,
  credentialsByJurisdiction: g.credentialsByJurisdiction,
  cmsMarketplaceObservations: g.cmsMarketplaceObservations,
  loaObservations: g.loaObservations,
  contactObservations: g.contactObservations,
  publicDirectoryListings: g.publicDirectoryListings,
  appointedBy: g.appointedBy,
  appointedTo: g.appointedTo,
  associatedWith: g.associatedWith,
  appointerResolvesTo: g.appointerResolvesTo,
  regulatoryEvidence: g.regulatoryEvidence,
  censusTask: pub.censusTask,
  censusAsOf: existing.retrievedAt,
  cmsSourceAsOf: pub.cmsSourceAsOf,
  texasSnapshotFingerprint: pub.texasSnapshotFingerprint,
  texasAsOf: pub.texasAsOf,
  texasAgencyLicenseRows: pub.texasAgencyLicenseRows,
  texasDistinctAgencyNpn: pub.texasDistinctAgencyNpn,
  texasAgencyAppointments: pub.texasAgencyAppointments,
  texasComplaintObservations: pub.texasComplaintObservations,
  texasComplaintIndexRows: pub.texasComplaintIndexRows,
  texasRateFilings: pub.texasRateFilings,
  texasSurplusLinesRows: pub.texasSurplusLinesRows,
  texasTitleAppointmentRows: pub.texasTitleAppointmentRows,
  texasPersonLicenseRowsUnpublished: pub.texasPersonLicenseRowsUnpublished,
  texasPersonAppointmentsUnpublished: pub.texasPersonAppointmentsUnpublished,
  floridaSnapshotFingerprint: pub.floridaSnapshotFingerprint,
  floridaAgenciesWithFlCredential: pub.floridaAgenciesWithFlCredential,
  floridaAgencyCredentialRows: pub.floridaAgencyCredentialRows,
  floridaPersonCredentialRows: pub.floridaPersonCredentialRows,
  floridaOirCompanyCodes: pub.floridaOirCompanyCodes,
  floridaAgencyAppointedBy: pub.floridaAgencyAppointedBy,
  floridaMarketConductExamListings: pub.floridaMarketConductExamListings,
  floridaFinancialExamListings: pub.floridaFinancialExamListings,
  floridaNfipRegistryListings: pub.floridaNfipRegistryListings,
  newJerseySnapshotFingerprint: pub.newJerseySnapshotFingerprint,
  newJerseyAsOf: pub.newJerseyAsOf,
  newJerseyAdmittedLegalInsurers: pub.newJerseyAdmittedLegalInsurers,
  newJerseyMarketConductExamReports: pub.newJerseyMarketConductExamReports,
  newJerseyFinancialExamReports: pub.newJerseyFinancialExamReports,
  newJerseyEnforcementEvents: pub.newJerseyEnforcementEvents,
  californiaSnapshotFingerprint: pub.californiaSnapshotFingerprint,
  californiaAsOf: pub.californiaAsOf,
  californiaCdiHealthInsurerListRows: pub.californiaCdiHealthInsurerListRows,
  californiaDmhcEnforcementRows: pub.californiaDmhcEnforcementRows,
  californiaImrRows: pub.californiaImrRows,
  washingtonSnapshotFingerprint: pub.washingtonSnapshotFingerprint,
  washingtonAsOf: pub.washingtonAsOf,
  washingtonRegulatedEntitiesAnnualReport: pub.washingtonRegulatedEntities,
  coloradoSnapshotFingerprint: pub.coloradoSnapshotFingerprint,
  coloradoAsOf: pub.coloradoAsOf,
  coloradoStatisticalDirectoryRows: pub.coloradoStatisticalDirectoryRows,
  coloradoSurplusLinesEligibleIdentities: pub.coloradoSurplusLinesEligibleIdentities,
  virginiaSnapshotFingerprint: pub.virginiaSnapshotFingerprint,
  virginiaAsOf: pub.virginiaAsOf,
  virginiaStatisticalDirectoryRows: pub.virginiaStatisticalDirectoryRows,
  newYorkSnapshotFingerprint: pub.newYorkSnapshotFingerprint,
  newYorkAsOf: pub.newYorkAsOf,
  newYorkDirectoryRows: pub.newYorkDirectoryRows,
  illinoisSnapshotFingerprint: pub.illinoisSnapshotFingerprint,
  illinoisAsOf: pub.illinoisAsOf,
  illinoisDirectorsOrderObservations: pub.illinoisDirectorsOrderObservations,
  oregonSnapshotFingerprint: pub.oregonSnapshotFingerprint,
  oregonAsOf: pub.oregonAsOf,
  oregonDfrInsuranceOrderDocuments: pub.oregonDfrInsuranceOrderDocuments,
  oregonComplaintTableRows: pub.oregonComplaintTableRows,
  publicLegalInsurerWave1: pub.publicLegalInsurerWave1,
  ingestedExamObservations: pub.publicLegalInsurerWave1,
  publishedStateIntelligencePaths: pub.publishedStateIntelligencePaths,
});

const { reconcile } = await import("./reconcile-network-metrics-r2-04.mjs");
reconcile(manifest, root, existing);
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (check) {
  if (readFileSync(out, "utf8").replace(/\r\n/g, "\n") !== serialized) throw new Error("Network metric drift: regenerate with npm run home:metrics");
} else writeFileSync(out, serialized);
console.log(JSON.stringify({check, generatedAt, sourceFingerprint:manifest.sourceFingerprint, agencies:manifest.nationalGraph.agencies, legalInsurers:manifest.nationalGraph.legalInsurers}));
