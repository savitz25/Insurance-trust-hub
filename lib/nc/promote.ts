/**
 * Phase 13 — promote NC DOI agencies → public providers (Phase 1 trust gates).
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
  NC_DOI_LOOKUP_URL,
  NC_DOI_REGULATOR,
  NC_DOI_HOME_URL,
  matchNcLaunchMarket,
  marketById,
  type NcLaunchMarketId,
} from '@/lib/nc/launch-markets';
import {
  ncCapabilitiesToInsuranceTypes,
  ncCapabilitiesToSpecialties,
  classifyNcStrings,
} from '@/lib/nc/qualifications';
import { slugifyNcProducer } from '@/lib/nc/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NcProducerRow = {
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
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: NcLaunchMarketId }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: NcProducerRow,
  opts: { checkedAt: string; identityMatchAccepted: boolean }
): Provider {
  return {
    id: `ncdoi-probe-${p.license_number}`,
    slug: slugifyNcProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'NC',
    zip: p.zip,
    phone: null,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'NC',
    license_source: NC_DOI_REGULATOR,
    license_source_url: NC_DOI_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: opts.identityMatchAccepted,
  };
}

export function evaluateNcPromotionEligibility(
  producer: NcProducerRow,
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
  if ((producer.state || 'NC').toUpperCase() !== 'NC') {
    return { ok: false, reason: 'not_north_carolina' };
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
    matchNcLaunchMarket({
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

  const checkedAt = producer.source_checked_at || (opts?.now ?? new Date()).toISOString();
  const identityMatchAccepted = opts?.identityMatchAccepted ?? true;

  const probe = candidateToTrustProbe(producer, {
    checkedAt,
    identityMatchAccepted,
  });
  const state = resolveProviderTrustState(probe);
  if (!canShowAsVerified(state)) {
    return { ok: false, reason: `trust_state_${state}` };
  }

  const caps: LoaCapability[] = classifyNcStrings([
    ...(producer.license_types ?? []),
    ...(producer.qualifications ?? []),
  ]);
  const categories = ncCapabilitiesToInsuranceTypes(caps);
  const specialties = ncCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = producer.city || '';
  const county = producer.county || market.primaryCounty;

  const short = [
    `North Carolina DOI–licensed agency`,
    city ? `in ${city}` : null,
    county ? `(${county} County)` : null,
    '— verified research listing. Re-check license status on official NC DOI / SBS tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in North Carolina Department of Insurance (NC DOI) agency / business-entity license data.`,
    producer.license_types?.length
      ? `License type(s): ${producer.license_types.join('; ')}.`
      : null,
    producer.qualifications?.length
      ? `Line(s) of authority: ${producer.qualifications.join('; ')}.`
      : null,
    producer.npn ? `NPN: ${producer.npn}.` : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are not inferred from NC DOI agency data alone.',
    `Source: ${NC_DOI_REGULATOR}. Verify: ${NC_DOI_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'NC',
        license_number: producer.license_number,
        type: producer.license_types?.[0] || producer.qualifications?.[0] || 'Agency',
        verification_url: NC_DOI_LOOKUP_URL,
        source: NC_DOI_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${NC_DOI_HOME_URL}; NPN ${producer.npn ?? 'n/a'}; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase13_ncdoi_promote',
        notes: `market=${market.id}; county=${county ?? 'unknown'}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    address: {
      street: '',
      city: city || 'North Carolina',
      state: 'NC',
      zip: producer.zip || '',
    },
    county,
    county_normalized: (producer.county_normalized || county)
      .toUpperCase()
      .replace(/\s+COUNTY$/i, '')
      .trim(),
    launch_county_id: market.id,
    launch_market_id: market.id,
  };

  const providerInsert: DbProviderInsert = {
    slug: slugifyNcProducer(name, producer.license_number),
    name,
    provider_type: 'brokerage',
    categories,
    states_licensed: ['NC'],
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
