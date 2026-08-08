/**
 * Phase 7 — Live ACA Plan Explorer types.
 * Research only: issuer-reported CMS Marketplace fields + labeled educational estimates.
 */

export const MARKETPLACE_PLAN_YEAR_DEFAULT = 2026;

export type MetalLevel = 'Catastrophic' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Unknown';

export type PlanTypeCode = 'HMO' | 'PPO' | 'EPO' | 'POS' | 'Indemnity' | 'Other' | 'Unknown';

export type MarketplacePersonInput = {
  age: number;
  usesTobacco?: boolean;
};

/** CMS household utilization enum — drives plan `oopc` when set. */
export type CmsUtilizationLevel = 'Low' | 'Medium' | 'High';

export type MarketplaceSearchInput = {
  zip: string;
  year: number;
  people: MarketplacePersonInput[];
  /** Tax household MAGI estimate for educational PTC context (USD / year) */
  householdIncome?: number | null;
  /** Tax household size for FPL (defaults to people.length) */
  householdSize?: number | null;
  /**
   * When set, sent on each household person so CMS can return plan `oopc`.
   * Omit / null when user has not chosen a care-usage scenario.
   */
  utilization?: CmsUtilizationLevel | null;
};

export type PlanProvenance = {
  sourceSystem: 'cms_marketplace_api' | 'unavailable';
  planYear: number;
  retrievedAt: string;
  countyFips?: string | null;
  state?: string | null;
  zip?: string | null;
  apiConfigured: boolean;
};

export type MarketplacePlanCard = {
  id: string;
  name: string;
  issuerName: string;
  metalLevel: MetalLevel;
  planType: PlanTypeCode;
  /** Issuer-reported full premium (monthly) for household when available */
  premiumMonthly: number | null;
  /** Educational estimate after PTC — not official award */
  estimatedPremiumAfterCreditMonthly: number | null;
  deductibleIndividual: number | null;
  deductibleFamily: number | null;
  moopIndividual: number | null;
  moopFamily: number | null;
  hsaEligible: boolean | null;
  qualityRating: number | null;
  /** Raw issuer fields preserved for detail panel */
  benefitsSummary?: string | null;
  networkName?: string | null;
  marketingUrl?: string | null;
  premiumIsEstimate: boolean;
  afterCreditIsEstimate: boolean;
  /**
   * CMS-calculated expected out-of-pocket (plan year) when utilization was sent.
   * Null when API omitted or returned -1 (not calculated).
   */
  cmsOopc?: number | null;
  /** CMS total_costs when present (often premium + OOPC style). */
  cmsTotalCosts?: number | null;
  /** Utilization used for this card's OOPC, if any */
  utilizationApplied?: CmsUtilizationLevel | null;
};

export type MarketplaceSearchResult = {
  ok: boolean;
  plans: MarketplacePlanCard[];
  provenance: PlanProvenance;
  locationLabel: string | null;
  errorCode?:
    | 'missing_api_key'
    | 'invalid_zip'
    | 'county_not_found'
    | 'api_error'
    | 'empty_market'
    | 'upstream_timeout';
  errorMessage?: string;
  /** Educational PTC context — not official */
  creditContext?: {
    fplPercent: number | null;
    estimatedMonthlyCredit: number | null;
    note: string;
  } | null;
};

export type PlanSortKey =
  | 'estimated_premium'
  | 'full_premium'
  | 'deductible'
  | 'moop'
  | 'name'
  | 'metal'
  | 'coverage_match'
  | 'yearly_cost';

/* ── Phase 9: total annual cost engine ── */

/** UI scenario ids (map to CMS Low/Medium/High when estimates run). */
export type CareScenarioId = 'none' | 'low' | 'moderate' | 'higher' | 'custom';

export type CustomCareInputs = {
  primaryCareVisits: number;
  specialistVisits: number;
  erVisits: number;
  genericRxMonths: number;
  brandRxMonths: number;
  imagingOrProcedure: boolean;
};

export type PlanAnnualCostEstimate = {
  planId: string;
  available: boolean;
  /** 12 × educational/issuer monthly premium after credit context */
  annualPremium: number | null;
  /** CMS OOPC when present — never invented */
  expectedCareCost: number | null;
  /** annualPremium + expectedCareCost when both available; else null */
  estimatedTotalAnnual: number | null;
  methodLabel: string;
  scenarioId: CareScenarioId;
  scenarioName: string;
  cmsUtilization: CmsUtilizationLevel | null;
  planYear: number | null;
  sourceSystem: 'cms_marketplace_api' | 'unavailable' | 'partial';
  retrievedAt: string | null;
  assumptions: string[];
  limitations: string[];
  unavailableReason?: string | null;
};

export type PlanFilters = {
  metals: MetalLevel[];
  planTypes: PlanTypeCode[];
  hsaOnly: boolean;
};

/* ── Phase 8: doctor network + prescription coverage (CMS-reported only) ── */

/** CMS Coverage enum mapped for UI — never invent beyond API. */
export type CoverageMatchStatus =
  | 'reported'
  | 'not_reported'
  | 'unknown'
  | 'generic_reported'
  | 'insufficient_data';

export type SessionDoctor = {
  /** Client session id */
  sessionId: string;
  npi: string;
  name: string;
  specialty?: string | null;
  providerType?: 'Individual' | 'Facility' | 'Group' | null;
  distanceMiles?: number | null;
};

export type SessionPrescription = {
  sessionId: string;
  rxcui: string;
  name: string;
  strength?: string | null;
  route?: string | null;
  fullName?: string | null;
};

export type ProviderSearchHit = {
  npi: string;
  name: string;
  specialties: string[];
  providerType: string | null;
  distanceMiles: number | null;
  accepting: string | null;
};

export type DrugSearchHit = {
  rxcui: string;
  name: string;
  strength: string | null;
  route: string | null;
  fullName: string | null;
};

export type ItemPlanCoverage = {
  itemSessionId: string;
  /** NPI or RxCUI */
  itemKey: string;
  label: string;
  status: CoverageMatchStatus;
  /** Raw CMS coverage string when present */
  cmsCoverage: string | null;
  accepting?: string | null;
  notes?: string | null;
};

export type PlanCoverageSummary = {
  planId: string;
  doctors: {
    reported: number;
    notReported: number;
    unknown: number;
    total: number;
    items: ItemPlanCoverage[];
  };
  prescriptions: {
    reported: number;
    notReported: number;
    unknown: number;
    total: number;
    items: ItemPlanCoverage[];
  };
  /**
   * Transparent match: reported / (reported + not_reported).
   * Unknowns excluded from denominator; null if nothing checkable.
   */
  explainableMatchRatio: number | null;
  explainableMatchLabel: string | null;
};

export type CoverageMatchResult = {
  ok: boolean;
  year: number;
  retrievedAt: string;
  sourceSystem: 'cms_marketplace_api' | 'unavailable';
  apiConfigured: boolean;
  byPlan: Record<string, PlanCoverageSummary>;
  errorCode?: string;
  errorMessage?: string;
  limitations: string[];
};
