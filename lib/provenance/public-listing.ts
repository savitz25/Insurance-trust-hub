/**
 * Phase 6A + 6B1 — public listing honesty for providers & hub agents.
 */

import type { Provider } from '@/types/provider';
import type { HubAgent } from '@/types/agent';
import {
  cleanLicenseNumber,
  resolveInsuranceVerification,
  type InsuranceVerificationDisplay,
} from '@/lib/insurance/verification-levels';
import { publicDisplayPhone } from '@/lib/provenance/phone';
import type { PublicListingClass } from '@/lib/provenance/types';
import { PROVENANCE_RULES } from '@/lib/provenance/types';
import {
  evaluateProviderPromotion,
  isSeedProviderId,
} from '@/lib/provenance/promotion';

export { isSeedProviderId };

export function classifyProviderListing(provider: Provider): PublicListingClass {
  if (isSeedProviderId(provider.id)) return 'seed';
  // Phase 6B1: use full promotion gates (license + source + checkedAt + match)
  return evaluateProviderPromotion(provider).listingClass;
}

export function classifyHubAgentListing(agent: HubAgent): PublicListingClass {
  if (isSeedProviderId(agent.id) || /-agent-\d+$/.test(agent.id)) return 'seed';
  const license = cleanLicenseNumber(agent.licenseNumber);
  if (!license) return 'seed';
  // Hub agents lack full provenance until backfilled into providers table
  if (agent.isVerified && license) return 'pending_verification';
  return 'pending_verification';
}

export function isIndexableListing(cls: PublicListingClass): boolean {
  return cls === 'indexable_research';
}

export function allowContactForm(cls: PublicListingClass): boolean {
  if (PROVENANCE_RULES.seedNoContactForm && cls === 'seed') return false;
  return cls === 'indexable_research';
}

export type PublicProviderView = {
  listingClass: PublicListingClass;
  verification: InsuranceVerificationDisplay;
  phone: string | null;
  showReviews: boolean;
  rating: number | null;
  reviewCount: number | null;
  yearsInBusiness: number | null;
  showTrustScore: boolean;
  trustScore: number | null;
  carriers: string[];
  showCarriers: boolean;
};

export function toPublicProviderView(provider: Provider): PublicProviderView {
  const promotion = evaluateProviderPromotion(provider);
  const listingClass = promotion.listingClass;
  const verification = resolveInsuranceVerification({
    licenseNumber: provider.license_number,
    licenseState: provider.license_state ?? provider.state,
    isVerified: listingClass === 'seed' ? false : provider.is_verified,
    lastVerifiedAt: provider.license_checked_at,
    sourceLabel: provider.license_source,
    sourceUrl: provider.license_source_url,
  });

  const seed = listingClass === 'seed';
  const phone = seed ? null : publicDisplayPhone(provider.phone);
  // First-party ITH reviews only — Google snapshots render via ProviderSecondarySignals
  const showReviews = false;
  const yearsInBusiness = seed ? null : provider.years_in_business ?? null;
  const showCarriers = !seed && (provider.carriers?.length ?? 0) > 0;
  const hasMinInputs = Boolean(cleanLicenseNumber(provider.license_number));
  const showTrustScore = hasMinInputs && !seed;
  const trustScore = showTrustScore ? provider.trust_score ?? null : null;

  return {
    listingClass,
    verification,
    phone,
    showReviews,
    rating: showReviews ? provider.rating : null,
    reviewCount: showReviews ? provider.review_count : null,
    yearsInBusiness,
    showTrustScore,
    trustScore,
    carriers: showCarriers ? provider.carriers ?? [] : [],
    showCarriers,
  };
}

export type PublicHubAgentView = {
  listingClass: PublicListingClass;
  verification: InsuranceVerificationDisplay;
  phone: string | null;
  showReviews: boolean;
  rating: number | null;
  reviewCount: number | null;
  showTrustScore: boolean;
  trustScore: number | null;
  showReviewHighlight: boolean;
  showAwards: boolean;
  showResponseTime: boolean;
};

export function toPublicHubAgentView(agent: HubAgent): PublicHubAgentView {
  const listingClass = classifyHubAgentListing(agent);
  const seed = listingClass === 'seed';
  const verification = resolveInsuranceVerification({
    licenseNumber: agent.licenseNumber,
    licenseState: agent.state,
    isVerified: seed ? false : agent.isVerified,
  });
  const hasLicense = Boolean(cleanLicenseNumber(agent.licenseNumber));

  return {
    listingClass,
    verification,
    phone: seed ? null : publicDisplayPhone(agent.phone),
    showReviews: false,
    rating: null,
    reviewCount: null,
    showTrustScore: hasLicense && !seed,
    trustScore: hasLicense && !seed ? agent.trustScore : null,
    showReviewHighlight: false,
    showAwards: !seed && (agent.awards?.length ?? 0) > 0,
    showResponseTime: false,
  };
}
