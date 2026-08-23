/**
 * InsuranceTrustHub → Ask Network Discovery v1 types.
 *
 * PILOT / NOT YET CONSUMED BY ASK PRODUCTION.
 * This module does not import into AskTrustHub and does not
 * change Ask parser behavior.
 */

export const ASK_NETWORK_DISCOVERY_SCHEMA = 'ask-network-discovery-v1' as const;
export const INSURANCE_HUB = 'insurance' as const;
export const CANONICAL_HOST = 'www.insurancetrusthub.com';
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

export const PILOT_BANNER =
  'PILOT / NOT YET CONSUMED BY ASK PRODUCTION';

export const DISCOVERY_ENTITY_TYPES = [
  'insurance_agency',
  'insurance_agent',
  'insurance_brokerage',
  'insurance_carrier',
  'medicare_agent',
] as const;

export type DiscoveryEntityType = (typeof DISCOVERY_ENTITY_TYPES)[number];

export const SOURCE_PROVIDER_TYPES = [
  'independent_agent',
  'brokerage',
  'specialist',
] as const;

export type SourceProviderType = (typeof SOURCE_PROVIDER_TYPES)[number];

export const DISCOVERY_STATUSES = [
  'eligible',
  'ineligible',
  'identity_incomplete',
  'geo_incomplete',
  'category_unverified',
] as const;

export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export const MEDICARE_READINESS = ['READY', 'SOFT', 'UNSUPPORTED'] as const;
export type MedicareReadiness = (typeof MEDICARE_READINESS)[number];

export const FORBIDDEN_EXPORT_KEYS = [
  'email',
  'phone',
  'telephone',
  'ssn',
  'social_security',
  'password',
  'secret',
  'credential',
  'trust_score',
  'trustScore',
  'rating',
  'review',
  'popularity',
  'premium',
  'Premium',
  'paid_boost',
  'ranking_boost',
  'internal_notes',
  'npi_index',
  'raw_regulator',
] as const;

export type PhysicalLocation = {
  city: string | null;
  state: string | null;
  postal_code: string | null;
  county: string | null;
  country: 'US';
};

export type DiscoveryEntity = {
  network_id: string;
  source_table: 'providers' | 'carrier_registry';
  source_pk: string;
  entity_type: DiscoveryEntityType;
  source_provider_type: SourceProviderType | 'carrier' | null;
  display_name: string;
  slug: string;
  profile_url: string;
  physical_location: PhysicalLocation;
  licensed_service_states: string[];
  license_state: string | null;
  categories: string[];
  medicare_category: boolean;
  medicare_entity_class: false;
  discovery_status: DiscoveryStatus;
  identity_kind: 'doi_license' | 'npn' | 'provider_uuid' | 'carrier_slug';
};

export type DiscoveryFeed = {
  schema_version: typeof ASK_NETWORK_DISCOVERY_SCHEMA;
  hub: typeof INSURANCE_HUB;
  generated_at: string;
  source_version: string;
  entity_count: number;
  fingerprint: string;
  banner: typeof PILOT_BANNER;
  entities: DiscoveryEntity[];
};

export type IneligibilityReason =
  | 'not_public_directory'
  | 'unverified'
  | 'seed_or_fallback'
  | 'trust_state_not_verified'
  | 'missing_slug'
  | 'missing_display_name'
  | 'malformed_profile_url'
  | 'wrong_host'
  | 'identity_incomplete'
  | 'unsupported_entity_class'
  | 'carrier_is_resource';

export type EligibilityRecord = {
  source_table: 'providers' | 'carrier_registry';
  source_pk: string;
  eligible: boolean;
  reasons: IneligibilityReason[];
  entity: DiscoveryEntity | null;
};

export type QueryMatchReason =
  | 'entity_type_match'
  | 'category_match'
  | 'physical_city'
  | 'physical_state'
  | 'licensed_service_state'
  | 'other_explicit_service_geography';

export type QueryExampleResult = {
  query: string;
  match_count: number;
  matches: Array<{
    network_id: string;
    display_name: string;
    entity_type: DiscoveryEntityType;
    reasons: QueryMatchReason[];
  }>;
  notes: string;
};

export const PILOT_MIN = 100;
export const PILOT_TARGET = 180;
export const PILOT_MAX = 250;

export const MEDICARE_ENTITY_READINESS: MedicareReadiness = 'UNSUPPORTED';
