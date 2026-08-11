/**
 * @deprecated Phase 1 — import from @/lib/insurance/trust/provider-trust-state instead.
 * Kept for Phase 0 call sites during migration.
 */

export {
  type TrustState as ConsumerListingState,
  EMPTY_MARKET_COPY,
  verifiedCountLabel,
  verifiedCountWithHealth,
  canShowAsVerified,
  canShowInPublicDirectory,
  trustStateFromListingClass,
} from '@/lib/insurance/trust/provider-trust-state';

import type { PublicListingClass } from '@/lib/provenance/types';
import {
  canShowAsVerified,
  trustStateFromListingClass,
} from '@/lib/insurance/trust/provider-trust-state';

/** Map listing class → whether the row may render as verified inventory. */
export function isConsumerVisibleListing(listingClass: PublicListingClass): boolean {
  return canShowAsVerified(trustStateFromListingClass(listingClass));
}

/** Alias: indexable research only. */
export function isVerifiedResearchListing(listingClass: PublicListingClass): boolean {
  return canShowAsVerified(trustStateFromListingClass(listingClass));
}

/** @deprecated use trustStateFromListingClass */
export function toConsumerListingState(listingClass: PublicListingClass) {
  const state = trustStateFromListingClass(listingClass);
  // Phase 0 returned null for seed; Phase 1 maps seed → unavailable
  return state;
}
