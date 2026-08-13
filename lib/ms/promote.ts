/**
 * Phase 24 — promote MS MID Insurance Producer Entity rows → public providers.
 * Default: MS-addressed entities in Wave-1 markets. No Medicare inference.
 */

import type { Provider } from '@/types/provider';
import type { LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import {
  MS_MID_LOOKUP_URL,
  MS_MID_REGULATOR,
  MS_MID_HOME_URL,
  matchMsLaunchMarket,
  marketById,
  type MsLaunchMarketId,
} from '@/lib/ms/launch-markets';
import { isExcludedClass, isPromoteLicenseType } from '@/lib/ms/firm-heuristic';
import {
  classifyMsStrings,
  msCapabilitiesToInsuranceTypes,
  msCapabilitiesToSpecialties,
} from '@/lib/ms/qualifications';
import { cityDisplay, slugifyMsProducer } from '@/lib/ms/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type MsProducerRow = {
  id: string;
  entity_type: 'business' | 'individual';
  license_number: string;
  npn: string | null;
  legal_name: string;
  display_name: string;
  license_types: string[];
  qualifications: string[];
  license_status: string;
  issue_date: string | null;
  expiration_date: string | null;
  address: string | null;
  city: string | null;
  hq_state: string;
  zip: string | null;
  county: string | null;
  phone: string | null;
  ms_address: boolean;
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
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: MsLaunchMarketId }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: MsProducerRow,
  opts: { checkedAt: string }
): Provider {
  return {
    id: `msmid-probe-${p.license_number}`,
    slug: slugifyMsProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'MS',
    zip: p.zip,
    phone: p.phone ?? null,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'MS',
    license_source: MS_MID_REGULATOR,
    license_source_url: MS_MID_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: true,
  };
}

export function evaluateMsPromotionEligibility(
  producer: MsProducerRow,
  opts?: { now?: Date; requireLaunchMarket?: boolean }
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
  if (!producer.ms_address || (producer.hq_state || '').toUpperCase() !== 'MS') {
    return { ok: false, reason: 'out_of_state_hq' };
  }
  const types = producer.license_types ?? [];
  if (!types.some((t) => isPromoteLicenseType(t))) {
    return { ok: false, reason: 'license_class_not_promoted' };
  }
  if (types.some((t) => isExcludedClass(t))) {
    return { ok: false, reason: 'class_excluded' };
  }
  if (/inactive|expired|revoked|suspended|lapsed/i.test(producer.license_status || '')) {
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
    matchMsLaunchMarket({
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
  const probe = candidateToTrustProbe(producer, { checkedAt });
  const state = resolveProviderTrustState(probe);
  if (!canShowAsVerified(state)) {
    return { ok: false, reason: `trust_state_${state}` };
  }

  const caps: LoaCapability[] = classifyMsStrings([
    ...types,
    ...(producer.qualifications ?? []),
  ]);
  const categories = msCapabilitiesToInsuranceTypes(caps);
  const specialties = msCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = cityDisplay(producer.city) || producer.city || '';
  const county = producer.county && producer.county !== 'United States'
    ? producer.county
    : market.primaryCounty;

  const short = [
    `Mississippi Insurance Department–licensed agency`,
    city ? `in ${city}` : null,
    '— verified research listing. Re-check license status on official MID tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Mississippi Insurance Department (MID) Insurance Producer Entity licensing data.`,
    types.length ? `License class: ${types.join('; ')}.` : null,
    producer.expiration_date ? `Expiration on file: ${producer.expiration_date}.` : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are not inferred from MID data alone. Individuals are not promoted in this inventory.',
    `Source: ${MS_MID_REGULATOR}. Verify: ${MS_MID_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'MS',
        license_number: producer.license_number,
        type: types[0] || 'Insurance Producer Entity',
        verification_url: MS_MID_LOOKUP_URL,
        source: MS_MID_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${MS_MID_HOME_URL} entity licensing search; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase24_msmid_promote',
        notes: `market=${market.id}; hq_state=${producer.hq_state}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    address: {
      street: producer.address || '',
      city: city || 'Mississippi',
      state: 'MS',
      zip: producer.zip || '',
    },
    phone: producer.phone || undefined,
    county,
    county_normalized: county.toUpperCase(),
    launch_county_id: market.id,
    launch_market_id: market.id,
  };

  return {
    ok: true,
    providerInsert: {
      slug: slugifyMsProducer(name, producer.license_number),
      name,
      provider_type: 'brokerage',
      categories,
      states_licensed: ['MS'],
      cities: city ? [city] : [],
      license_info,
      specialties,
      rating: 0,
      review_count: 0,
      verified: true,
      short_description: short,
      description,
      contact,
    },
    trustState: 'verified',
    marketId: market.id,
  };
}

export function assertNotSeedPromotion(entityId: string): void {
  if (isSeedProviderId(entityId) || entityId.startsWith('fallback-')) {
    throw new Error(`Refusing to promote seed entity: ${entityId}`);
  }
}
