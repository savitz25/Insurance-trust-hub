/**
 * Auth continuity: guest localStorage is never wiped on sign-in/out.
 * Cloud is optional overlay — merge by providerSlug (union).
 *
 * See docs/MY-INSURANCE-AUTH-CONTINUITY.md
 */
import type { GuestSavedProvider } from '@/lib/my-insurance/types';
import { getGuestSavedProviders } from '@/lib/my-insurance/guest-storage';
import {
  ensureActivePlan,
  loadMyInsuranceStore,
  upsertSavedProvider,
} from '@/lib/my-insurance/storage';

/** Collect every local provider (Phase A store + legacy key) for cloud import. */
export function collectLocalProvidersForMerge(): GuestSavedProvider[] {
  if (typeof window === 'undefined') return [];

  const bySlug = new Map<string, GuestSavedProvider>();

  // Phase A primary store
  try {
    const state = loadMyInsuranceStore();
    for (const p of state.savedProviders) {
      if (!p?.providerSlug) continue;
      bySlug.set(p.providerSlug, {
        providerSlug: p.providerSlug,
        providerName: p.providerName || p.providerSlug,
        savedAt: p.savedAt || p.updatedAt || p.createdAt || new Date().toISOString(),
      });
    }
  } catch {
    /* ignore */
  }

  // Legacy list key
  for (const g of getGuestSavedProviders()) {
    if (!g?.providerSlug) continue;
    if (!bySlug.has(g.providerSlug)) {
      bySlug.set(g.providerSlug, g);
    }
  }

  return Array.from(bySlug.values());
}

export function localProviderSlugs(): string[] {
  return collectLocalProvidersForMerge().map((p) => p.providerSlug);
}

/**
 * Pull cloud-only rows into local guest store so HQ never shows empty
 * when either side has data. Uses researching status to avoid shortlist cap fights.
 * Returns count of newly added local rows.
 */
export function importCloudProvidersIntoLocal(
  cloud: Array<{ provider_slug: string; provider_name: string }>
): number {
  if (typeof window === 'undefined' || !cloud.length) return 0;
  ensureActivePlan({ label: 'My coverage research' });
  const existing = new Set(localProviderSlugs());
  let added = 0;
  for (const row of cloud) {
    const slug = row.provider_slug?.trim();
    if (!slug || existing.has(slug)) continue;
    const res = upsertSavedProvider({
      providerSlug: slug,
      providerName: row.provider_name || slug,
      profilePath: `/providers/${slug}`,
      status: 'researching',
      shortlistPolicy: 'block',
    });
    if (res.ok && res.created) {
      added += 1;
      existing.add(slug);
    } else if (res.ok) {
      existing.add(slug);
    } else {
      // shortlist full — still try as researching (already default on block for new)
      // if block returned without create, force researching path:
      const retry = upsertSavedProvider({
        providerSlug: slug,
        providerName: row.provider_name || slug,
        profilePath: `/providers/${slug}`,
        status: 'researching',
      });
      if (retry.ok) {
        added += retry.created ? 1 : 0;
        existing.add(slug);
      }
    }
  }
  return added;
}

/** Union badge count: local plan providers + compare tray size fallback handled by callers. */
export function localSavedCount(): number {
  return collectLocalProvidersForMerge().length;
}
