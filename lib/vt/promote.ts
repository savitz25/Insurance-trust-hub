/**
 * Phase 15 — promote VT DFR firms → public providers (Phase 1 trust gates).
 * Default: high-confidence firms with a Vermont physical address.
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
  VT_DFR_LOOKUP_URL,
  VT_DFR_REGULATOR,
  VT_DFR_HOME_URL,
  matchVtLaunchMarket,
  marketById,
  type VtLaunchMarketId,
} from '@/lib/vt/launch-markets';
import { isAdjusterClass, isPromoteLicenseClass } from '@/lib/vt/firm-heuristic';
import {
  classifyVtStrings,
  vtCapabilitiesToInsuranceTypes,
  vtCapabilitiesToSpecialties,
} from '@/lib/vt/qualifications';
import { cityDisplay, slugifyVtProducer } from '@/lib/vt/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type VtProducerRow = {
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
  vt_address: boolean;
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
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified'; marketId: VtLaunchMarketId }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: VtProducerRow,
  opts: { checkedAt: string }
): Provider {
  return {
    id: `vtdfr-probe-${p.license_number}`,
    slug: slugifyVtProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'VT',
    zip: p.zip,
    phone: null,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'VT',
    license_source: VT_DFR_REGULATOR,
    license_source_url: VT_DFR_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: true,
  };
}

export function evaluateVtPromotionEligibility(
  producer: VtProducerRow,
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
  if (!producer.vt_address || (producer.hq_state || '').toUpperCase() !== 'VT') {
    return { ok: false, reason: 'out_of_state_hq' };
  }
  const types = producer.license_types ?? [];
  if (!types.some((t) => isPromoteLicenseClass(t))) {
    return { ok: false, reason: 'license_class_not_promoted' };
  }
  if (types.some((t) => isAdjusterClass(t))) {
    return { ok: false, reason: 'adjuster_excluded' };
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
  const bailBlock = rejectBailBondDirectoryPromotion({
    legalName: producer.legal_name,
    displayName: producer.display_name,
    licenseEvidence: producer.license_types,
  });
  if (bailBlock) return bailBlock;

  const market =
    (producer.launch_market_id && marketById(producer.launch_market_id)) ||
    matchVtLaunchMarket({
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

  const caps: LoaCapability[] = classifyVtStrings([
    ...types,
    ...(producer.qualifications ?? []),
  ]);
  const categories = vtCapabilitiesToInsuranceTypes(caps);
  const specialties = vtCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = cityDisplay(producer.city) || producer.city || '';
  const county = producer.county && producer.county !== 'United States'
    ? producer.county
    : market.primaryCounty;

  const short = [
    `Vermont DFR–licensed agency`,
    city ? `in ${city}` : null,
    '— verified research listing. Re-check license status on official VT DFR / SBS tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Vermont Department of Financial Regulation (VT DFR) quarterly licensee data.`,
    types.length ? `License class: ${types.join('; ')}.` : null,
    producer.qualifications?.length
      ? `Line(s) of authority: ${producer.qualifications.join('; ')}.`
      : null,
    producer.npn ? `NPN: ${producer.npn}.` : null,
    producer.expiration_date ? `Expiration on file: ${producer.expiration_date}.` : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are not inferred from VT DFR data alone. Individuals are not promoted in this inventory.',
    `Source: ${VT_DFR_REGULATOR}. Verify: ${VT_DFR_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'VT',
        license_number: producer.license_number,
        type: types[0] || 'Insurance Producer',
        verification_url: VT_DFR_LOOKUP_URL,
        source: VT_DFR_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${VT_DFR_HOME_URL}; NPN ${producer.npn ?? 'n/a'}; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase15_vtdfr_promote',
        notes: `market=${market.id}; hq_state=${producer.hq_state}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    address: {
      street: producer.address || '',
      city: city || 'Vermont',
      state: 'VT',
      zip: producer.zip || '',
    },
    county,
    county_normalized: county.toUpperCase(),
    launch_county_id: market.id,
    launch_market_id: market.id,
  };

  return {
    ok: true,
    providerInsert: {
      slug: slugifyVtProducer(name, producer.license_number),
      name,
      provider_type: 'brokerage',
      categories,
      states_licensed: ['VT'],
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
