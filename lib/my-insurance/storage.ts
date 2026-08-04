/**
 * Guest-first My Insurance persistence (localStorage).
 * Phase A: one active coverage plan + saved providers.
 * No server required. Research-only — not lead-gen.
 */

import {
  type CoveragePlan,
  type MyInsuranceLocalStore,
  type ProtectFocus,
  type ProviderResearchStatus,
  type SavedProvider,
  newId,
  nowIso,
} from '@/lib/my-insurance/plan-types';
import {
  GUEST_SAVED_PROVIDERS_KEY,
  MY_INSURANCE_STORE_KEY,
} from '@/lib/my-insurance/constants';
import type { GuestSavedProvider } from '@/lib/my-insurance/types';

const MAX_SAVED_PROVIDERS = 50;

function emptyStore(): MyInsuranceLocalStore {
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

function readRawStore(): MyInsuranceLocalStore {
  if (!isBrowser()) return emptyStore();
  try {
    const raw = localStorage.getItem(MY_INSURANCE_STORE_KEY);
    if (!raw) return migrateFromLegacyGuestProviders();
    const parsed = JSON.parse(raw) as MyInsuranceLocalStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.plans)) {
      return migrateFromLegacyGuestProviders();
    }
    return {
      version: 1,
      activePlanId: parsed.activePlanId ?? null,
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      savedProviders: Array.isArray(parsed.savedProviders) ? parsed.savedProviders : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: MyInsuranceLocalStore): void {
  if (!isBrowser()) return;
  localStorage.setItem(MY_INSURANCE_STORE_KEY, JSON.stringify(store));
  // Keep legacy key in sync for any old readers
  const legacy: GuestSavedProvider[] = store.savedProviders
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((p) => ({
      providerSlug: p.providerSlug,
      providerName: p.providerName,
      savedAt: p.createdAt,
    }));
  localStorage.setItem(GUEST_SAVED_PROVIDERS_KEY, JSON.stringify(legacy.slice(0, MAX_SAVED_PROVIDERS)));
  window.dispatchEvent(new CustomEvent('ith-my-insurance-store'));
}

/** One-time lift of simple guest shortlist into CoveragePlan model. */
function migrateFromLegacyGuestProviders(): MyInsuranceLocalStore {
  if (!isBrowser()) return emptyStore();
  try {
    const raw = localStorage.getItem(GUEST_SAVED_PROVIDERS_KEY);
    if (!raw) return emptyStore();
    const legacy = JSON.parse(raw) as GuestSavedProvider[];
    if (!Array.isArray(legacy) || legacy.length === 0) return emptyStore();

    const ts = nowIso();
    const planId = newId();
    const savedProviders: SavedProvider[] = legacy.slice(0, MAX_SAVED_PROVIDERS).map((g) => {
      const id = newId();
      return {
        id,
        planId,
        providerSlug: g.providerSlug,
        providerName: g.providerName,
        status: 'shortlisted' as const,
        profilePath: `/providers/${g.providerSlug}`,
        createdAt: g.savedAt || ts,
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
    const store: MyInsuranceLocalStore = {
      version: 1,
      activePlanId: planId,
      plans: [plan],
      savedProviders,
    };
    writeStore(store);
    return store;
  } catch {
    return emptyStore();
  }
}

export function loadMyInsuranceStore(): MyInsuranceLocalStore {
  return readRawStore();
}

export function getActivePlan(store?: MyInsuranceLocalStore): CoveragePlan | null {
  const s = store ?? readRawStore();
  if (!s.activePlanId) return s.plans.find((p) => p.status === 'active') ?? s.plans[0] ?? null;
  return s.plans.find((p) => p.id === s.activePlanId) ?? null;
}

export function getProvidersForPlan(
  planId: string,
  store?: MyInsuranceLocalStore
): SavedProvider[] {
  const s = store ?? readRawStore();
  const plan = s.plans.find((p) => p.id === planId);
  if (!plan) return [];
  const byId = new Map(s.savedProviders.map((p) => [p.id, p]));
  return plan.savedProviderIds
    .map((id) => byId.get(id))
    .filter((p): p is SavedProvider => Boolean(p));
}

export type EnsurePlanInput = {
  label?: string;
  protectFocus?: ProtectFocus[];
  location?: CoveragePlan['location'];
  notes?: string;
};

/** Ensure an active plan exists; create default if needed. */
export function ensureActivePlan(input: EnsurePlanInput = {}): CoveragePlan {
  const store = readRawStore();
  const existing = getActivePlan(store);
  if (existing) {
    if (
      input.label ||
      input.protectFocus ||
      input.location ||
      typeof input.notes === 'string'
    ) {
      return updatePlan(existing.id, input) ?? existing;
    }
    return existing;
  }
  const ts = nowIso();
  const plan: CoveragePlan = {
    id: newId(),
    label: input.label?.trim() || 'My coverage research',
    protectFocus: input.protectFocus ?? [],
    location: input.location,
    notes: input.notes,
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
    savedProviderIds: [],
  };
  store.plans = [plan, ...store.plans.filter((p) => p.id !== plan.id)];
  store.activePlanId = plan.id;
  writeStore(store);
  return plan;
}

export function updatePlan(
  planId: string,
  patch: Partial<
    Pick<CoveragePlan, 'label' | 'protectFocus' | 'location' | 'notes' | 'status'>
  >
): CoveragePlan | null {
  const store = readRawStore();
  const idx = store.plans.findIndex((p) => p.id === planId);
  if (idx < 0) return null;
  const next: CoveragePlan = {
    ...store.plans[idx],
    ...patch,
    label: patch.label?.trim() || store.plans[idx].label,
    updatedAt: nowIso(),
  };
  store.plans[idx] = next;
  writeStore(store);
  return next;
}

export type SaveProviderInput = {
  providerSlug: string;
  providerName: string;
  providerId?: string;
  city?: string;
  state?: string;
  profilePath?: string;
  status?: ProviderResearchStatus;
  notes?: string;
  planId?: string;
};

export function saveProviderToPlan(input: SaveProviderInput): SavedProvider {
  const store = readRawStore();
  let plan =
    (input.planId
      ? store.plans.find((p) => p.id === input.planId)
      : getActivePlan(store)) ?? null;
  if (!plan) {
    plan = ensureActivePlan();
    // re-read after ensure
    Object.assign(store, readRawStore());
    plan = getActivePlan(store)!;
  }

  const existing = store.savedProviders.find(
    (p) => p.providerSlug === input.providerSlug && (p.planId === plan!.id || !p.planId)
  );
  const ts = nowIso();

  if (existing) {
    const updated: SavedProvider = {
      ...existing,
      providerName: input.providerName || existing.providerName,
      providerId: input.providerId ?? existing.providerId,
      city: input.city ?? existing.city,
      state: input.state ?? existing.state,
      profilePath: input.profilePath ?? existing.profilePath ?? `/providers/${input.providerSlug}`,
      status: input.status ?? existing.status,
      notes: input.notes ?? existing.notes,
      planId: plan.id,
      updatedAt: ts,
    };
    store.savedProviders = store.savedProviders.map((p) =>
      p.id === existing.id ? updated : p
    );
    if (!plan.savedProviderIds.includes(existing.id)) {
      plan.savedProviderIds = [existing.id, ...plan.savedProviderIds];
    }
    plan.updatedAt = ts;
    store.plans = store.plans.map((p) => (p.id === plan!.id ? plan! : p));
    store.activePlanId = plan.id;
    writeStore(store);
    return updated;
  }

  const saved: SavedProvider = {
    id: newId(),
    planId: plan.id,
    providerSlug: input.providerSlug,
    providerName: input.providerName,
    providerId: input.providerId,
    status: input.status ?? 'shortlisted',
    notes: input.notes,
    profilePath: input.profilePath ?? `/providers/${input.providerSlug}`,
    city: input.city,
    state: input.state,
    createdAt: ts,
    updatedAt: ts,
  };
  store.savedProviders = [saved, ...store.savedProviders].slice(0, MAX_SAVED_PROVIDERS);
  plan.savedProviderIds = [saved.id, ...plan.savedProviderIds.filter((id) => id !== saved.id)];
  plan.updatedAt = ts;
  store.plans = store.plans.map((p) => (p.id === plan!.id ? plan! : p));
  store.activePlanId = plan.id;
  writeStore(store);
  return saved;
}

export function removeProviderFromPlan(providerSlug: string, planId?: string): void {
  const store = readRawStore();
  const plan = planId
    ? store.plans.find((p) => p.id === planId)
    : getActivePlan(store);
  const toRemove = store.savedProviders.filter(
    (p) =>
      p.providerSlug === providerSlug &&
      (!plan || p.planId === plan.id || plan.savedProviderIds.includes(p.id))
  );
  if (toRemove.length === 0) return;
  const removeIds = new Set(toRemove.map((p) => p.id));
  store.savedProviders = store.savedProviders.filter((p) => !removeIds.has(p.id));
  store.plans = store.plans.map((p) => ({
    ...p,
    savedProviderIds: p.savedProviderIds.filter((id) => !removeIds.has(id)),
    updatedAt: nowIso(),
  }));
  writeStore(store);
}

export function updateSavedProviderStatus(
  savedId: string,
  status: ProviderResearchStatus
): SavedProvider | null {
  const store = readRawStore();
  const idx = store.savedProviders.findIndex((p) => p.id === savedId);
  if (idx < 0) return null;
  const next = { ...store.savedProviders[idx], status, updatedAt: nowIso() };
  store.savedProviders[idx] = next;
  writeStore(store);
  return next;
}

export function isProviderSaved(providerSlug: string, store?: MyInsuranceLocalStore): boolean {
  const s = store ?? readRawStore();
  const plan = getActivePlan(s);
  if (!plan) return s.savedProviders.some((p) => p.providerSlug === providerSlug);
  const ids = new Set(plan.savedProviderIds);
  return s.savedProviders.some(
    (p) => p.providerSlug === providerSlug && (ids.has(p.id) || p.planId === plan.id)
  );
}

export function clearAllGuestPlans(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(MY_INSURANCE_STORE_KEY);
  localStorage.removeItem(GUEST_SAVED_PROVIDERS_KEY);
  window.dispatchEvent(new CustomEvent('ith-my-insurance-store'));
}
