/**
 * Phase 14 / NV-1 — promote NV DOI firms → public providers (Phase 1 trust gates).
 * NV-licensed firms (resident and non-resident) belong in the NV directory.
 * Home-office state is metadata only — never a second verified jurisdiction.
 * Local hubs still require an NV street address + city/ZIP match.
 */

import type { Provider } from '@/types/provider';
import type { LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import { rejectBailBondDirectoryPromotion } from '@/lib/directory/bail-bond-publication';
import {
  NV_DOI_LOOKUP_URL,
  NV_DOI_REGULATOR,
  NV_DOI_HOME_URL,
  matchNvLaunchMarket,
  marketById,
  type NvLaunchMarketId,
} from '@/lib/nv/launch-markets';
import { inferNvResidency } from '@/lib/nv/normalize';
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
  residency?: 'resident' | 'non_resident' | null;
  home_address_state?: string | null;
  launch_market_id: string | null;
  source_checked_at: string;
};

export type NvPromoteMarketId = NvLaunchMarketId | 'statewide';

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
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: NvPromoteMarketId }
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
  const bailBlock = rejectBailBondDirectoryPromotion({
    legalName: producer.legal_name,
    displayName: producer.display_name,
    licenseEvidence: producer.license_types,
  });
  if (bailBlock) return bailBlock;

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
  const marketId: NvPromoteMarketId = market?.id ?? 'statewide';

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
  const hqState = (producer.hq_state || '').toUpperCase().slice(0, 2);
  const residency =
    producer.residency ||
    inferNvResidency(producer.firm_license_type || types.join(' '), hqState);
  const homeState =
    producer.home_address_state ||
    (hqState && hqState !== 'NV' ? hqState : null);
  const county = market?.primaryCounty;
  const addressState = hqState || 'NV';

  const short = [
    residency === 'non_resident' ? 'NV-licensed (non-resident)' : 'Nevada DOI–licensed firm',
    city ? `office in ${city}` : null,
    homeState && homeState !== 'NV' ? `(home office ${homeState})` : null,
    county ? `(${county})` : null,
    '— verified Nevada research listing. Re-check license status on official NV DOI / SBS tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Nevada Division of Insurance (NV DOI) firm license data.`,
    types.length ? `Firm license type(s): ${types.join('; ')}.` : null,
    producer.qualifications?.length
      ? `Qualification(s) on file: ${producer.qualifications.join('; ')}.`
      : null,
    residency === 'non_resident'
      ? `NV-licensed non-resident firm. Home office state on file: ${homeState || addressState || 'unknown'} (address metadata only — not a verified ${homeState || 'home-state'} license).`
      : null,
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
        notes: `Imported from ${NV_DOI_HOME_URL}; firm type ${types.join('; ')}; residency=${residency}; home_address_state=${homeState ?? 'n/a'}; identity match accepted for promotion. NV license only — home state is not a second verified jurisdiction.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase14_nvdoi_promote',
        notes: `market=${marketId}; hq_state=${producer.hq_state}; residency=${residency}; types=${types.join('|')}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    phone: producer.phone || undefined,
    email: producer.email || undefined,
    address: {
      street: producer.address || '',
      city: city || (addressState === 'NV' ? 'Nevada' : city) || '',
      state: addressState || 'NV',
      zip: producer.zip || '',
    },
    county: county || undefined,
    county_normalized: county ? county.toUpperCase() : undefined,
    launch_county_id: market?.id,
    launch_market_id: market?.id,
    residency,
    home_address_state: homeState || undefined,
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
    marketId,
  };
}

export function assertNotSeedPromotion(entityId: string): void {
  if (isSeedProviderId(entityId) || entityId.startsWith('fallback-')) {
    throw new Error(`Refusing to promote seed entity: ${entityId}`);
  }
}
