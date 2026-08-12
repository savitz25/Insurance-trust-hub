/**
 * Phase 8 — promote TDI agencies → public providers (Phase 1 trust gates).
 * Business entities only.
 */

import type { Provider } from '@/types/provider';
import type { LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import {
  TX_TDI_LOOKUP_URL,
  TX_TDI_REGULATOR,
  TX_TDI_SOURCE_URL,
  matchTxLaunchMarket,
  marketById,
  type TxLaunchMarketId,
} from '@/lib/tdi/launch-markets';
import {
  tdiCapabilitiesToInsuranceTypes,
  tdiCapabilitiesToSpecialties,
  classifyTdiStrings,
} from '@/lib/tdi/qualifications';
import { slugifyTdiProducer } from '@/lib/tdi/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type TdiProducerRow = {
  id: string;
  entity_type: 'business';
  license_number: string;
  npn: string | null;
  legal_name: string;
  display_name: string;
  org_type: string | null;
  license_types: string[];
  qualifications: string[];
  license_status: string;
  issue_date: string | null;
  expiration_date: string | null;
  city: string | null;
  county: string | null;
  county_normalized: string | null;
  state: string;
  zip: string | null;
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
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: TxLaunchMarketId }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: TdiProducerRow,
  opts: { checkedAt: string; identityMatchAccepted: boolean }
): Provider {
  return {
    id: `tdi-probe-${p.license_number}`,
    slug: slugifyTdiProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'TX',
    zip: p.zip,
    phone: null,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'TX',
    license_source: TX_TDI_REGULATOR,
    license_source_url: TX_TDI_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: opts.identityMatchAccepted,
  };
}

export function evaluateTdiPromotionEligibility(
  producer: TdiProducerRow,
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
  if ((producer.state || 'TX').toUpperCase() !== 'TX') {
    return { ok: false, reason: 'not_texas' };
  }
  if (/inactive|expired|revoked|suspended|cancelled|canceled|lapsed/i.test(
    producer.license_status || ''
  )) {
    return { ok: false, reason: 'inactive_status' };
  }
  // Soft-expire check
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
    matchTxLaunchMarket({
      county: producer.county,
      city: producer.city,
      zip: producer.zip,
    });

  if ((opts?.requireLaunchMarket ?? true) && !market) {
    return { ok: false, reason: 'not_launch_market' };
  }
  if (!market) {
    return { ok: false, reason: 'not_launch_market' };
  }

  const checkedAt =
    producer.source_checked_at || (opts?.now ?? new Date()).toISOString();
  const identityMatchAccepted = opts?.identityMatchAccepted ?? true;

  const probe = candidateToTrustProbe(producer, {
    checkedAt,
    identityMatchAccepted,
  });
  const state = resolveProviderTrustState(probe);
  if (!canShowAsVerified(state)) {
    return { ok: false, reason: `trust_state_${state}` };
  }

  const caps: LoaCapability[] = classifyTdiStrings([
    ...(producer.license_types ?? []),
    ...(producer.qualifications ?? []),
  ]);
  const categories = tdiCapabilitiesToInsuranceTypes(caps);
  const specialties = tdiCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = producer.city || '';
  const county = producer.county || market.primaryCounty;

  const short = [
    `Texas TDI–licensed agency`,
    city ? `in ${city}` : null,
    county ? `(${county} County)` : null,
    '— verified research listing. Re-check license status on official TDI tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Texas TDI open data of agencies and businesses approved to manage insurance-related products.`,
    producer.license_types?.length
      ? `License type(s): ${producer.license_types.join('; ')}.`
      : null,
    producer.qualifications?.length
      ? `Qualification(s): ${producer.qualifications.join('; ')}.`
      : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are not inferred from TDI agency data alone.',
    `Source: ${TX_TDI_REGULATOR}. Verify: ${TX_TDI_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'TX',
        license_number: producer.license_number,
        type: producer.license_types?.[0] || producer.qualifications?.[0] || 'Agency',
        verification_url: TX_TDI_LOOKUP_URL,
        source: TX_TDI_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${TX_TDI_SOURCE_URL}; NPN ${producer.npn ?? 'n/a'}; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase8_tdi_promote',
        notes: `market=${market.id}; county=${county ?? 'unknown'}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    address: {
      street: '',
      city: city || 'Texas',
      state: 'TX',
      zip: producer.zip || '',
    },
    county: county,
    county_normalized: (producer.county_normalized || county)
      .toUpperCase()
      .replace(/\s+COUNTY$/i, '')
      .trim(),
    launch_county_id: market.id,
    launch_market_id: market.id,
  };

  const providerInsert: DbProviderInsert = {
    slug: slugifyTdiProducer(name, producer.license_number),
    name,
    provider_type: 'brokerage',
    categories,
    states_licensed: ['TX'],
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
