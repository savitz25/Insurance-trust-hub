import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import type { CarrierRegistryEntry } from '@/lib/carriers/registry';
import type { Provider as DbProvider } from '@/types/supabase';
import {
  normalizeCarrierEntry,
  normalizeProviderRow,
} from '@/lib/network-discovery/normalize';
import type {
  DiscoveryEntity,
  EligibilityRecord,
  IneligibilityReason,
} from '@/lib/network-discovery/types';
import { isValidSlug, validateCanonicalProfileUrl } from '@/lib/network-discovery/urls';

function finish(
  source_table: EligibilityRecord['source_table'],
  source_pk: string,
  reasons: IneligibilityReason[],
  entity: DiscoveryEntity | null
): EligibilityRecord {
  if (reasons.length > 0 || !entity) {
    return {
      source_table,
      source_pk,
      eligible: false,
      reasons,
      entity: entity
        ? { ...entity, discovery_status: 'ineligible' }
        : null,
    };
  }
  return {
    source_table,
    source_pk,
    eligible: true,
    reasons: [],
    entity: { ...entity, discovery_status: 'eligible' },
  };
}

/**
 * Fail-closed public-directory eligibility.
 * Same trust gates as getProviders / getProviderBySlug.
 */
export function evaluateProviderEligibility(
  row: DbProvider,
  npn?: string | null
): EligibilityRecord {
  const reasons: IneligibilityReason[] = [];
  const normalized = normalizeProviderRow(row, npn);

  if (isSeedProviderId(row.id)) {
    reasons.push('seed_or_fallback');
  }
  if (!row.verified) {
    reasons.push('unverified');
  }
  if (!row.slug || !isValidSlug(row.slug)) {
    reasons.push('missing_slug');
  }
  if (!(row.name || '').trim()) {
    reasons.push('missing_display_name');
  }
  if (!normalized) {
    reasons.push('identity_incomplete');
    return finish('providers', row.id, reasons, null);
  }

  const trust = resolveProviderTrustState(normalized.mapped);
  if (!canShowAsVerified(trust)) {
    reasons.push('trust_state_not_verified');
  }

  const urlCheck = validateCanonicalProfileUrl(
    normalized.entity.profile_url,
    'provider'
  );
  if (!urlCheck.ok) {
    if (urlCheck.reasons.includes('wrong_host') || urlCheck.reasons.includes('forbidden_host')) {
      reasons.push('wrong_host');
    } else {
      reasons.push('malformed_profile_url');
    }
  }

  if (
    normalized.entity.identity_kind === 'provider_uuid' &&
    !normalized.mapped.license_number
  ) {
    // UUID fallback is allowed only when a re-checkable license exists
    // on a verified row. Bare UUID without license is identity_incomplete.
    reasons.push('identity_incomplete');
  }

  return finish('providers', row.id, reasons, normalized.entity);
}

export function evaluateCarrierEligibility(
  entry: CarrierRegistryEntry
): EligibilityRecord {
  const reasons: IneligibilityReason[] = [];
  const entity = normalizeCarrierEntry(entry);

  if (!entry.slug || !isValidSlug(entry.slug)) {
    reasons.push('missing_slug');
  }
  if (!(entry.displayName || '').trim()) {
    reasons.push('missing_display_name');
  }

  const urlCheck = validateCanonicalProfileUrl(entity.profile_url, 'carrier');
  if (!urlCheck.ok) {
    if (urlCheck.reasons.includes('wrong_host') || urlCheck.reasons.includes('forbidden_host')) {
      reasons.push('wrong_host');
    } else {
      reasons.push('malformed_profile_url');
    }
  }

  return finish('carrier_registry', entry.slug, reasons, entity);
}
