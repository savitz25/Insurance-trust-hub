/**
 * Phase 6A — structured provenance for trust-bearing fields.
 * Seed never equals verified research.
 */

export type ProvenanceStatus =
  | 'verified'
  | 'pending'
  | 'unavailable'
  | 'seed'
  | 'suppressed';

export type ProvenanceMethod =
  | 'manual'
  | 'automated'
  | 'operator_submitted'
  | 'seed';

export type ProvenanceClaim<T> = {
  value: T | null;
  status: ProvenanceStatus;
  source?: string;
  sourceUrl?: string;
  checkedAt?: string;
  method?: ProvenanceMethod;
  notes?: string;
};

/** Directory row identity provenance for indexation / contact policy. */
export type PublicListingClass =
  /** Synthetic / fallback / generated inventory — never index as research */
  | 'seed'
  /** Real operator-submitted or data-import row pending re-check */
  | 'pending_verification'
  /** Minimum identity + re-checkable license path */
  | 'indexable_research';

export const PROVENANCE_RULES = {
  seedNeverVerified: true,
  hardVerifiedRequiresLicenseNumber: true,
  hardVerifiedRequiresSource: true,
  hardVerifiedRequiresCheckedAt: true,
  /** Days after which verified checks auto-demote without refresh */
  freshnessDays: 365,
  seedNoindex: true,
  seedNoSitemap: true,
  seedNoContactForm: true,
  seedNoAggregateRatingSchema: true,
} as const;
