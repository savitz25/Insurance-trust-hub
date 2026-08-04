/**
 * My Insurance Phase A — guest-first coverage research model.
 * Plan · Saved providers · Status (chapter vocabulary for later journey work).
 */

export type ProtectFocus =
  | 'home'
  | 'auto'
  | 'health'
  | 'life'
  | 'family'
  | 'relocating'
  | 'other';

export type ProviderResearchStatus =
  | 'researching'
  | 'shortlisted'
  | 'reached_out'
  | 'done';

export type PlanStatus = 'active' | 'archived';

export type PlanLocation = {
  zip?: string;
  state?: string;
  city?: string;
  label?: string;
};

/** Phase C — tool result saved onto a plan (educational snapshot only). */
export type ToolSnapshot = {
  id: string;
  toolId: string;
  title: string;
  summary: string;
  href: string;
  capturedAt: string;
  payload?: Record<string, unknown>;
};

/** Coverage research plan. Phase A uses one active plan; array shape ready for multi-plan. */
export type CoveragePlan = {
  id: string;
  label: string;
  protectFocus: ProtectFocus[];
  location?: PlanLocation;
  notes?: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  /** SavedProvider ids belonging to this plan */
  savedProviderIds: string[];
  /** Phase C tool saves (default []) */
  toolSnapshots?: ToolSnapshot[];
};

/** Agency/agent shortlist item — research only, not a lead. */
export type SavedProvider = {
  id: string;
  /** Optional link to a plan; may be unassigned */
  planId?: string | null;
  providerSlug: string;
  providerName: string;
  /** e.g. /providers/{slug} */
  profilePath: string;
  licenseSummary?: string;
  lines?: string[];
  status: ProviderResearchStatus;
  notes?: string;
  city?: string;
  state?: string;
  /** When first saved (ISO) */
  savedAt: string;
  updatedAt: string;
  /** @deprecated prefer savedAt — kept for older local blobs */
  createdAt?: string;
};

/** Root guest blob (localStorage). Phase D: multi-plan library via activePlanId. */
export type MyInsuranceState = {
  /** 1 = original; 2 = multi-plan library (same key, migrated in loadState) */
  version: 1 | 2;
  /** Exactly one preferred plan when any non-archived plan exists */
  activePlanId: string | null;
  plans: CoveragePlan[];
  /** Strongly associated via planId / plan.savedProviderIds */
  savedProviders: SavedProvider[];
};

/** @deprecated use MyInsuranceState */
export type MyInsuranceLocalStore = MyInsuranceState;

export const PROTECT_FOCUS_OPTIONS: { id: ProtectFocus; label: string }[] = [
  { id: 'health', label: 'My health' },
  { id: 'home', label: 'My home' },
  { id: 'auto', label: 'My car' },
  { id: 'family', label: 'My family' },
  { id: 'life', label: 'Life coverage' },
  { id: 'relocating', label: 'I’m relocating' },
  { id: 'other', label: 'Other' },
];

export const PROVIDER_STATUS_OPTIONS: {
  id: ProviderResearchStatus;
  label: string;
}[] = [
  { id: 'researching', label: 'Researching' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'reached_out', label: 'Reached out' },
  { id: 'done', label: 'Done' },
];

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ith_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
