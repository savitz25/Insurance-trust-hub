import type { Provider } from '@/types/provider';
import type { ProviderType } from '@/types/supabase';
import type { CarrierRegistryEntry } from '@/lib/carriers/registry';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import type { Provider as DbProvider } from '@/types/supabase';
import { normalizeCategories, hasMedicareCategory } from '@/lib/network-discovery/categories';
import { mapProviderEntityType } from '@/lib/network-discovery/entity-type';
import {
  extractLicensedStates,
  extractPhysicalLocation,
} from '@/lib/network-discovery/geography';
import {
  buildCarrierIdentity,
  buildProviderIdentity,
} from '@/lib/network-discovery/identity';
import type { DiscoveryEntity, SourceProviderType } from '@/lib/network-discovery/types';
import {
  carrierProfileUrl,
  providerProfileUrl,
} from '@/lib/network-discovery/urls';

export type NormalizedCandidate = {
  mapped: Provider;
  providerType: SourceProviderType;
  entity: DiscoveryEntity;
  npn: string | null;
};

function asSourceProviderType(value: ProviderType | string): SourceProviderType | null {
  if (
    value === 'independent_agent' ||
    value === 'brokerage' ||
    value === 'specialist'
  ) {
    return value;
  }
  return null;
}

function addressOf(row: DbProvider) {
  return row.contact?.address ?? null;
}

/**
 * Normalize a providers-table row into a discovery entity (status filled later).
 * Does not copy phone, email, ratings, or regulator blobs.
 */
export function normalizeProviderRow(
  row: DbProvider,
  npn?: string | null
): NormalizedCandidate | null {
  const providerType = asSourceProviderType(row.provider_type);
  if (!providerType) return null;

  const mapped = mapRowToProvider(row);
  const licenseNumber = mapped.license_number;
  const licenseState = mapped.license_state;
  const identity = buildProviderIdentity({
    id: row.id,
    licenseNumber,
    licenseState,
    npn: npn ?? null,
  });
  if (!identity) return null;

  const addr = addressOf(row);
  const physical = extractPhysicalLocation({
    addressCity: addr?.city,
    addressState: addr?.state,
    addressZip: addr?.zip,
    county: row.contact?.county ?? null,
    cities: row.cities,
  });
  const licensed = extractLicensedStates({
    statesLicensed: row.states_licensed,
    licenseState,
  });
  const categories = normalizeCategories(row.categories);

  const entity: DiscoveryEntity = {
    network_id: identity.network_id,
    source_table: 'providers',
    source_pk: row.id,
    entity_type: mapProviderEntityType(providerType),
    source_provider_type: providerType,
    display_name: (row.name || '').trim(),
    slug: (row.slug || '').trim(),
    profile_url: providerProfileUrl((row.slug || '').trim()),
    physical_location: physical,
    licensed_service_states: licensed.states,
    license_state: licensed.license_state,
    categories,
    medicare_category: hasMedicareCategory(categories),
    medicare_entity_class: false,
    discovery_status: 'ineligible',
    identity_kind: identity.identity_kind,
  };

  return { mapped, providerType, entity, npn: npn ?? null };
}

export function normalizeCarrierEntry(
  entry: CarrierRegistryEntry
): DiscoveryEntity {
  const identity = buildCarrierIdentity(entry.slug);
  return {
    network_id: identity.network_id,
    source_table: 'carrier_registry',
    source_pk: entry.slug,
    entity_type: 'insurance_carrier',
    source_provider_type: 'carrier',
    display_name: entry.displayName.trim(),
    slug: entry.slug,
    profile_url: carrierProfileUrl(entry.slug),
    physical_location: {
      city: null,
      state: null,
      postal_code: null,
      county: null,
      country: 'US',
    },
    licensed_service_states: [],
    license_state: null,
    categories: [],
    medicare_category: false,
    medicare_entity_class: false,
    discovery_status: 'ineligible',
    identity_kind: identity.identity_kind,
  };
}
