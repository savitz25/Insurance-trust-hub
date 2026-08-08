import type { Provider } from '@/types/provider';
import type { Provider as DbProvider } from '@/types/supabase';
import type { InsuranceType, Specialty } from '@/lib/constants';
import type { ProviderEnrichment } from '@/lib/enrichment/types';

/** Map Supabase provider row → public Provider (shared by queries + ops). */
export function mapRowToProvider(row: DbProvider): Provider {
  const contact = row.contact ?? {};
  const address = contact.address;
  const license = row.license_info?.licenses?.[0];
  const enrichment = (contact as { enrichment?: ProviderEnrichment }).enrichment ?? null;

  // Prefer provenance-labeled Google snapshot for display rating when present
  const g = enrichment?.google;
  const useGoogleSnap =
    g &&
    g.matchConfidence === 'high' &&
    g.rating != null &&
    (g.reviewCount ?? 0) > 0;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logo: null,
    short_description: row.short_description,
    description: row.description,
    city: address?.city ?? row.cities[0] ?? '',
    state: address?.state ?? row.states_licensed[0] ?? '',
    zip: address?.zip ?? null,
    phone: contact.phone ?? null,
    website: contact.website ?? null,
    insurance_types: row.categories as InsuranceType[],
    specialties: row.specialties as Specialty[],
    // Catalog rating columns are not ITH first-party reviews; prefer Google snap or 0
    rating: useGoogleSnap ? Number(g!.rating) : 0,
    review_count: useGoogleSnap ? Number(g!.reviewCount ?? 0) : 0,
    is_verified: row.verified,
    license_number: license?.license_number ?? null,
    license_state: license?.state ?? null,
    license_source: license?.source ?? null,
    license_source_url: license?.verification_url ?? null,
    license_checked_at: license?.checkedAt ?? null,
    license_method: license?.method ?? null,
    license_notes: license?.notes ?? null,
    license_identity_match_accepted: license?.identityMatchAccepted ?? null,
    years_in_business: row.years_in_business,
    bbb_rating: enrichment?.bbb?.rating ?? undefined,
    enrichment,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
