/**
 * Build insurance-network-metrics-v1 from production graph counts + specialist snapshots.
 * Does not mix grains. Does not invent unacquired universes as zero.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(p) {
  if (!existsSync(p)) return false;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
  return true;
}

loadEnv(join(root, ".env.local"));
loadEnv("C:\\Users\\makei\\insurance-trust-hub\\.env.local");
loadEnv("C:\\Users\\makei\\insurance-trust-hub-prod-release\\.env.local");

async function restCount(base, key, table, query = "", attempts = 4) {
  const url = `${base}/rest/v1/${table}?select=id${query ? `&${query}` : ""}`;
  let last = "unknown";
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
        Range: "0-0",
        "Range-Unit": "items",
      },
    });
    const t = await res.text();
    if (res.ok || res.status === 206 || res.status === 416) {
      const tail = (res.headers.get("content-range") || "").split("/")[1];
      return tail && tail !== "*" ? Number(tail) : 0;
    }
    last = `${table} ${query} ${res.status} ${t.slice(0, 180)}`;
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error(last);
}

async function main() {
  const { computeInsuranceNetworkMetrics } = await import(
    pathToFileURL(join(root, "lib/metrics/compute-insurance-network-metrics.ts")).href
  );
  const pub = publicationMetricInputs();
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error("Supabase URL/key missing — cannot generate from production");

  const c = (table, q = "") => restCount(base, key, table, q);
  const agencies = await c("national_entities", "entity_kind=eq.agency");
  const persons = await c("national_entities", "entity_kind=eq.person");
  const legalInsurers = await c("national_entities", "entity_kind=eq.legal_insurer");
  const appointingCarriers = await c("national_entities", "entity_kind=eq.carrier");
  const insuranceGroups = await c("national_entities", "entity_kind=eq.insurance_group");
  const consumerBrands = await c("national_entities", "entity_kind=eq.consumer_brand");
  const credentials = await c("license_credentials");
  const agencyCredentials = await c("license_credentials", "entity_kind=eq.agency");
  const personCredentials = await c("license_credentials", "entity_kind=eq.person");
  const flCreds = await c("license_credentials", "jurisdiction=eq.FL");
  const txCreds = await c("license_credentials", "jurisdiction=eq.TX");
  const vtCreds = await c("license_credentials", "jurisdiction=eq.VT");
  const maCreds = await c("license_credentials", "jurisdiction=eq.MA");
  const ohCreds = await c("license_credentials", "jurisdiction=eq.OH");
  const njCreds = await c("license_credentials", "jurisdiction=eq.NJ");
  const caCreds = await c("license_credentials", "jurisdiction=eq.CA");
  const cmsMarketplaceObservations = await c("cms_marketplace_observations");
  const loaObservations = await c("loa_observations");
  const contactObservations = await c("contact_observations");
  const publicDirectoryListings = await c("providers");
  const appointedBy = await c("national_relationships", "relationship_type=eq.appointed_by");
  const appointedTo = await c("national_relationships", "relationship_type=eq.APPOINTED_TO");
  const associatedWith = await c("national_relationships", "relationship_type=eq.ASSOCIATED_WITH");
  const appointerResolvesTo = await c("national_relationships", "relationship_type=eq.APPOINTER_RESOLVES_TO");
  const regulatoryEvidence = await c("regulatory_evidence");

  const input = {
    generatedAt: new Date().toISOString(),
    liveProductionHost: new URL(base).host,
    agencies,
    persons,
    legalInsurers,
    appointingCarriers,
    insuranceGroups,
    consumerBrands,
    credentials,
    agencyCredentials,
    personCredentials,
    credentialsByJurisdiction: { FL: flCreds, TX: txCreds, VT: vtCreds, MA: maCreds, OH: ohCreds, NJ: njCreds, CA: caCreds },
    cmsMarketplaceObservations,
    loaObservations,
    contactObservations,
    publicDirectoryListings,
    appointedBy,
    appointedTo,
    associatedWith,
    appointerResolvesTo,
    regulatoryEvidence,
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
    publicLegalInsurerWave1: pub.publicLegalInsurerWave1,
    ingestedExamObservations: 26,
    publishedStateIntelligencePaths: pub.publishedStateIntelligencePaths,
  };

  const manifest = computeInsuranceNetworkMetrics(input);
  const outDir = join(root, "data/home");
  mkdirSync(outDir, { recursive: true });
  const outV1 = join(outDir, "insurance-network-metrics-v1.json");
  writeFileSync(outV1, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        wrote: "data/home/insurance-network-metrics-v1.json",
        fingerprint: manifest.sourceFingerprint,
        generatedAt: manifest.generatedAt,
        newestDocumentedSourceAsOf: manifest.newestDocumentedSourceAsOf,
        agencies,
        legalInsurers,
        persons,
        cms: cmsMarketplaceObservations,
        texasAppointments: pub.texasAgencyAppointments,
        host: new URL(base).host,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
