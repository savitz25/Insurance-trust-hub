/**
 * Phase 6A — public listing honesty for providers & hub agents.
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

export function isSeedProviderId(id: string | null | undefined): boolean {
  if (!id) return true;
  return (
    id.startsWith('fallback-') ||
    id.startsWith('seed-') ||
    id.includes('-agent-') // generated hub agents
  );
}

export function classifyProviderListing(provider: Provider): PublicListingClass {
  if (isSeedProviderId(provider.id)) return 'seed';
  const license = cleanLicenseNumber(provider.license_number);
  if (license && provider.is_verified) return 'indexable_research';
  if (license) return 'pending_verification';
  return 'seed';
}

export function classifyHubAgentListing(agent: HubAgent): PublicListingClass {
  if (isSeedProviderId(agent.id) || /-agent-\d+$/.test(agent.id)) return 'seed';
  const license = cleanLicenseNumber(agent.licenseNumber);
  // Curated agents with pseudo-licenses are not indexable research
  if (!license) return 'seed';
  if (agent.isVerified && license) return 'indexable_research';
  return 'pending_verification';
}

export function isIndexableListing(cls: PublicListingClass): boolean {
  return cls === 'indexable_research';
}

export function allowContactForm(cls: PublicListingClass): boolean {
  if (PROVENANCE_RULES.seedNoContactForm && cls === 'seed') return false;
  // Path A default: only verified/indexable research entities
  return cls === 'indexable_research';
}

export type PublicProviderView = {
  listingClass: PublicListingClass;
  verification: InsuranceVerificationDisplay;
  phone: string | null;
  /** Suppress synthetic star/count display */
  showReviews: boolean;
  rating: number | null;
  reviewCount: number | null;
  yearsInBusiness: number | null;
  showTrustScore: boolean;
  trustScore: number | null;
  carriers: string[];
  showCarriers: boolean;
};

/**
 * Gate trust-bearing fields for public provider surfaces.
 * Seed / empty inputs → suppress, never paint as verified research.
 */
export function toPublicProviderView(provider: Provider): PublicProviderView {
  const listingClass = classifyProviderListing(provider);
  const verification = resolveInsuranceVerification({
    licenseNumber: provider.license_number,
    licenseState: provider.state,
    isVerified: listingClass === 'seed' ? false : provider.is_verified,
  });

  const seed = listingClass === 'seed';
  const phone = seed ? null : publicDisplayPhone(provider.phone);

  // Seed catalogs invent ratings — never show as independent reviews
  const showReviews = !seed && provider.review_count > 0 && provider.rating > 0;
  // Years only when not pure seed theater
  const yearsInBusiness = seed ? null : provider.years_in_business ?? null;
  // Carriers claimed on seed rows are not appointments evidence
  const showCarriers = !seed && (provider.carriers?.length ?? 0) > 0;

  // Score: only when re-checkable license exists (minimum verified input)
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
    showReviews: false, // generated/curated review counts are not independently verified
    rating: null,
    reviewCount: null,
    showTrustScore: hasLicense && !seed,
    trustScore: hasLicense && !seed ? agent.trustScore : null,
    showReviewHighlight: false,
    showAwards: !seed && (agent.awards?.length ?? 0) > 0,
    showResponseTime: false, // no measured provenance on seed hubs
  };
}
