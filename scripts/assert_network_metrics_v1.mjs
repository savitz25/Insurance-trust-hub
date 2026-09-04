/**
 * ATH-METRICS-003B grain / staleness gates.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const failures = [];
const assert = (c, m) => {
  if (!c) failures.push(m);
};

const v1 = JSON.parse(read("data/home/insurance-network-metrics-v1.json"));
const byKey = Object.fromEntries(v1.metrics.map((m) => [m.key, m]));
const pub = publicationMetricInputs();
const hero = read("components/home/insurance-home-intelligence.tsx");
const page = read("app/page.tsx");
const load = read("lib/national/load-home-intel.ts");

assert(v1.schemaVersion === "insurance-network-metrics-v1", "schema");
assert(typeof v1.sourceFingerprint === "string" && v1.sourceFingerprint.length === 64, "fingerprint");
assert(
  JSON.stringify(v1.publication.publishedStateIntelligencePaths) ===
    JSON.stringify(pub.publishedStateIntelligencePaths),
  "state intel paths match catalogs"
);
assert(v1.texas.snapshotFingerprint === pub.texasSnapshotFingerprint, "TX snapshot fingerprint");
assert(v1.florida.snapshotFingerprint === pub.floridaSnapshotFingerprint, "FL snapshot fingerprint");
assert(v1.newJersey.snapshotFingerprint === pub.newJerseySnapshotFingerprint, "NJ snapshot fingerprint");
assert(v1.california.snapshotFingerprint === pub.californiaSnapshotFingerprint, "CA snapshot fingerprint");
assert(byKey.insurance_agencies.value === v1.nationalGraph.agencies, "agency metric matches graph");
assert(byKey.licensed_insurance_companies.value === v1.nationalGraph.legalInsurers, "legal insurer metric");
assert(byKey.insurance_producer_records.value === v1.nationalGraph.persons, "producer metric");
assert(byKey.appointments.value === pub.texasAgencyAppointments, "TX appointments");
assert(byKey.consumer_complaint_observations.value === pub.texasComplaintObservations, "TX complaints");
assert(byKey.market_conduct_examinations.value === pub.floridaMarketConductExamListings, "FL MC exams");
assert(byKey.rate_filing_observations.value === pub.texasRateFilings, "TX rate filings");
assert(byKey.cms_marketplace_evidence_observations.value === v1.nationalGraph.cmsMarketplaceObservations, "CMS");
assert(byKey.texas_authorized_companies.value === null, "TX authorized companies not a number");
assert(byKey.texas_authorized_companies.valueState === "NOT_ACQUIRED", "TX authorized not acquired");
assert(byKey.ca_admitted_insurer_universe.value === null, "CA admitted not a number");
assert(byKey.ca_admitted_insurer_universe.valueState === "NOT_ACQUIRED", "CA admitted not acquired");
assert(byKey.nj_surplus_lines_eligible_companies.value === null, "NJ surplus not a number");
assert(byKey.appointments.value !== byKey.insurance_agencies.value, "appointments != agencies");
assert(byKey.consumer_complaint_observations.value !== byKey.licensed_insurance_companies.value, "complaints != companies");
assert(byKey.market_conduct_examinations.value !== byKey.florida_financial_examinations.value, "MC != financial");
assert(byKey.cms_marketplace_evidence_observations.value !== byKey.insurance_agencies.value, "CMS != agencies");
assert(byKey.texas_tdi_agency_license_rows.value !== byKey.insurance_agencies.value, "TDI rows != graph agencies");
assert(v1.rejectedTotals.combinedInsuranceCompanies.status === "REJECTED", "combined companies rejected");
assert(v1.rejectedTotals.combinedInsuranceCompanies.publishAsHeadline === false, "no combined headline");
assert(byKey.appointments.sourceAsOf !== v1.generatedAt.slice(0, 10), "sourceAsOf != generatedAt");
assert(page.includes("loadInsuranceNetworkMetrics"), "homepage loads v1");
assert(page.includes("projectHomeIntelFromNetworkMetrics"), "homepage consumes v1");
assert(load.includes("projectHomeIntelFromNetworkMetrics") || page.includes("projectHomeIntelFromNetworkMetrics"), "loader/projector path");
assert(hero.includes("NetworkTrace") || hero.includes("Trace this number"), "trace this number");
assert(hero.includes("insurance_agencies"), "homepage uses agency metric key");
assert(hero.includes("licensed_insurance_companies"), "homepage uses licensed-company metric key");
assert(hero.includes("insurance_producer_records"), "homepage uses producer metric key");
assert(byKey.insurance_agencies.label === "Insurance agencies", "consumer agency label");
assert(byKey.licensed_insurance_companies.label === "Licensed insurance companies", "consumer insurer label");
assert(byKey.insurance_producer_records.label === "Insurance producer records", "consumer producer label");
assert(!hero.includes("Agencies in the research graph"), "no internal agency title on homepage");
assert(!hero.includes("{item.grain}"), "grain is not a public card subtitle");
assert(!hero.includes("170,499"), "no hardcoded directory count");
assert(!hero.includes("13,547"), "no hardcoded carrier-kind count");
assert(!hero.includes("Florida is the only live state intelligence page"), "TX live copy");
assert(v1.publication.publicPeople === 0, "public people 0");
assert(v1.publication.publicGraphAgencies === 0, "public graph agencies 0");
assert(v1.publication.mayPublishPerson === false, "person profiles gated");

if (failures.length) {
  console.error("ATH-METRICS-003B FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("ATH-METRICS-003B PASS network metric grain and staleness gates");
