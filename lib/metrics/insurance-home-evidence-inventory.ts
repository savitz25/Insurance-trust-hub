import type {
  InsuranceNetworkMetric,
  InsuranceNetworkMetricsV1,
  PublicationStatus,
} from "./insurance-network-metrics-v1";

export const INSURANCE_HOME_EVIDENCE_FAMILIES = {
  ENTITY_IDENTITY: "Insurance entity identity",
  LICENSING_CREDENTIALS: "Licensing & credentials",
  LINES_OF_AUTHORITY: "Lines of authority",
  APPOINTMENTS_RELATIONSHIPS: "Appointments & business relationships",
  REGULATORY_ENFORCEMENT: "Regulatory & enforcement evidence",
  COMPLAINTS: "Complaints & consumer observations",
  EXAMINATIONS: "Examinations & market oversight",
  RATE_MARKET: "Rate, product & market evidence",
  FEDERAL_PROGRAMS: "Federal & program overlays",
  PUBLIC_SURFACES: "Public research surfaces",
} as const;

export type InsuranceHomeEvidenceFamily =
  keyof typeof INSURANCE_HOME_EVIDENCE_FAMILIES;
export type HomePublicationStatus = Extract<
  PublicationStatus,
  "PUBLIC" | "PUBLIC_PARTIAL" | "PUBLIC_UNKNOWN" | "PUBLIC_RESEARCH_GRAPH"
>;

export type InsuranceHomeEvidenceMeasure = {
  key: string;
  label: string;
  value: number | null;
  display: string;
  valueState: string;
  family: InsuranceHomeEvidenceFamily;
  grain: string;
  entityClass: string;
  geography: string;
  source: string;
  acceptedArtifact: string;
  sourceAsOf: string | null;
  retrievedAt: string | null;
  snapshotAsOf: string | null;
  networkGeneratedAt: string | null;
  definition: string;
  doesNotCount: string;
  publicationStatus: HomePublicationStatus;
  destination: string;
  limitation?: string;
};

export type InsuranceStateCard = {
  state: string;
  abbreviation: string;
  href: string;
  regulators: string;
  evidence: string[];
  limitation: string;
  sourceClocks: Array<{
    label: string;
    sourceAsOf?: string;
    snapshotAsOf?: string;
    retrievedAt?: string;
  }>;
};

export const INSURANCE_HOMEPAGE_STATE_CARDS: InsuranceStateCard[] = [
  {
    state: "Florida",
    abbreviation: "FL",
    href: "/florida",
    regulators: "DFS · OIR",
    evidence: [
      "Agency and producer credentials",
      "Appointments and insurer identity",
      "Market-conduct and financial exams",
      "NFIP and market evidence",
    ],
    limitation:
      "A credential, appointment, or examination listing is not an endorsement or adverse finding.",
    sourceClocks: [
      { label: "Accepted network census", sourceAsOf: "2026-08-28" },
    ],
  },
  {
    state: "Texas",
    abbreviation: "TX",
    href: "/texas",
    regulators: "Texas Department of Insurance",
    evidence: [
      "Agency licensing",
      "Active agency appointments",
      "Complaint observations and index rows",
      "Rate, surplus-lines, and title evidence",
    ],
    limitation:
      "The authorized-company universe was not acquired; unpublished person datasets are not exposed.",
    sourceClocks: [{ label: "TDI open data", sourceAsOf: "2026-09-03" }],
  },
  {
    state: "New Jersey",
    abbreviation: "NJ",
    href: "/new-jersey",
    regulators: "NJ Department of Banking & Insurance",
    evidence: [
      "Admitted legal insurers",
      "Market-conduct examinations",
      "Financial examinations",
      "Enforcement publications",
    ],
    limitation:
      "The surplus-lines universe was not acquired; reports and enforcement events remain separate grains.",
    sourceClocks: [
      { label: "Accepted state snapshot", snapshotAsOf: "2026-09-02" },
    ],
  },
  {
    state: "California",
    abbreviation: "CA",
    href: "/california",
    regulators: "CDI · DMHC",
    evidence: [
      "CDI health-insurer list",
      "DMHC enforcement publications",
      "Independent Medical Review records",
      "Public verification paths",
    ],
    limitation:
      "The admitted-insurer universe was not acquired; a health plan is not automatically a legal insurer.",
    sourceClocks: [
      { label: "Accepted state snapshot", snapshotAsOf: "2026-06-01" },
    ],
  },
  {
    state: "Washington",
    abbreviation: "WA",
    href: "/washington",
    regulators: "Office of the Insurance Commissioner",
    evidence: [
      "Dated annual-report aggregates",
      "Producer verification path",
      "Agency search path",
      "Company verification context",
    ],
    limitation:
      "The 2,924-entity annual-report aggregate is not a current authorized-company roster.",
    sourceClocks: [
      { label: "Accepted state snapshot", snapshotAsOf: "2026-09-04" },
    ],
  },
  {
    state: "Colorado",
    abbreviation: "CO",
    href: "/colorado",
    regulators: "Colorado Division of Insurance",
    evidence: [
      "Dated 2025 statistical-report directory",
      "Eligible non-admitted surplus-lines list",
      "Domestic certificates of compliance",
      "Producer and agency verification paths",
    ],
    limitation:
      "The 1,839-row 2025 NAIC Companies directory is not a current authorized-company roster; producer and agency lists remain search-only.",
    sourceClocks: [
      { label: "Accepted state snapshot", snapshotAsOf: "2026-09-09" },
    ],
  },
] as const;

const ALLOWED = new Set<PublicationStatus>([
  "PUBLIC",
  "PUBLIC_PARTIAL",
  "PUBLIC_UNKNOWN",
  "PUBLIC_RESEARCH_GRAPH",
]);

function format(value: number | null, state: string): string {
  if (value !== null) return value.toLocaleString("en-US");
  if (state === "NOT_ACQUIRED") return "Not acquired";
  if (state === "REQUEST_ONLY") return "Available by request";
  return "Unknown";
}

const FAMILY_BY_KEY: Record<string, InsuranceHomeEvidenceFamily> = {
  insurance_agencies: "ENTITY_IDENTITY",
  licensed_insurance_companies: "ENTITY_IDENTITY",
  insurance_producer_records: "ENTITY_IDENTITY",
  appointing_carrier_entities: "ENTITY_IDENTITY",
  credential_observations: "LICENSING_CREDENTIALS",
  texas_tdi_agency_license_rows: "LICENSING_CREDENTIALS",
  florida_agencies_with_fl_credential: "LICENSING_CREDENTIALS",
  appointments: "APPOINTMENTS_RELATIONSHIPS",
  florida_agency_appointed_by: "APPOINTMENTS_RELATIONSHIPS",
  consumer_complaint_observations: "COMPLAINTS",
  tdi_complaint_index_rows: "COMPLAINTS",
  market_conduct_examinations: "EXAMINATIONS",
  florida_financial_examinations: "EXAMINATIONS",
  rate_filing_observations: "RATE_MARKET",
  texas_surplus_lines_observations: "RATE_MARKET",
  texas_title_appointment_rows: "RATE_MARKET",
  cms_marketplace_evidence_observations: "FEDERAL_PROGRAMS",
  nfip_registry_listings: "FEDERAL_PROGRAMS",
  nj_admitted_legal_insurers: "ENTITY_IDENTITY",
  nj_surplus_lines_eligible_companies: "RATE_MARKET",
  texas_authorized_companies: "ENTITY_IDENTITY",
  ca_admitted_insurer_universe: "ENTITY_IDENTITY",
  wa_oic_regulated_entities_annual_report: "ENTITY_IDENTITY",
  wa_authorized_companies: "ENTITY_IDENTITY",
  co_statistical_report_naic_directory_rows: "ENTITY_IDENTITY",
  co_authorized_companies: "ENTITY_IDENTITY",
  co_surplus_lines_eligible_identities: "RATE_MARKET",
  public_directory_listings: "PUBLIC_SURFACES",
  published_state_intelligence_pages: "PUBLIC_SURFACES",
  public_legal_insurer_wave1_profiles: "PUBLIC_SURFACES",
};

const DESTINATION_BY_KEY: Record<string, string> = {
  insurance_agencies: "/directory",
  insurance_producer_records: "/methodology",
  licensed_insurance_companies: "/insurers",
  appointing_carrier_entities: "/carriers",
  credential_observations: "/tools/license-verification",
  public_directory_listings: "/directory",
  public_legal_insurer_wave1_profiles: "/insurers",
  published_state_intelligence_pages: "#states",
  cms_marketplace_evidence_observations: "/marketplace",
  appointments: "/texas",
  consumer_complaint_observations: "/texas",
  market_conduct_examinations: "/florida",
  rate_filing_observations: "/texas",
  texas_tdi_agency_license_rows: "/texas",
  texas_authorized_companies: "/texas",
  texas_surplus_lines_observations: "/texas",
  texas_title_appointment_rows: "/texas",
  tdi_complaint_index_rows: "/texas",
  florida_agencies_with_fl_credential: "/florida",
  florida_agency_appointed_by: "/florida",
  florida_financial_examinations: "/florida",
  nfip_registry_listings: "/florida",
  nj_admitted_legal_insurers: "/new-jersey",
  nj_surplus_lines_eligible_companies: "/new-jersey",
  ca_admitted_insurer_universe: "/california",
  wa_oic_regulated_entities_annual_report: "/washington",
  wa_authorized_companies: "/washington",
  co_statistical_report_naic_directory_rows: "/colorado",
  co_authorized_companies: "/colorado",
  co_surplus_lines_eligible_identities: "/colorado",
};

function fromMetric(
  metric: InsuranceNetworkMetric,
): InsuranceHomeEvidenceMeasure {
  if (!ALLOWED.has(metric.publicationStatus))
    throw new Error(
      `Homepage cannot publish ${metric.key}: ${metric.publicationStatus}`,
    );
  return {
    key: metric.key,
    label: metric.label,
    value: metric.value,
    display: format(metric.value, metric.valueState),
    valueState: metric.valueState,
    family: FAMILY_BY_KEY[metric.key] ?? "REGULATORY_ENFORCEMENT",
    grain: metric.grain,
    entityClass: metric.grain,
    geography: metric.coverage,
    source: metric.contributingSourceSystems.join(" · "),
    acceptedArtifact: "insurance-network-metrics-v1",
    sourceAsOf: metric.sourceAsOf,
    retrievedAt: null,
    snapshotAsOf: null,
    networkGeneratedAt: metric.generatedAt,
    definition: metric.trace.counts,
    doesNotCount: metric.trace.doesNotCount,
    publicationStatus: metric.publicationStatus as HomePublicationStatus,
    destination: DESTINATION_BY_KEY[metric.key] ?? "/methodology",
    limitation: metric.trace.whyUnknown,
  };
}

type Supplemental = Omit<
  InsuranceHomeEvidenceMeasure,
  | "display"
  | "acceptedArtifact"
  | "networkGeneratedAt"
  | "retrievedAt"
  | "snapshotAsOf"
  | "sourceAsOf"
> & {
  sourceAsOf?: string | null;
  retrievedAt?: string | null;
  snapshotAsOf?: string | null;
};
function supplemental(
  m: Supplemental,
  generatedAt: string,
): InsuranceHomeEvidenceMeasure {
  if (!ALLOWED.has(m.publicationStatus))
    throw new Error(`Homepage cannot publish ${m.key}: ${m.publicationStatus}`);
  return {
    ...m,
    display: format(m.value, m.valueState),
    acceptedArtifact: "insurance-network-metrics-v1 accepted rollup",
    networkGeneratedAt: generatedAt,
    retrievedAt: m.retrievedAt ?? null,
    snapshotAsOf: m.snapshotAsOf ?? null,
    sourceAsOf: m.sourceAsOf ?? null,
  };
}

export function assertInsuranceHomepageInventory(
  rows: InsuranceHomeEvidenceMeasure[],
): void {
  for (const row of rows)
    if (!ALLOWED.has(row.publicationStatus))
      throw new Error(`Disallowed homepage publication status: ${row.key}`);
  if (rows.some((row) => row.grain === "combined_incompatible_grains"))
    throw new Error("Cross-grain totals cannot render");
}

export function buildInsuranceHomepageEvidenceInventory(
  metrics: InsuranceNetworkMetricsV1,
): InsuranceHomeEvidenceMeasure[] {
  const rows = metrics.metrics
    .filter((m) => ALLOWED.has(m.publicationStatus))
    .map(fromMetric);
  const extra: Supplemental[] = [
    {
      key: "line_of_authority_observations",
      label: "Line-of-authority observations",
      value: metrics.nationalGraph.loaObservations,
      valueState: "KNOWN",
      family: "LINES_OF_AUTHORITY",
      grain: "line_of_authority_observation",
      entityClass: "credential authority",
      geography: "National research graph",
      source: "state credential sources",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition:
        "Source-native authority/class observations attached to credentials.",
      doesNotCount:
        "Not entities, licenses, recommendations, or a non-overlapping product taxonomy.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/",
    },
    {
      key: "person_appointment_relationships",
      label: "Producer appointment relationships",
      value: metrics.nationalGraph.appointedTo,
      valueState: "KNOWN",
      family: "APPOINTMENTS_RELATIONSHIPS",
      grain: "person_appointment_relationship",
      entityClass: "producer relationship",
      geography: "Research graph",
      source: "accepted state appointment sources",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition: "APPOINTED_TO relationships retained in the research graph.",
      doesNotCount:
        "Not employment, endorsement, public producer profiles, or unique people.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/",
    },
    {
      key: "associated_with_relationships",
      label: "Associated-with relationships",
      value: metrics.nationalGraph.associatedWith,
      valueState: "KNOWN",
      family: "APPOINTMENTS_RELATIONSHIPS",
      grain: "associated_with_relationship",
      entityClass: "business relationship",
      geography: "Research graph",
      source: "accepted identity graph",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition: "Source-supported ASSOCIATED_WITH graph relationships.",
      doesNotCount:
        "Not ownership, employment, appointment, or unique entities.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/",
    },
    {
      key: "public_business_contacts",
      label: "Public/business contact observations",
      value: metrics.nationalGraph.contactObservations,
      valueState: "KNOWN",
      family: "ENTITY_IDENTITY",
      grain: "public_business_contact_observation",
      entityClass: "business contact",
      geography: "Research graph",
      source: "publication-eligible public sources",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition: "Public or business-safe contact observations.",
      doesNotCount:
        "Not private producer contacts, verified service areas, or unique entities.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/directory",
    },
    {
      key: "national_regulatory_evidence",
      label: "Regulatory-evidence rows",
      value: metrics.nationalGraph.regulatoryEvidence,
      valueState: "KNOWN",
      family: "REGULATORY_ENFORCEMENT",
      grain: "regulatory_evidence_row",
      entityClass: "regulatory evidence",
      geography: "Accepted graph sources",
      source: "state regulatory publications",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition: "Source-native regulatory evidence rows in the graph.",
      doesNotCount:
        "Not criminal convictions, unique actions, findings of misconduct, or a clean-record test.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/",
    },
    {
      key: "insurance_groups",
      label: "Insurance-group identities",
      value: metrics.nationalGraph.insuranceGroups,
      valueState: "KNOWN",
      family: "ENTITY_IDENTITY",
      grain: "insurance_group_entity",
      entityClass: "insurance group",
      geography: "National identity graph",
      source: "accepted identity graph",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition:
        "Insurance-group identities modeled separately from companies.",
      doesNotCount:
        "Not legal insurers, brands, agencies, or appointing entities.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/insurers",
    },
    {
      key: "consumer_brands",
      label: "Consumer-brand identities",
      value: metrics.nationalGraph.consumerBrands,
      valueState: "KNOWN",
      family: "ENTITY_IDENTITY",
      grain: "consumer_brand_entity",
      entityClass: "consumer brand",
      geography: "National identity graph",
      source: "accepted identity graph",
      sourceAsOf: metrics.nationalGraph.censusAsOf.slice(0, 10),
      definition: "Consumer-facing brand identities in the research graph.",
      doesNotCount:
        "Not regulated legal entities or proof of the underwriting company.",
      publicationStatus: "PUBLIC_RESEARCH_GRAPH",
      destination: "/insurers",
    },
    {
      key: "nj_market_conduct_exams",
      label: "New Jersey market-conduct exam reports",
      value: metrics.newJersey.marketConductExamReports,
      valueState: "KNOWN",
      family: "EXAMINATIONS",
      grain: "market_conduct_examination_report",
      entityClass: "examination report",
      geography: "New Jersey",
      source: "NJ DOBI",
      snapshotAsOf: metrics.newJersey.asOf,
      definition: "Accepted NJ market-conduct examination report records.",
      doesNotCount:
        "Not adverse findings, enforcement actions, or unique insurers.",
      publicationStatus: "PUBLIC",
      destination: "/new-jersey",
    },
    {
      key: "nj_financial_exams",
      label: "New Jersey financial-exam reports",
      value: metrics.newJersey.financialExamReports,
      valueState: "KNOWN",
      family: "EXAMINATIONS",
      grain: "financial_examination_report",
      entityClass: "examination report",
      geography: "New Jersey",
      source: "NJ DOBI",
      snapshotAsOf: metrics.newJersey.asOf,
      definition: "Accepted NJ financial examination report records.",
      doesNotCount: "Not market-conduct exams, failures, or unique insurers.",
      publicationStatus: "PUBLIC",
      destination: "/new-jersey",
    },
    {
      key: "nj_enforcement_events",
      label: "New Jersey enforcement events",
      value: metrics.newJersey.enforcementEvents,
      valueState: "KNOWN",
      family: "REGULATORY_ENFORCEMENT",
      grain: "enforcement_event",
      entityClass: "regulatory event",
      geography: "New Jersey",
      source: "NJ DOBI",
      snapshotAsOf: metrics.newJersey.asOf,
      definition: "Source-native NJ regulatory enforcement events.",
      doesNotCount:
        "Not criminal convictions, complaints, or automatically profile-attributable violations.",
      publicationStatus: "PUBLIC",
      destination: "/new-jersey",
    },
    {
      key: "ca_dmhc_enforcement",
      label: "California DMHC enforcement rows",
      value: metrics.california.dmhcEnforcementRows,
      valueState: "KNOWN",
      family: "REGULATORY_ENFORCEMENT",
      grain: "enforcement_row",
      entityClass: "health-plan regulatory evidence",
      geography: "California",
      source: "California DMHC",
      snapshotAsOf: metrics.california.asOf,
      definition: "Accepted DMHC enforcement publication rows.",
      doesNotCount:
        "Not criminal convictions, CDI legal insurers, or unique health plans.",
      publicationStatus: "PUBLIC",
      destination: "/california",
    },
    {
      key: "ca_imr_rows",
      label: "California independent medical review rows",
      value: metrics.california.imrRows,
      valueState: "KNOWN",
      family: "COMPLAINTS",
      grain: "independent_medical_review_row",
      entityClass: "health-plan review evidence",
      geography: "California",
      source: "California DMHC",
      snapshotAsOf: metrics.california.asOf,
      definition: "Accepted Independent Medical Review records.",
      doesNotCount:
        "Not enforcement actions, complaints proven valid, insurers, or quality scores.",
      publicationStatus: "PUBLIC",
      destination: "/california",
    },
  ];
  const inventory = [
    ...rows,
    ...extra.map((m) => supplemental(m, metrics.generatedAt)),
  ];
  const stateMetric = inventory.find(
    (row) => row.key === "published_state_intelligence_pages",
  );
  if (stateMetric) {
    stateMetric.value = INSURANCE_HOMEPAGE_STATE_CARDS.length;
    stateMetric.display = String(INSURANCE_HOMEPAGE_STATE_CARDS.length);
  }
  assertInsuranceHomepageInventory(inventory);
  return inventory;
}
