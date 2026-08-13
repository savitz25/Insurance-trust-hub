/**
 * Phase 14 — promote NV DOI firms → public providers (Phase 1 trust gates).
 * Default: consumer-relevant firm types with a Nevada physical address.
 */

import type { Provider } from '@/types/provider';
import type { LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import {
  NV_DOI_LOOKUP_URL,
  NV_DOI_REGULATOR,
  NV_DOI_HOME_URL,
  matchNvLaunchMarket,
  marketById,
  type NvLaunchMarketId,
} from '@/lib/nv/launch-markets';
import { isPromoteEligibleFirmType } from '@/lib/nv/firm-types';
import {
  nvCapabilitiesToInsuranceTypes,
  nvCapabilitiesToSpecialties,
  classifyNvStrings,
} from '@/lib/nv/qualifications';
import { cityDisplay, slugifyNvProducer } from '@/lib/nv/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NvProducerRow = {
  id: string;
  entity_type: 'business';
  license_number: string;
  legal_name: string;
  display_name: string;
  firm_license_type: string;
  license_types: string[];
  qualifications: string[];
  license_status: string;
  issue_date: string | null;
  expiration_date: string | null;
  address: string | null;
  city: string | null;
  hq_state: string;
  zip: string | null;
  phone: string | null;
  email: string | null;
  nv_address: boolean;
  launch_market_id: string | null;
  source_checked_at: string;
};

export type DbProviderInsert = {
  slug: string;
  name: string;
  provider_type: 'independent_agent' | 'brokerage' | 'specialist';
  categories: string[];
  states_licensed: string[];
  cities: string[];
  license_info: LicenseInfo;
  specialties: string[];
  rating: number;
  review_count: number;
  verified: boolean;
  description: string | null;
  short_description: string | null;
  contact: ContactInfo;
};

export type PromoteCandidateResult =
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: NvLaunchMarketId }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: NvProducerRow,
  opts: { checkedAt: string; identityMatchAccepted: boolean }
): Provider {
  return {
    id: `nvdoi-probe-${p.license_number}`,
    slug: slugifyNvProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'NV',
    zip: p.zip,
    phone: p.phone,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'NV',
    license_source: NV_DOI_REGULATOR,
    license_source_url: NV_DOI_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: opts.identityMatchAccepted,
  };
}

export function evaluateNvPromotionEligibility(
  producer: NvProducerRow,
  opts?: { identityMatchAccepted?: boolean; now?: Date; requireLaunchMarket?: boolean }
): PromoteCandidateResult {
  if (isSeedProviderId(producer.id)) {
    return { ok: false, reason: 'seed_entity_id' };
  }
  if (producer.entity_type !== 'business') {
    return { ok: false, reason: 'not_business_entity' };
  }
  if (!producer.license_number?.trim()) {
    return { ok: false, reason: 'missing_license_number' };
  }
  if (!producer.nv_address || (producer.hq_state || '').toUpperCase() !== 'NV') {
    return { ok: false, reason: 'out_of_state_hq' };
  }
  const types = producer.license_types?.length
    ? producer.license_types
    : [producer.firm_license_type].filter(Boolean);
  if (!types.some((t) => isPromoteEligibleFirmType(t))) {
    return { ok: false, reason: 'firm_type_not_promoted' };
  }
  if (
    /inactive|expired|revoked|suspended|cancelled|canceled|lapsed/i.test(
      producer.license_status || ''
    )
  ) {
    return { ok: false, reason: 'inactive_status' };
  }
  if (producer.expiration_date) {
    const exp = new Date(producer.expiration_date + 'T00:00:00Z');
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < (opts?.now ?? new Date()).getTime()) {
      return { ok: false, reason: 'expired_license' };
    }
  }
  if (!producer.display_name?.trim() && !producer.legal_name?.trim()) {
    return { ok: false, reason: 'missing_name' };
  }

  const market =
    (producer.launch_market_id && marketById(producer.launch_market_id)) ||
    matchNvLaunchMarket({
      city: producer.city,
      zip: producer.zip,
      hqState: producer.hq_state,
    });

  if ((opts?.requireLaunchMarket ?? true) && !market) {
    return { ok: false, reason: 'not_launch_market' };
  }
  if (!market) {
    return { ok: false, reason: 'not_launch_market' };
  }

  const checkedAt = producer.source_checked_at || (opts?.now ?? new Date()).toISOString();
  const probe = candidateToTrustProbe(producer, {
    checkedAt,
    identityMatchAccepted: opts?.identityMatchAccepted ?? true,
  });
  const state = resolveProviderTrustState(probe);
  if (!canShowAsVerified(state)) {
    return { ok: false, reason: `trust_state_${state}` };
  }

  const caps: LoaCapability[] = classifyNvStrings(types);
  const categories = nvCapabilitiesToInsuranceTypes(caps);
  const specialties = nvCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = cityDisplay(producer.city) || producer.city || '';
  const county = market.primaryCounty;

  const short = [
    `Nevada DOI–licensed firm`,
    city ? `in ${city}` : null,
    county ? `(${county})` : null,
    '— verified research listing. Re-check license status on official NV DOI / SBS tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Nevada Division of Insurance (NV DOI) firm license data (Firms by License Type).`,
    types.length ? `Firm license type(s): ${types.join('; ')}.` : null,
    producer.expiration_date ? `Expiration on file: ${producer.expiration_date}.` : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment or email presence.',
    'Medicare specialty claims are not inferred from NV DOI firm type alone.',
    `Source: ${NV_DOI_REGULATOR}. Verify: ${NV_DOI_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'NV',
        license_number: producer.license_number,
        type: types[0] || 'Firm',
        verification_url: NV_DOI_LOOKUP_URL,
        source: NV_DOI_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${NV_DOI_HOME_URL}; firm type ${types.join('; ')}; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase14_nvdoi_promote',
        notes: `market=${market.id}; hq_state=${producer.hq_state}; types=${types.join('|')}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    phone: producer.phone || undefined,
    email: producer.email || undefined,
    address: {
      street: producer.address || '',
      city: city || 'Nevada',
      state: 'NV',
      zip: producer.zip || '',
    },
    county,
    county_normalized: county.toUpperCase(),
    launch_county_id: market.id,
    launch_market_id: market.id,
  };

  const providerInsert: DbProviderInsert = {
    slug: slugifyNvProducer(name, producer.license_number),
    name,
    provider_type: 'brokerage',
    categories,
    states_licensed: ['NV'],
    cities: city ? [city] : [],
    license_info,
    specialties,
    rating: 0,
    review_count: 0,
    verified: true,
    short_description: short,
    description,
    contact,
  };

  return {
    ok: true,
    providerInsert,
    trustState: 'verified',
    marketId: market.id,
  };
}

export function assertNotSeedPromotion(entityId: string): void {
  if (isSeedProviderId(entityId) || entityId.startsWith('fallback-')) {
    throw new Error(`Refusing to promote seed entity: ${entityId}`);
  }
}
