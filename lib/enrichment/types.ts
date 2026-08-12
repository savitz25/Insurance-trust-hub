/**
 * Phase 6B2 — secondary consumer signals (Google Places + BBB).
 * Snapshots are not DOI verification. Never promote seed via enrichment.
 */

import type { ProvenanceClaim, ProvenanceMethod } from '@/lib/provenance/types';

export type EnrichmentMatchConfidence = 'high' | 'medium' | 'low' | 'none';

export type GooglePlacesSnapshot = {
  placeId?: string;
  rating?: number | null;
  reviewCount?: number | null;
  formattedPhone?: string | null;
  website?: string | null;
  formattedAddress?: string | null;
  mapsUrl?: string | null;
  businessStatus?: string | null;
  displayName?: string | null;
  checkedAt: string;
  sourceUrl?: string;
  method: ProvenanceMethod;
  matchConfidence: EnrichmentMatchConfidence;
  matchNotes?: string;
};

export type BbbSnapshot = {
  profileUrl?: string | null;
  rating?: string | null;
  accredited?: boolean | null;
  businessName?: string | null;
  checkedAt: string;
  method: ProvenanceMethod;
  matchConfidence: EnrichmentMatchConfidence;
  matchNotes?: string;
};

export type ProviderEnrichment = {
  google?: GooglePlacesSnapshot | null;
  bbb?: BbbSnapshot | null;
  lastRunAt?: string;
  skipReasons?: string[];
  operatorNotes?: string;
};

export type SecondaryClaimNumber = ProvenanceClaim<number>;
export type SecondaryClaimString = ProvenanceClaim<string>;

/** Public-safe secondary signals for UI (omit when empty). */
export type PublicSecondarySignals = {
  google: {
    rating: number | null;
    reviewCount: number | null;
    mapsUrl: string | null;
    website: string | null;
    checkedAtLabel: string | null;
    businessStatus: string | null;
  } | null;
  bbb: {
    rating: string | null;
    accredited: boolean | null;
    profileUrl: string | null;
    checkedAtLabel: string | null;
  } | null;
  disclaimer: string;
};

export const SECONDARY_SIGNALS_DISCLAIMER =
  'Public web signals are from third-party sources (e.g. Google) and are not part of license verification. Snapshots may change; re-check sources before buying coverage.';

export const ENRICHMENT_RULES = {
  onlyIndexableResearch: true,
  neverCreateSeed: true,
  neverGrantLicenseVerified: true,
  noAggregateRatingFromSnapshots: true,
  minMatchConfidence: 'high' as EnrichmentMatchConfidence,
  /** Cap third-party reputation weight in research score (max points) */
  maxGoogleReputationPoints: 12,
  maxBbbPoints: 6,
} as const;
