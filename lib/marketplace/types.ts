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

export type MarketplaceSearchInput = {
  zip: string;
  year: number;
  people: MarketplacePersonInput[];
  /** Tax household MAGI estimate for educational PTC context (USD / year) */
  householdIncome?: number | null;
  /** Tax household size for FPL (defaults to people.length) */
  householdSize?: number | null;
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
  | 'metal';

export type PlanFilters = {
  metals: MetalLevel[];
  planTypes: PlanTypeCode[];
  hsaOnly: boolean;
};
