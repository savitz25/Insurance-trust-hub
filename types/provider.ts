import type { InsuranceType, Specialty } from '@/lib/constants';
import type { ProviderEnrichment } from '@/lib/enrichment/types';

export interface Provider {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  short_description?: string | null;
  description?: string | null;
  city: string;
  state: string;
  /** Structured launch county when present (DFS promote contact.county) */
  county?: string | null;
  county_normalized?: string | null;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  insurance_types: InsuranceType[];
  specialties: Specialty[];
  rating: number;
  review_count: number;
  is_verified: boolean;
  license_number?: string | null;
  /** Phase 6B1 provenance — required with license for hard verified / indexable */
  license_state?: string | null;
  license_source?: string | null;
  license_source_url?: string | null;
  license_checked_at?: string | null;
  license_method?: 'manual' | 'automated' | 'operator_submitted' | 'seed' | null;
  license_notes?: string | null;
  /** Operator accepted name/identity match before attach */
  license_identity_match_accepted?: boolean | null;
  /** Medicare NPI when known from verified CMS data — never invent */
  npi?: string | null;
  years_in_business?: number | null;
  trust_score?: number;
  local_market_experience?: number;
  avg_response_hours?: number;
  bbb_rating?: string;
  carriers?: string[];
  /** Phase 6B2 secondary snapshots (Google/BBB) — never license authority */
  enrichment?: ProviderEnrichment | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderFilters {
  state?: string;
  city?: string;
  insuranceType?: InsuranceType;
  specialty?: Specialty;
  verifiedOnly?: boolean;
  minRating?: number;
  query?: string;
  limit?: number;
  offset?: number;
}