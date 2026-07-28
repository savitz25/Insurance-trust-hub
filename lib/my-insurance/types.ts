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
  | 'cost_estimator'
  | 'needs_assessment';

export type CalculatorSnapshot = {
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  summaryText?: string;
  sourcePath?: string;
  /** Full tool result JSON (compact serializable) */
  result?: unknown;
};

export type SavedCalculatorResultRow = {
  id: string;
  user_id: string;
  calculator_id: string;
  title: string;
  snapshot: CalculatorSnapshot;
  created_at: string;
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

export type PendingSaveAction =
  | PendingSaveProviderAction
  | PendingSaveCalculatorAction
  | PendingSaveBasketAction;

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
  email: string | null;
};

export const CALCULATOR_LABELS: Record<CalculatorToolId, string> = {
  aca_subsidy: 'ACA Coverage & Savings Planner',
  cost_estimator: 'Insurance Cost & Coverage Planner',
  needs_assessment: 'Coverage Compass / Needs Assessment',
};
