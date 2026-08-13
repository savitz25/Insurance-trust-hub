/**
 * Phase 23 — promote MA DOI agencies → public providers (Phase 1 trust gates).
 * Default: high-confidence firms with a Massachusetts physical address.
 * Licensed companies / carriers are never eligible.
 */

import type { Provider } from '@/types/provider';
import type { LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import {
  MA_DOI_LOOKUP_URL,
  MA_DOI_REGULATOR,
  MA_DOI_HOME_URL,
  matchMaLaunchMarket,
  marketById,
  type MaLaunchMarketId,
} from '@/lib/ma/launch-markets';
import {
  isCarrierCompanyType,
  isExcludedClass,
  isPromoteLicenseType,
} from '@/lib/ma/firm-heuristic';
import {
  classifyMaStrings,
  maCapabilitiesToInsuranceTypes,
  maCapabilitiesToSpecialties,
} from '@/lib/ma/qualifications';
import { cityDisplay, slugifyMaProducer } from '@/lib/ma/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type MaProducerRow = {
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
  ma_address: boolean;
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
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: MaLaunchMarketId }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: MaProducerRow,
  opts: { checkedAt: string }
): Provider {
  return {
    id: `madoi-probe-${p.license_number}`,
    slug: slugifyMaProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'MA',
    zip: p.zip,
    phone: p.phone ?? null,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'MA',
    license_source: MA_DOI_REGULATOR,
    license_source_url: MA_DOI_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: true,
  };
}

export function evaluateMaPromotionEligibility(
  producer: MaProducerRow,
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
  if (!producer.ma_address || (producer.hq_state || '').toUpperCase() !== 'MA') {
    return { ok: false, reason: 'out_of_state_hq' };
  }
  const types = producer.license_types ?? [];
  if (types.some((t) => isCarrierCompanyType(t))) {
    return { ok: false, reason: 'carrier_company_not_agency' };
  }
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
    matchMaLaunchMarket({
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

  const caps: LoaCapability[] = classifyMaStrings([
    ...types,
    ...(producer.qualifications ?? []),
  ]);
  const categories = maCapabilitiesToInsuranceTypes(caps);
  const specialties = maCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = cityDisplay(producer.city) || producer.city || '';
  const county = producer.county && producer.county !== 'United States'
    ? producer.county
    : market.primaryCounty;

  const short = [
    `Massachusetts Division of Insurance–licensed agency`,
    city ? `in ${city}` : null,
    '— verified research listing. Re-check license status on official MA DOI / SBS tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Massachusetts Division of Insurance (MA DOI) licensed business-entity data.`,
    types.length ? `License class: ${types.join('; ')}.` : null,
    producer.qualifications?.length
      ? `Line(s) of authority: ${producer.qualifications.join('; ')}.`
      : null,
    producer.npn ? `NPN: ${producer.npn}.` : null,
    producer.expiration_date ? `Expiration on file: ${producer.expiration_date}.` : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are not inferred from MA DOI data alone. Individuals and licensed companies/carriers are not promoted in this inventory.',
    `Source: ${MA_DOI_REGULATOR}. Verify: ${MA_DOI_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'MA',
        license_number: producer.license_number,
        type: types[0] || 'Insurance Agency',
        verification_url: MA_DOI_LOOKUP_URL,
        source: MA_DOI_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${MA_DOI_HOME_URL}; NPN ${producer.npn ?? 'n/a'}; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase23_madoi_promote',
        notes: `market=${market.id}; hq_state=${producer.hq_state}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    address: {
      street: producer.address || '',
      city: city || 'Massachusetts',
      state: 'MA',
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
      slug: slugifyMaProducer(name, producer.license_number),
      name,
      provider_type: 'brokerage',
      categories,
      states_licensed: ['MA'],
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
