/**
 * Phase 6B2 — only enrich indexable_research entities.
 */

import type { Provider } from '@/types/provider';
import {
  evaluateProviderPromotion,
  isSeedProviderId,
} from '@/lib/provenance/promotion';

export type EnrichmentEligibility = {
  eligible: boolean;
  reasons: string[];
};

/**
 * Hard gate before any Google/BBB fetch or public secondary display.
 */
export function isEligibleForSecondaryEnrichment(
  provider: Provider
): EnrichmentEligibility {
  const reasons: string[] = [];

  if (isSeedProviderId(provider.id)) {
    return {
      eligible: false,
      reasons: ['Seed / generated / fallback entity — never enrich'],
    };
  }

  const promo = evaluateProviderPromotion(provider);
  if (promo.listingClass !== 'indexable_research') {
    reasons.push(
      `Listing class is ${promo.listingClass}, not indexable_research`
    );
    reasons.push(...promo.reasons);
    return { eligible: false, reasons };
  }

  if (!promo.canShowHardVerifiedBadge && !provider.is_verified) {
    // indexable_research should imply hard verified under 6B1; belt-and-suspenders
    reasons.push('Missing hard verified license provenance');
    return { eligible: false, reasons };
  }

  return { eligible: true, reasons: ['Eligible indexable_research profile'] };
}
