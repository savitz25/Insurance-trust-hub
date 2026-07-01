import type { InsuranceType, Specialty } from '@/lib/constants';

export interface Provider {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  short_description?: string | null;
  description?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  insurance_types: InsuranceType[];
  specialties: Specialty[];
  rating: number;
  review_count: number;
  is_verified: boolean;
  license_number?: string | null;
  years_in_business?: number | null;
  trust_score?: number;
  local_market_experience?: number;
  avg_response_hours?: number;
  bbb_rating?: string;
  carriers?: string[];
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