/**
 * Guest-first My Insurance persistence (localStorage).
 * Storage key: ith:my-insurance:v1
 * SSR-safe: all reads return empty on server.
 */

import {
  type CoveragePlan,
  type MyInsuranceState,
  type ProtectFocus,
  type ProviderResearchStatus,
  type SavedProvider,
  newId,
  nowIso,
} from '@/lib/my-insurance/plan-types';
import {
  GUEST_SAVED_PROVIDERS_KEY,
  MY_INSURANCE_STORE_KEY,
  MY_INSURANCE_STORE_KEY_LEGACY,
} from '@/lib/my-insurance/constants';
import type { GuestSavedProvider } from '@/lib/my-insurance/types';
import {
  gateShortlistAdd,
  getShortlisted,
  providersOnPlan,
  SHORTLIST_CAP,
} from '@/lib/my-insurance/shortlist-rules';

const MAX_SAVED_PROVIDERS = 50;

function emptyState(): MyInsuranceState {
  return {
    version: 1,
    activePlanId: null,
    plans: [],
    savedProviders: [],
  };
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

const VALID_STATUSES: ProviderResearchStatus[] = [
  'researching',
  'shortlisted',
  'reached_out',
  'done',
];

function normalizeProvider(p: SavedProvider): SavedProvider {
  const savedAt = p.savedAt || p.createdAt || nowIso();
  const status = VALID_STATUSES.includes(p.status) ? p.status : 'shortlisted';
  return {
    ...p,
    providerSlug: String(p.providerSlug || ''),
    providerName: String(p.providerName || p.providerSlug || 'Provider'),
    profilePath: p.profilePath || `/providers/${p.providerSlug}`,
    savedAt,
    updatedAt: p.updatedAt || savedAt,
    status,
  };
}

function normalizeState(raw: unknown): MyInsuranceState | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as MyInsuranceState;
  if (parsed.version !== 1 || !Array.isArray(parsed.plans)) return null;
  return {
    version: 1,
    activePlanId: parsed.activePlanId ?? null,
    plans: Array.isArray(parsed.plans) ? parsed.plans : [],
    savedProviders: (Array.isArray(parsed.savedProviders) ? parsed.savedProviders : []).map(
      normalizeProvider
    ),
  };
}

function dispatchChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent('ith-my-insurance-store'));
}

function syncLegacyShortlist(state: MyInsuranceState): void {
  if (!isBrowser()) return;
  const legacy: GuestSavedProvider[] = state.savedProviders
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((p) => ({
      providerSlug: p.providerSlug,
      providerName: p.providerName,
      savedAt: p.savedAt,
    }));
  localStorage.setItem(
    GUEST_SAVED_PROVIDERS_KEY,
    JSON.stringify(legacy.slice(0, MAX_SAVED_PROVIDERS))
  );
}

/** Last save error for UI (cleared on success). */
let lastSaveError: string | null = null;

export function getLastSaveError(): string | null {
  return lastSaveError;
}

function noteSaveResult(result: { ok: true } | { ok: false; error: string }): void {
  lastSaveError = result.ok ? null : result.error;
}

/** Spec name: loadState */
export function loadState(): MyInsuranceState {
  if (!isBrowser()) return emptyState();
  try {
    const raw =
      localStorage.getItem(MY_INSURANCE_STORE_KEY) ||
      localStorage.getItem(MY_INSURANCE_STORE_KEY_LEGACY);
    if (!raw) return migrateFromLegacyGuestProviders();
    const parsed = normalizeState(JSON.parse(raw));
    if (!parsed) return migrateFromLegacyGuestProviders();
    // Promote legacy key → canonical
    if (!localStorage.getItem(MY_INSURANCE_STORE_KEY)) {
      saveState(parsed);
    }
    return parsed;
  } catch {
    return emptyState();
  }
}

/** Spec name: saveState — fails soft on quota/private mode (no throw). */
export function saveState(state: MyInsuranceState): { ok: true } | { ok: false; error: string } {
  if (!isBrowser()) return { ok: false, error: 'Not available on server' };
  const next: MyInsuranceState = {
    version: 1,
    activePlanId: state.activePlanId,
    plans: state.plans,
    savedProviders: state.savedProviders
      .map(normalizeProvider)
      .filter((p) => p.providerSlug)
      .slice(0, MAX_SAVED_PROVIDERS),
  };
  try {
    const json = JSON.stringify(next);
    localStorage.setItem(MY_INSURANCE_STORE_KEY, json);
    // Keep previous key written for one release
    try {
      localStorage.setItem(MY_INSURANCE_STORE_KEY_LEGACY, json);
    } catch {
      /* legacy key optional */
    }
    try {
      syncLegacyShortlist(next);
    } catch {
      /* non-fatal */
    }
    dispatchChange();
    noteSaveResult({ ok: true });
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === 'QuotaExceededError'
        ? 'Storage full — could not save My Insurance on this device.'
        : 'Could not save My Insurance on this device (storage blocked or unavailable).';
    if (typeof console !== 'undefined') {
      console.warn('[my-insurance]', msg, e);
    }
    const fail = { ok: false as const, error: msg };
    noteSaveResult(fail);
    return fail;
  }
}

function migrateFromLegacyGuestProviders(): MyInsuranceState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = localStorage.getItem(GUEST_SAVED_PROVIDERS_KEY);
    if (!raw) return emptyState();
    const legacy = JSON.parse(raw) as GuestSavedProvider[];
    if (!Array.isArray(legacy) || legacy.length === 0) return emptyState();

    const ts = nowIso();
    const planId = newId();
    const savedProviders: SavedProvider[] = legacy.slice(0, MAX_SAVED_PROVIDERS).map((g) => {
      const id = newId();
      return {
        id,
        planId,
        providerSlug: g.providerSlug,
        providerName: g.providerName,
        profilePath: `/providers/${g.providerSlug}`,
        status: 'shortlisted' as const,
        savedAt: g.savedAt || ts,
        updatedAt: g.savedAt || ts,
      };
    });
    const plan: CoveragePlan = {
      id: planId,
      label: 'My coverage research',
      protectFocus: [],
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
      savedProviderIds: savedProviders.map((p) => p.id),
    };
    const state: MyInsuranceState = {
      version: 1,
      activePlanId: planId,
      plans: [plan],
      savedProviders,
    };
    saveState(state);
    return state;
  } catch {
    return emptyState();
  }
}

export function listActivePlans(state?: MyInsuranceState): CoveragePlan[] {
  const s = state ?? loadState();
  return s.plans
    .filter((p) => p.status === 'active')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getActivePlan(state?: MyInsuranceState): CoveragePlan | null {
  const s = state ?? loadState();
  if (s.activePlanId) {
    const hit = s.plans.find((p) => p.id === s.activePlanId);
    if (hit) return hit;
  }
  return listActivePlans(s)[0] ?? s.plans[0] ?? null;
}

export function getProvidersForPlan(
  planId: string,
  state?: MyInsuranceState
): SavedProvider[] {
  const s = state ?? loadState();
  const plan = s.plans.find((p) => p.id === planId);
  if (!plan) return [];
  const byId = new Map(s.savedProviders.map((p) => [p.id, p]));
  return plan.savedProviderIds
    .map((id) => byId.get(id))
    .filter((p): p is SavedProvider => Boolean(p));
}

export type UpsertPlanInput = {
  id?: string;
  label: string;
  protectFocus?: ProtectFocus[];
  location?: CoveragePlan['location'];
  notes?: string;
  status?: PlanStatus;
};

type PlanStatus = CoveragePlan['status'];

/** Spec name: upsertPlan — create or update; Phase A keeps at most one active. */
export function upsertPlan(input: UpsertPlanInput): CoveragePlan {
  const state = loadState();
  const ts = nowIso();
  const label = input.label.trim() || 'My coverage research';

  if (input.id) {
    const idx = state.plans.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      const next: CoveragePlan = {
        ...state.plans[idx],
        label,
        protectFocus: input.protectFocus ?? state.plans[idx].protectFocus,
        location: input.location ?? state.plans[idx].location,
        notes: input.notes !== undefined ? input.notes : state.plans[idx].notes,
        status: input.status ?? state.plans[idx].status,
        updatedAt: ts,
      };
      state.plans[idx] = next;
      if (next.status === 'active') state.activePlanId = next.id;
      saveState(state);
      return next;
    }
  }

  // New plan — Phase A: archive other actives so one active remains simple
  state.plans = state.plans.map((p) =>
    p.status === 'active' ? { ...p, status: 'archived' as const, updatedAt: ts } : p
  );
  const plan: CoveragePlan = {
    id: newId(),
    label,
    protectFocus: input.protectFocus ?? [],
    location: input.location,
    notes: input.notes,
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
    savedProviderIds: [],
  };
  state.plans = [plan, ...state.plans];
  state.activePlanId = plan.id;
  saveState(state);
  return plan;
}

export function archivePlan(planId: string): void {
  const state = loadState();
  const ts = nowIso();
  state.plans = state.plans.map((p) =>
    p.id === planId ? { ...p, status: 'archived' as const, updatedAt: ts } : p
  );
  if (state.activePlanId === planId) {
    state.activePlanId = listActivePlans(state)[0]?.id ?? null;
  }
  saveState(state);
}

export type UpsertSavedProviderInput = {
  providerSlug: string;
  providerName: string;
  profilePath?: string;
  planId?: string | null;
  licenseSummary?: string;
  lines?: string[];
  status?: ProviderResearchStatus;
  notes?: string;
  city?: string;
  state?: string;
  /**
   * When shortlist is full and desired status is shortlisted:
   * - block (default): return shortlist_full without writing shortlisted status
   * - demote_oldest: move oldest shortlisted → researching, then shortlist this one
   * - replace_slug: demote specific shortlisted slug → researching, then shortlist this one
   */
  shortlistPolicy?: 'block' | 'demote_oldest' | 'replace_slug';
  replaceShortlistedSlug?: string;
};

export type UpsertSavedProviderResult =
  | { ok: true; provider: SavedProvider; alreadySaved: boolean; created: boolean }
  | {
      ok: false;
      reason: 'shortlist_full';
      message: string;
      shortlisted: SavedProvider[];
      /** Provider may still exist as researching if we only blocked shortlist */
      provider?: SavedProvider;
    };

/** Spec name: upsertSavedProvider — Phase B enforces shortlist cap of 3. */
export function upsertSavedProvider(
  input: UpsertSavedProviderInput
): UpsertSavedProviderResult {
  const state = loadState();
  let plan =
    (input.planId
      ? state.plans.find((p) => p.id === input.planId)
      : getActivePlan(state)) ?? null;

  if (!plan) {
    plan = upsertPlan({ label: 'My coverage research' });
    Object.assign(state, loadState());
    plan = getActivePlan(state)!;
  }

  const profilePath = input.profilePath || `/providers/${input.providerSlug}`;
  const existing = state.savedProviders.find(
    (p) => p.providerSlug === input.providerSlug && (p.planId === plan!.id || !p.planId)
  );
  const ts = nowIso();
  const desiredStatus: ProviderResearchStatus =
    input.status ?? (existing ? existing.status : 'researching');

  let planProviders = providersOnPlan(plan, state.savedProviders);
  const gate = gateShortlistAdd(planProviders, input.providerSlug, desiredStatus);

  if (!gate.ok) {
    const policy = input.shortlistPolicy ?? 'block';
    if (policy === 'block') {
      // Still allow save as researching if not already saved
      if (!existing && desiredStatus === 'shortlisted') {
        // don't auto-save on blocked shortlist — caller shows modal
        return {
          ok: false,
          reason: 'shortlist_full',
          message: gate.message,
          shortlisted: gate.shortlisted,
        };
      }
      if (existing && desiredStatus === 'shortlisted' && existing.status !== 'shortlisted') {
        return {
          ok: false,
          reason: 'shortlist_full',
          message: gate.message,
          shortlisted: gate.shortlisted,
          provider: existing,
        };
      }
    } else if (policy === 'demote_oldest') {
      const oldest = [...getShortlisted(planProviders)].sort((a, b) =>
        a.updatedAt > b.updatedAt ? 1 : -1
      )[0];
      if (oldest) {
        state.savedProviders = state.savedProviders.map((p) =>
          p.id === oldest.id
            ? { ...p, status: 'researching' as const, updatedAt: ts }
            : p
        );
      }
    } else if (policy === 'replace_slug' && input.replaceShortlistedSlug) {
      state.savedProviders = state.savedProviders.map((p) =>
        p.providerSlug === input.replaceShortlistedSlug &&
        (p.planId === plan!.id || plan!.savedProviderIds.includes(p.id))
          ? { ...p, status: 'researching' as const, updatedAt: ts }
          : p
      );
    }
    // refresh plan providers after demote
    planProviders = providersOnPlan(plan, state.savedProviders);
    const gate2 = gateShortlistAdd(planProviders, input.providerSlug, desiredStatus);
    if (!gate2.ok) {
      return {
        ok: false,
        reason: 'shortlist_full',
        message: gate2.message,
        shortlisted: gate2.shortlisted,
      };
    }
  }

  if (existing) {
    const alreadySame =
      existing.status === desiredStatus &&
      existing.providerName === (input.providerName || existing.providerName);
    const updated: SavedProvider = {
      ...existing,
      providerName: input.providerName || existing.providerName,
      profilePath,
      licenseSummary: input.licenseSummary ?? existing.licenseSummary,
      lines: input.lines ?? existing.lines,
      status: desiredStatus,
      notes: input.notes ?? existing.notes,
      city: input.city ?? existing.city,
      state: input.state ?? existing.state,
      planId: plan.id,
      updatedAt: ts,
      savedAt: existing.savedAt || existing.createdAt || ts,
    };
    state.savedProviders = state.savedProviders.map((p) =>
      p.id === existing.id ? updated : p
    );
    if (!plan.savedProviderIds.includes(existing.id)) {
      plan.savedProviderIds = [existing.id, ...plan.savedProviderIds];
    }
    plan.updatedAt = ts;
    state.plans = state.plans.map((p) => (p.id === plan!.id ? plan! : p));
    state.activePlanId = plan.id;
    saveState(state);
    return {
      ok: true,
      provider: updated,
      alreadySaved: true,
      created: false,
      // alreadySame unused but available for callers via alreadySaved
    };
  }

  const saved: SavedProvider = {
    id: newId(),
    planId: plan.id,
    providerSlug: input.providerSlug,
    providerName: input.providerName,
    profilePath,
    licenseSummary: input.licenseSummary,
    lines: input.lines,
    status: desiredStatus,
    notes: input.notes,
    city: input.city,
    state: input.state,
    savedAt: ts,
    updatedAt: ts,
  };
  state.savedProviders = [saved, ...state.savedProviders].slice(0, MAX_SAVED_PROVIDERS);
  plan.savedProviderIds = [saved.id, ...plan.savedProviderIds.filter((id) => id !== saved.id)];
  plan.updatedAt = ts;
  state.plans = state.plans.map((p) => (p.id === plan!.id ? plan! : p));
  state.activePlanId = plan.id;
  saveState(state);
  return { ok: true, provider: saved, alreadySaved: false, created: true };
}

/** Force-add as researching (never blocked by shortlist cap). */
export function saveAsResearching(input: UpsertSavedProviderInput): UpsertSavedProviderResult {
  return upsertSavedProvider({ ...input, status: 'researching', shortlistPolicy: 'block' });
}

/** Move provider to shortlisted, demoting oldest if full. */
export function shortlistWithDemoteOldest(
  input: UpsertSavedProviderInput
): UpsertSavedProviderResult {
  return upsertSavedProvider({
    ...input,
    status: 'shortlisted',
    shortlistPolicy: 'demote_oldest',
  });
}

/** Move provider to shortlisted, demoting a chosen shortlisted slug. */
export function shortlistReplacing(
  input: UpsertSavedProviderInput,
  replaceShortlistedSlug: string
): UpsertSavedProviderResult {
  return upsertSavedProvider({
    ...input,
    status: 'shortlisted',
    shortlistPolicy: 'replace_slug',
    replaceShortlistedSlug,
  });
}

export { SHORTLIST_CAP, getShortlisted, getResearching, getHistory, providersOnPlan } from '@/lib/my-insurance/shortlist-rules';

/** Spec name: removeSavedProvider */
export function removeSavedProvider(providerSlug: string, planId?: string): void {
  const state = loadState();
  const plan = planId
    ? state.plans.find((p) => p.id === planId)
    : getActivePlan(state);
  const toRemove = state.savedProviders.filter(
    (p) =>
      p.providerSlug === providerSlug &&
      (!plan || p.planId === plan.id || plan.savedProviderIds.includes(p.id))
  );
  if (toRemove.length === 0) return;
  const removeIds = new Set(toRemove.map((p) => p.id));
  state.savedProviders = state.savedProviders.filter((p) => !removeIds.has(p.id));
  const ts = nowIso();
  state.plans = state.plans.map((p) => ({
    ...p,
    savedProviderIds: p.savedProviderIds.filter((id) => !removeIds.has(id)),
    updatedAt: ts,
  }));
  saveState(state);
}

export function updateSavedProviderStatus(
  savedId: string,
  status: ProviderResearchStatus,
  options?: { shortlistPolicy?: UpsertSavedProviderInput['shortlistPolicy']; replaceShortlistedSlug?: string }
): UpsertSavedProviderResult | { ok: true; provider: SavedProvider } {
  const state = loadState();
  const existing = state.savedProviders.find((p) => p.id === savedId);
  if (!existing) {
    return {
      ok: false,
      reason: 'shortlist_full',
      message: 'Provider not found',
      shortlisted: [],
    };
  }
  return upsertSavedProvider({
    providerSlug: existing.providerSlug,
    providerName: existing.providerName,
    profilePath: existing.profilePath,
    planId: existing.planId,
    status,
    city: existing.city,
    state: existing.state,
    notes: existing.notes,
    licenseSummary: existing.licenseSummary,
    lines: existing.lines,
    shortlistPolicy: options?.shortlistPolicy,
    replaceShortlistedSlug: options?.replaceShortlistedSlug,
  });
}

export function isProviderSaved(providerSlug: string, state?: MyInsuranceState): boolean {
  const s = state ?? loadState();
  const plan = getActivePlan(s);
  if (!plan) return s.savedProviders.some((p) => p.providerSlug === providerSlug);
  const ids = new Set(plan.savedProviderIds);
  return s.savedProviders.some(
    (p) => p.providerSlug === providerSlug && (ids.has(p.id) || p.planId === plan.id)
  );
}

export function guestSavedCount(): number {
  const plan = getActivePlan();
  if (!plan) return loadState().savedProviders.length;
  return getProvidersForPlan(plan.id).length;
}

// ── Backward-compatible aliases used by Phase A UI ──────────────────────────

export const loadMyInsuranceStore = loadState;
export const ensureActivePlan = (input: {
  label?: string;
  protectFocus?: ProtectFocus[];
  location?: CoveragePlan['location'];
  notes?: string;
} = {}): CoveragePlan => {
  const existing = getActivePlan();
  if (existing) {
    if (input.label || input.protectFocus || input.location || typeof input.notes === 'string') {
      return upsertPlan({
        id: existing.id,
        label: input.label ?? existing.label,
        protectFocus: input.protectFocus ?? existing.protectFocus,
        location: input.location ?? existing.location,
        notes: input.notes !== undefined ? input.notes : existing.notes,
      });
    }
    return existing;
  }
  return upsertPlan({
    label: input.label ?? 'My coverage research',
    protectFocus: input.protectFocus,
    location: input.location,
    notes: input.notes,
  });
};

export const updatePlan = (
  planId: string,
  patch: Partial<Pick<CoveragePlan, 'label' | 'protectFocus' | 'location' | 'notes' | 'status'>>
): CoveragePlan | null => {
  const existing = loadState().plans.find((p) => p.id === planId);
  if (!existing) return null;
  return upsertPlan({
    id: planId,
    label: patch.label ?? existing.label,
    protectFocus: patch.protectFocus ?? existing.protectFocus,
    location: patch.location ?? existing.location,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    status: patch.status ?? existing.status,
  });
};

export const saveProviderToPlan = (input: {
  providerSlug: string;
  providerName: string;
  city?: string;
  state?: string;
  profilePath?: string;
  status?: ProviderResearchStatus;
  notes?: string;
  licenseSummary?: string;
  lines?: string[];
  planId?: string;
  shortlistPolicy?: UpsertSavedProviderInput['shortlistPolicy'];
  replaceShortlistedSlug?: string;
}): UpsertSavedProviderResult => upsertSavedProvider(input);

export const removeProviderFromPlan = removeSavedProvider;

export function clearAllGuestPlans(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(MY_INSURANCE_STORE_KEY);
  localStorage.removeItem(MY_INSURANCE_STORE_KEY_LEGACY);
  localStorage.removeItem(GUEST_SAVED_PROVIDERS_KEY);
  dispatchChange();
}
