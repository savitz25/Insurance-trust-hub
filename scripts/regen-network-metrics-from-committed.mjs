/**
 * Rebuild insurance-network-metrics-v1.json from committed national counts
 * plus current publication inputs. Does not recount the live graph.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const existing = JSON.parse(
  (await import("node:fs")).readFileSync(join(root, "data/home/insurance-network-metrics-v1.json"), "utf8")
);
const { computeInsuranceNetworkMetrics } = await import(
  pathToFileURL(join(root, "lib/metrics/compute-insurance-network-metrics.ts")).href
);
const pub = publicationMetricInputs();
const g = existing.nationalGraph;

const manifest = computeInsuranceNetworkMetrics({
  generatedAt: "2026-09-09T12:00:00.000Z",
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
  censusAsOf: pub.censusAsOf,
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
  publicLegalInsurerWave1: pub.publicLegalInsurerWave1,
  ingestedExamObservations: 26,
  publishedStateIntelligencePaths: pub.publishedStateIntelligencePaths,
});

writeFileSync(join(root, "data/home/insurance-network-metrics-v1.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  wrote: "data/home/insurance-network-metrics-v1.json",
  sourceFingerprint: manifest.sourceFingerprint,
  generatedAt: manifest.generatedAt,
  newestDocumentedSourceAsOf: manifest.newestDocumentedSourceAsOf,
  paths: manifest.publication.publishedStateIntelligencePaths,
  agencies: manifest.nationalGraph.agencies,
  legalInsurers: manifest.nationalGraph.legalInsurers,
  persons: manifest.nationalGraph.persons,
}, null, 2));
