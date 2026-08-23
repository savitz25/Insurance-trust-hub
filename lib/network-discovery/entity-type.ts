import type {
  DiscoveryEntityType,
  SourceProviderType,
} from '@/lib/network-discovery/types';

/**
 * Map InsuranceTrustHub provider_type → Ask discovery entity_type.
 *
 * Product storage: DFS/TDI/etc. business entities are `brokerage`.
 * Consumer language still calls them agencies. We preserve the source
 * type and emit insurance_brokerage for brokerage rows so Ask can
 * distinguish without collapsing the feed.
 *
 * medicare_agent is never emitted. CMS enrollment is not modeled.
 */
export function mapProviderEntityType(
  providerType: SourceProviderType
): DiscoveryEntityType {
  if (providerType === 'independent_agent') return 'insurance_agent';
  if (providerType === 'brokerage') return 'insurance_brokerage';
  return 'insurance_agency';
}

export function isAgencyLike(type: DiscoveryEntityType): boolean {
  return type === 'insurance_agency' || type === 'insurance_brokerage';
}

export function isSupportedDiscoveryType(type: string): type is DiscoveryEntityType {
  return (
    type === 'insurance_agency' ||
    type === 'insurance_agent' ||
    type === 'insurance_brokerage' ||
    type === 'insurance_carrier' ||
    type === 'medicare_agent'
  );
}
