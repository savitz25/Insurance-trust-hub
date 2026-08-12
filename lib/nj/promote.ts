/**
 * Phase 9 — promote NJ agencies → public providers (Phase 1 trust gates).
 * Business/organization entities only.
 */

import type { Provider } from '@/types/provider';
import type { LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import {
  NJ_DOBI_LOOKUP_URL,
  NJ_DOBI_REGULATOR,
  NJ_DOBI_SOURCE_LABEL,
  matchNjLaunchRegion,
  regionById,
  type NjLaunchRegionId,
} from '@/lib/nj/launch-regions';
import {
  classifyNjStrings,
  njCapabilitiesToInsuranceTypes,
  njCapabilitiesToSpecialties,
} from '@/lib/nj/qualifications';
import { slugifyNjProducer } from '@/lib/nj/normalize';
import type { LoaCapability } from '@/lib/dfs/loa';

export type NjProducerRow = {
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
  launch_region_id: string | null;
  source_checked_at: string;
  source_url?: string | null;
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
  | {
      ok: true;
      providerInsert: DbProviderInsert;
      trustState: 'verified';
      regionId: NjLaunchRegionId;
    }
  | { ok: false; reason: string };

function candidateToTrustProbe(
  p: NjProducerRow,
  opts: { checkedAt: string; identityMatchAccepted: boolean }
): Provider {
  return {
    id: `nj-probe-${p.license_number}`,
    slug: slugifyNjProducer(p.display_name || p.legal_name, p.license_number),
    name: p.display_name || p.legal_name,
    city: p.city ?? '',
    state: 'NJ',
    zip: p.zip,
    phone: null,
    insurance_types: ['health'],
    specialties: ['Independent Agency', 'Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: p.license_number,
    license_state: 'NJ',
    license_source: NJ_DOBI_REGULATOR,
    license_source_url: NJ_DOBI_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: opts.identityMatchAccepted,
  };
}

export function evaluateNjPromotionEligibility(
  producer: NjProducerRow,
  opts?: {
    identityMatchAccepted?: boolean;
    now?: Date;
    requireLaunchRegion?: boolean;
  }
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
  if ((producer.state || 'NJ').toUpperCase() !== 'NJ') {
    return { ok: false, reason: 'not_new_jersey' };
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
    if (
      !Number.isNaN(exp.getTime()) &&
      exp.getTime() < (opts?.now ?? new Date()).getTime()
    ) {
      return { ok: false, reason: 'expired_license' };
    }
  }
  if (!producer.display_name?.trim() && !producer.legal_name?.trim()) {
    return { ok: false, reason: 'missing_name' };
  }

  const region =
    (producer.launch_region_id && regionById(producer.launch_region_id)) ||
    matchNjLaunchRegion({
      county: producer.county,
      city: producer.city,
      zip: producer.zip,
    });

  if ((opts?.requireLaunchRegion ?? true) && !region) {
    return { ok: false, reason: 'not_launch_region' };
  }
  if (!region) {
    return { ok: false, reason: 'not_launch_region' };
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

  const caps: LoaCapability[] = classifyNjStrings([
    ...(producer.license_types ?? []),
    ...(producer.qualifications ?? []),
  ]);
  const categories = njCapabilitiesToInsuranceTypes(caps);
  const specialties = njCapabilitiesToSpecialties(caps);
  const name = producer.display_name || producer.legal_name;
  const city = producer.city || '';
  const county = producer.county || region.counties[0] || null;

  const short = [
    `New Jersey DOBI–licensed agency`,
    city ? `in ${city}` : null,
    county ? `(${county} County)` : null,
    '— verified research listing. Re-check license status on official DOBI tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in New Jersey organization/agency license data staged for Insurance Trust Hub research listings.`,
    producer.license_types?.length
      ? `License type(s): ${producer.license_types.join('; ')}.`
      : null,
    producer.qualifications?.length
      ? `Qualification(s) / lines: ${producer.qualifications.join('; ')}.`
      : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are never inferred from DOBI agency data alone.',
    `Source: ${NJ_DOBI_SOURCE_LABEL}. Verify: ${NJ_DOBI_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'NJ',
        license_number: producer.license_number,
        type:
          producer.license_types?.[0] ||
          producer.qualifications?.[0] ||
          'Agency',
        verification_url: NJ_DOBI_LOOKUP_URL,
        source: NJ_DOBI_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `NJ Phase 9 promote; NPN ${producer.npn ?? 'n/a'}; identity match accepted.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase9_nj_promote',
        notes: `region=${region.id}; county=${county ?? 'unknown'}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    address: {
      street: '',
      city: city || 'New Jersey',
      state: 'NJ',
      zip: producer.zip || '',
    },
    county: county ?? undefined,
    county_normalized: (producer.county_normalized || county || '')
      .toUpperCase()
      .replace(/\s+COUNTY$/i, '')
      .trim(),
    launch_county_id: region.id,
    launch_market_id: region.id,
  };

  const providerInsert: DbProviderInsert = {
    slug: slugifyNjProducer(name, producer.license_number),
    name,
    provider_type: 'brokerage',
    categories,
    states_licensed: ['NJ'],
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
    regionId: region.id,
  };
}

export function assertNotSeedPromotion(entityId: string): void {
  if (isSeedProviderId(entityId) || entityId.startsWith('fallback-')) {
    throw new Error(`Refusing to promote seed entity: ${entityId}`);
  }
}
