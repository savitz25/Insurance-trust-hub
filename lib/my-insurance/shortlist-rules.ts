/**
 * Phase B — shortlist discipline (My Move–like top list).
 * Caps apply per active plan, unique by providerSlug.
 */

import type { CoveragePlan, ProviderResearchStatus, SavedProvider } from '@/lib/my-insurance/plan-types';

/** Max providers with status shortlisted per active plan */
export const SHORTLIST_CAP = 3;

/** Soft guidance for researching (not a hard block at this number) */
export const RESEARCHING_SOFT_CAP = 10;

export function providersOnPlan(
  plan: CoveragePlan,
  all: SavedProvider[]
): SavedProvider[] {
  const ids = new Set(plan.savedProviderIds);
  return all.filter((p) => ids.has(p.id) || p.planId === plan.id);
}

export function countByStatus(
  providers: SavedProvider[],
  status: ProviderResearchStatus
): number {
  return providers.filter((p) => p.status === status).length;
}

export function getShortlisted(providers: SavedProvider[]): SavedProvider[] {
  return providers
    .filter((p) => p.status === 'shortlisted')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getResearching(providers: SavedProvider[]): SavedProvider[] {
  return providers
    .filter((p) => p.status === 'researching')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getHistory(providers: SavedProvider[]): SavedProvider[] {
  return providers
    .filter((p) => p.status === 'reached_out' || p.status === 'done')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/**
 * Whether setting target status to shortlisted would exceed cap,
 * excluding the provider being updated (if already on plan).
 */
export function wouldExceedShortlist(
  planProviders: SavedProvider[],
  nextStatus: ProviderResearchStatus,
  providerSlug: string
): boolean {
  if (nextStatus !== 'shortlisted') return false;
  const shortlisted = getShortlisted(planProviders);
  const alreadyShortlisted = shortlisted.some((p) => p.providerSlug === providerSlug);
  if (alreadyShortlisted) return false;
  return shortlisted.length >= SHORTLIST_CAP;
}

export type ShortlistGateResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'shortlist_full';
      shortlisted: SavedProvider[];
      message: string;
    };

export function gateShortlistAdd(
  planProviders: SavedProvider[],
  providerSlug: string,
  desiredStatus: ProviderResearchStatus
): ShortlistGateResult {
  if (!wouldExceedShortlist(planProviders, desiredStatus, providerSlug)) {
    return { ok: true };
  }
  const shortlisted = getShortlisted(planProviders);
  return {
    ok: false,
    reason: 'shortlist_full',
    shortlisted,
    message: `Shortlist is full (${SHORTLIST_CAP}). Move one to Researching or Done, or replace.`,
  };
}
