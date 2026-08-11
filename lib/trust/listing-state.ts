/**
 * Phase 0 — single source of truth for consumer-visible listing state.
 *
 * Never surface seed / illustrative inventory as research.
 * Never claim verified inventory that is not rendered.
 */

import type { PublicListingClass } from '@/lib/provenance/types';
import { isIndexableListing } from '@/lib/provenance/public-listing';

/** Consumer-facing trust states (seed is never consumer-visible). */
export type ConsumerListingState = 'verified' | 'pending_verification' | 'unavailable';

/**
 * Map internal listing class → consumer state.
 * Returns null for seed — callers must hide the row entirely.
 */
export function toConsumerListingState(
  listingClass: PublicListingClass
): ConsumerListingState | null {
  if (listingClass === 'seed') return null;
  if (listingClass === 'indexable_research') return 'verified';
  if (listingClass === 'pending_verification') return 'pending_verification';
  return 'unavailable';
}

export function isConsumerVisibleListing(listingClass: PublicListingClass): boolean {
  return toConsumerListingState(listingClass) === 'verified';
}

export function isVerifiedResearchListing(listingClass: PublicListingClass): boolean {
  return isIndexableListing(listingClass);
}

/** Honest empty-market / empty-directory copy (no seed disclaimers as product). */
export const EMPTY_MARKET_COPY = {
  hero:
    'We’re still verifying agencies in this market. No verified listings are shown yet.',
  section:
    'We’re still verifying agencies for this market. No verified listings are shown yet.',
  health:
    'No verified health-specialist listings yet. Use license verification and official Marketplace tools while we expand verified research inventory.',
  multiLine:
    'No verified multi-line agency listings yet — honesty over fake completeness.',
  scoreLabel: 'Research score',
  scoreUnavailable: 'Not available yet',
  directoryEmpty:
    'No agencies currently meet our public research standard. Empty markets stay empty — we will not invent inventory.',
} as const;

export function verifiedCountLabel(count: number): string {
  if (count <= 0) return EMPTY_MARKET_COPY.hero;
  if (count === 1) return '1 verified research listing';
  return `${count} verified research listings`;
}

export function verifiedCountWithHealth(total: number, health: number): string {
  if (total <= 0) return EMPTY_MARKET_COPY.hero;
  const healthPart =
    health > 0
      ? ` · ${health} health-focused`
      : '';
  return `${verifiedCountLabel(total)}${healthPart}`;
}
