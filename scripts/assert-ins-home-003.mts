import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildInsuranceHomepageEvidenceInventory,
  INSURANCE_HOME_EVIDENCE_FAMILIES,
  INSURANCE_HOMEPAGE_STATE_CARDS,
  assertInsuranceHomepageInventory,
} from "../lib/metrics/insurance-home-evidence-inventory";
import metricsJson from "../data/home/insurance-network-metrics-v1.json";
import type { InsuranceNetworkMetricsV1 } from "../lib/metrics/insurance-network-metrics-v1";
import { buildHomepageGraph } from "../lib/seo/schemas";

const errors: string[] = [];
const ok = (condition: unknown, message: string) => {
  if (!condition) errors.push(message);
};
const metrics = metricsJson as InsuranceNetworkMetricsV1;
const inventory = buildInsuranceHomepageEvidenceInventory(metrics);
const byKey = (key: string) => inventory.find((row) => row.key === key);
const renderedStructure = readFileSync(
  join(process.cwd(), "components/home/insurance-home-intelligence.tsx"),
  "utf8",
);

ok(inventory.length === 42, "42 deterministic inventory measures");
ok(
  Object.keys(INSURANCE_HOME_EVIDENCE_FAMILIES).length === 10,
  "ten evidence families",
);
ok(
  inventory.every((row) =>
    [
      "PUBLIC",
      "PUBLIC_PARTIAL",
      "PUBLIC_UNKNOWN",
      "PUBLIC_RESEARCH_GRAPH",
    ].includes(row.publicationStatus),
  ),
  "only allowed publication statuses render",
);
ok(
  !inventory.some((row) => row.grain === "combined_incompatible_grains"),
  "no cross-grain total",
);
ok(
  byKey("insurance_producer_records")?.publicationStatus ===
    "PUBLIC_RESEARCH_GRAPH",
  "producer identities are research-graph scale",
);
ok(
  metrics.publication.publicPeople === 0 &&
    !metrics.publication.mayPublishPerson,
  "public people remain zero and disabled",
);
ok(
  byKey("public_directory_listings")?.value !==
    byKey("insurance_agencies")?.value,
  "directory listings differ from graph agencies",
);
ok(
  byKey("credential_observations")?.grain !==
    byKey("insurance_agencies")?.grain,
  "credentials differ from entities",
);
ok(
  byKey("line_of_authority_observations")?.grain !==
    byKey("credential_observations")?.grain,
  "LOA differs from credentials",
);
ok(
  byKey("person_appointment_relationships")?.grain !==
    byKey("insurance_producer_records")?.grain,
  "appointments differ from people",
);
ok(
  !inventory.some(
    (row) =>
      row.value === metrics.texas.personLicenseRowsUnpublished ||
      row.value === metrics.texas.personAppointmentsUnpublished,
  ),
  "Texas unpublished person datasets absent",
);
ok(
  byKey("texas_authorized_companies")?.value === null,
  "Texas authorized-company universe unknown",
);
ok(
  byKey("nj_surplus_lines_eligible_companies")?.value === null,
  "NJ surplus-lines universe unknown",
);
ok(
  byKey("ca_admitted_insurer_universe")?.value === null,
  "CA admitted-insurer universe unknown",
);
ok(
  byKey("wa_oic_regulated_entities_annual_report")?.grain ===
    "annual_report_entity_aggregate",
  "Washington annual aggregate is not live roster",
);
ok(
  byKey("public_legal_insurer_wave1_profiles")?.doesNotCount.includes(
    "mayPublishEntityKind",
  ),
  "Wave-1 profile semantics preserved",
);
ok(
  byKey("appointments")?.sourceAsOf === "2026-09-03" &&
    byKey("appointments")?.snapshotAsOf === null,
  "TDI source date remains source-owned",
);
ok(
  byKey("nj_market_conduct_exams")?.snapshotAsOf === metrics.newJersey.asOf &&
    byKey("nj_market_conduct_exams")?.sourceAsOf === null,
  "NJ accepted snapshot clock is explicit",
);
ok(
  inventory.every((row) => row.networkGeneratedAt === metrics.generatedAt),
  "network generation clock remains distinct",
);
ok(
  byKey("nj_admitted_legal_insurers")?.destination === "/new-jersey",
  "NJ destination explicit",
);
ok(
  byKey("ca_admitted_insurer_universe")?.destination === "/california",
  "CA destination explicit",
);
ok(
  byKey("wa_oic_regulated_entities_annual_report")?.destination ===
    "/washington",
  "WA destination explicit",
);
ok(
  byKey("co_statistical_report_naic_directory_rows")?.destination ===
    "/colorado",
  "CO destination explicit",
);
ok(
  byKey("public_directory_listings")?.destination === "/directory",
  "directory destination explicit",
);
ok(
  byKey("licensed_insurance_companies")?.destination === "/insurers",
  "insurer destination explicit",
);
ok(INSURANCE_HOMEPAGE_STATE_CARDS.length === 9, "exactly nine state cards");
ok(
  INSURANCE_HOMEPAGE_STATE_CARDS.map((s) => s.href).join(",") ===
    "/florida,/texas,/new-jersey,/california,/washington,/colorado,/virginia,/new-york,/illinois",
  "canonical state hrefs",
);
ok(
  !INSURANCE_HOMEPAGE_STATE_CARDS.some((state) => state.href === "/arizona"),
  "no Arizona state CTA in state model",
);
ok(
  byKey("published_state_intelligence_pages")?.value ===
    INSURANCE_HOMEPAGE_STATE_CARDS.length,
  "state count derives from model",
);
ok(
  renderedStructure.includes("Complaint ≠ proven violation") &&
    renderedStructure.includes("Exam listing ≠ adverse finding") &&
    renderedStructure.includes("Rate filing ≠ consumer premium") &&
    renderedStructure.includes("CMS observation ≠ plan or insurer"),
  "semantic guardrails render",
);
ok(
  renderedStructure.includes(
    "generation and deployment dates are not agency source dates",
  ),
  "clock semantics render",
);
ok(
  renderedStructure.includes('data-intel-event="insurance_intel_explore"') &&
    renderedStructure.includes(
      'data-intel-event="insurance_intel_state_click"',
    ) &&
    renderedStructure.includes(
      'data-intel-event="insurance_intel_trace_number"',
    ),
  "real analytics hooks render",
);
ok(!/AggregateRating/.test(renderedStructure), "no AggregateRating");
ok(
  JSON.stringify(buildHomepageGraph()).includes('"@type":"WebPage"'),
  "homepage WebPage JSON-LD",
);
ok(
  !/best insurer|top insurer|recommended insurer/i.test(renderedStructure),
  "no ranking language",
);
ok(
  /No paid ranking\. No Trust Score\./.test(renderedStructure),
  "no paid ranking and no Trust Score positioning",
);
try {
  assertInsuranceHomepageInventory([
    { ...inventory[0]!, publicationStatus: "INTERNAL" as never },
  ]);
  errors.push("INTERNAL could render");
} catch {}
try {
  assertInsuranceHomepageInventory([
    { ...inventory[0]!, publicationStatus: "REJECTED" as never },
  ]);
  errors.push("REJECTED could render");
} catch {}

if (errors.length) {
  console.error(`INS-HOME-003 FAIL (${errors.length})`);
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}
console.log(
  `INS-HOME-003 PASS · ${inventory.length} measures · ${INSURANCE_HOMEPAGE_STATE_CARDS.length} states · rendered output verified`,
);
