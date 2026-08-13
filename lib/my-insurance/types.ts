export type SavedProviderRow = {
  id: string;
  user_id: string;
  provider_slug: string;
  provider_name: string;
  notes: string | null;
  created_at: string;
};

export type DrugBasketItemInput = {
  name: string;
  strength: string;
  form?: string;
  dosage: string;
  quantity?: string | null;
  notes?: string | null;
  sort_order?: number;
};

export type DrugBasketItemRow = {
  id: string;
  basket_id: string;
  name: string;
  strength: string;
  form: string;
  dosage: string;
  quantity: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

export type DrugBasketWithItems = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: DrugBasketItemRow[];
};

export type CalculatorToolId =
  | 'aca_subsidy'
  | 'aca_plan_explorer'
  | 'cost_estimator'
  | 'needs_assessment'
  | 'marketplace_research';

export type CalculatorSnapshot = {
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  summaryText?: string;
  sourcePath?: string;
  /** Full tool result JSON (compact serializable) */
  result?: unknown;
  /**
   * Phase 3 — compact Marketplace research payload (cost/subsidy planners).
   * Prefer reading via extractMarketplaceResearch().
   */
  marketplaceResearch?: import('@/lib/marketplace/research-snapshot').MarketplaceResearchSnapshot;
};

export type SavedCalculatorResultRow = {
  id: string;
  user_id: string;
  calculator_id: string;
  title: string;
  snapshot: CalculatorSnapshot;
  created_at: string;
  /** Denormalized list fields (optional until migration applied) */
  zip?: string | null;
  state?: string | null;
  county?: string | null;
  used_live_marketplace?: boolean | null;
  plan_year?: number | null;
  updated_at?: string | null;
};

export type PendingSaveProviderAction = {
  type: 'provider';
  payload: {
    providerSlug: string;
    providerName: string;
  };
};

export type PendingSaveCalculatorAction = {
  type: 'calculator';
  payload: {
    calculatorId: CalculatorToolId;
    title: string;
    snapshot: CalculatorSnapshot;
  };
};

export type PendingSaveBasketAction = {
  type: 'drug_basket';
  payload: {
    basketName?: string;
    items: DrugBasketItemInput[];
  };
};

export type ResearchSessionSource = 'profile' | 'hub' | 'marketplace' | 'compass';

export type ResearchSessionInput = {
  title: string;
  source: ResearchSessionSource;
  providerSlug?: string | null;
  providerName?: string | null;
  hubPath?: string | null;
  directoryHref?: string | null;
  marketplaceZip?: string | null;
  plannerHref?: string | null;
  resumeHref: string;
  note?: string | null;
};

export type ResearchSessionRow = ResearchSessionInput & {
  id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
};

export type LicenseFreshnessItem = {
  providerSlug: string;
  providerName: string;
  licenseCheckedAt: string | null;
  days: number | null;
  kind: 'stale' | 'fresh' | 'unknown';
  regulatorLookupUrl: string | null;
};

export type PendingSaveSessionAction = {
  type: 'research_session';
  payload: ResearchSessionInput;
};

export type PendingSaveAction =
  | PendingSaveProviderAction
  | PendingSaveCalculatorAction
  | PendingSaveBasketAction
  | PendingSaveSessionAction;

export type GuestSavedProvider = {
  providerSlug: string;
  providerName: string;
  savedAt: string;
};

export type ComparisonItemRow = {
  id: string;
  comparison_id: string;
  provider_slug: string;
  provider_name: string;
  sort_order: number;
  created_at: string;
};

export type ComparisonWithItems = {
  id: string;
  user_id: string;
  title: string;
  snapshot_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  items: ComparisonItemRow[];
};

export type MyInsuranceReviewRow = {
  id: string;
  provider_id: string;
  provider_slug?: string;
  provider_name?: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  title: string | null;
  content: string;
  coverage_type: string | null;
  status: 'pending' | 'published' | 'hidden' | string;
  created_at: string;
};

export type MyInsuranceDashboardData = {
  savedProviders: SavedProviderRow[];
  drugBasket: DrugBasketWithItems | null;
  calculatorResults: SavedCalculatorResultRow[];
  comparisons: ComparisonWithItems[];
  myReviews: MyInsuranceReviewRow[];
  researchSessions: ResearchSessionRow[];
  freshnessItems: LicenseFreshnessItem[];
  email: string | null;
};

export const CALCULATOR_LABELS: Record<CalculatorToolId, string> = {
  aca_subsidy: 'ACA Coverage & Savings Planner',
  aca_plan_explorer: 'Live ACA Plan Explorer',
  cost_estimator: 'Insurance Cost & Coverage Planner',
  needs_assessment: 'Coverage Compass',
  marketplace_research: 'Marketplace Plan Research',
};

export function mapToolIdToCalculatorId(toolId: string): CalculatorToolId {
  const id = toolId.trim().toLowerCase().replace(/-/g, '_');
  if (id === 'aca_subsidy') return 'aca_subsidy';
  if (id === 'aca_plan_explorer') return 'aca_plan_explorer';
  if (id === 'cost_estimator') return 'cost_estimator';
  if (id === 'marketplace_research' || id === 'marketplace') return 'marketplace_research';
  return 'needs_assessment';
}
