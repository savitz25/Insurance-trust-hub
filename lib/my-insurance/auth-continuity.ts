/**
 * Auth continuity: guest localStorage is never wiped on sign-in/out.
 * Multi-plan (Phase D): providers are plan-scoped; union by (planId, providerSlug).
 *
 * See docs/MY-INSURANCE-AUTH-CONTINUITY.md and docs/MY-INSURANCE-PHASE-D.md
 */
import type { GuestSavedProvider } from '@/lib/my-insurance/types';
import { getGuestSavedProviders } from '@/lib/my-insurance/guest-storage';
import {
  ensureActivePlan,
  getActivePlan,
  loadMyInsuranceStore,
  upsertSavedProvider,
} from '@/lib/my-insurance/storage';

function planSlugKey(planId: string | null | undefined, slug: string): string {
  return `${planId || '_'}::${slug}`;
}

/**
 * Collect local providers for cloud import (flat slug list for Supabase).
 * Identity for cloud is still providerSlug; local multi-plan is preserved separately.
 * Does not use createdAt for merge identity (only optional savedAt stamp).
 */
export function collectLocalProvidersForMerge(): GuestSavedProvider[] {
  if (typeof window === 'undefined') return [];

  const bySlug = new Map<string, GuestSavedProvider>();

  try {
    const state = loadMyInsuranceStore();
    for (const p of state.savedProviders) {
      if (!p?.providerSlug) continue;
      // Prefer newer stamp only when both exist — never invent merge identity from createdAt
      const stamp = p.savedAt || p.updatedAt || p.createdAt;
      const prev = bySlug.get(p.providerSlug);
      if (!prev) {
        bySlug.set(p.providerSlug, {
          providerSlug: p.providerSlug,
          providerName: p.providerName || p.providerSlug,
          savedAt: stamp || new Date().toISOString(),
        });
        continue;
      }
      // Sparingly: only replace if both have timestamps and this one is newer
      if (stamp && prev.savedAt && stamp > prev.savedAt) {
        bySlug.set(p.providerSlug, {
          providerSlug: p.providerSlug,
          providerName: p.providerName || prev.providerName,
          savedAt: stamp,
        });
      }
    }
  } catch {
    /* ignore */
  }

  for (const g of getGuestSavedProviders()) {
    if (!g?.providerSlug) continue;
    if (!bySlug.has(g.providerSlug)) {
      bySlug.set(g.providerSlug, g);
    }
  }

  return Array.from(bySlug.values());
}

/** All local slugs (any plan) — for badge / cloud∪local Save state. */
export function localProviderSlugs(): string[] {
  return collectLocalProvidersForMerge().map((p) => p.providerSlug);
}

/** Local keys as planId::slug for plan-scoped membership checks. */
export function localPlanSlugKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const state = loadMyInsuranceStore();
    const keys = new Set<string>();
    for (const p of state.savedProviders) {
      if (!p?.providerSlug) continue;
      keys.add(planSlugKey(p.planId, p.providerSlug));
    }
    return keys;
  } catch {
    return new Set();
  }
}

/**
 * Snapshot plan library so callers can assert merge never drops plans.
 * Cloud has no plan table — empty cloud must not affect plans[] / activePlanId.
 */
export function snapshotLocalPlans(): {
  planCount: number;
  activePlanId: string | null;
  planIds: string[];
} {
  if (typeof window === 'undefined') {
    return { planCount: 0, activePlanId: null, planIds: [] };
  }
  try {
    const state = loadMyInsuranceStore();
    return {
      planCount: state.plans.length,
      activePlanId: state.activePlanId,
      planIds: state.plans.map((p) => p.id),
    };
  } catch {
    return { planCount: 0, activePlanId: null, planIds: [] };
  }
}

/**
 * Pull cloud-only rows into the **active** plan when missing as (activePlanId, slug).
 * Never deletes plans or providers. Never prefers empty cloud over local.
 * Returns count of newly added local rows.
 */
export function importCloudProvidersIntoLocal(
  cloud: Array<{ provider_slug: string; provider_name: string }>
): number {
  if (typeof window === 'undefined' || !cloud.length) return 0;

  // Preserve multi-plan library: only ensure an active plan exists for attachment
  const before = snapshotLocalPlans();
  const active = ensureActivePlan({ label: 'My coverage research' });
  const afterEnsure = snapshotLocalPlans();
  // ensureActivePlan may create one plan if empty — never allowed to drop existing
  if (before.planCount > 0 && afterEnsure.planCount < before.planCount) {
    if (typeof console !== 'undefined') {
      console.warn('[my-insurance] importCloud refused: plan count decreased');
    }
    return 0;
  }

  const existingKeys = localPlanSlugKeys();
  let added = 0;

  for (const row of cloud) {
    const slug = row.provider_slug?.trim();
    if (!slug) continue;
    // Union by (planId, providerSlug) — same slug may exist on another plan
    if (existingKeys.has(planSlugKey(active.id, slug))) continue;

    const res = upsertSavedProvider({
      providerSlug: slug,
      providerName: row.provider_name || slug,
      profilePath: `/providers/${slug}`,
      planId: active.id,
      status: 'researching',
      shortlistPolicy: 'block',
    });
    if (res.ok) {
      if (res.created) added += 1;
      existingKeys.add(planSlugKey(active.id, slug));
    } else {
      const retry = upsertSavedProvider({
        providerSlug: slug,
        providerName: row.provider_name || slug,
        profilePath: `/providers/${slug}`,
        planId: active.id,
        status: 'researching',
      });
      if (retry.ok) {
        if (retry.created) added += 1;
        existingKeys.add(planSlugKey(active.id, slug));
      }
    }
  }

  // Final guard: never leave fewer plans than we started with
  const end = snapshotLocalPlans();
  if (before.planCount > 0 && end.planCount < before.planCount) {
    if (typeof console !== 'undefined') {
      console.error('[my-insurance] plan library shrink detected after cloud import');
    }
  }

  return added;
}

/** Union badge count helper. */
export function localSavedCount(): number {
  return collectLocalProvidersForMerge().length;
}

/** Active plan shortlist/researching count for badges that should match HQ. */
export function activePlanProviderCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const plan = getActivePlan();
    if (!plan) return 0;
    const state = loadMyInsuranceStore();
    return state.savedProviders.filter(
      (p) => p.planId === plan.id || plan.savedProviderIds.includes(p.id)
    ).length;
  } catch {
    return 0;
  }
}
