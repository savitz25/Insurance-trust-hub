/**
 * Phase 4 — promote DFS producers → providers only when Phase 1 trust gates pass.
 */

import type { Provider } from '@/types/provider';
import type { Provider as DbProvider, LicenseInfo, ContactInfo } from '@/types/supabase';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { isSeedProviderId } from '@/lib/provenance/promotion';
import {
  FL_DFS_LOOKUP_URL,
  FL_DFS_REGULATOR,
  FL_DFS_SOURCE_URL,
} from '@/lib/dfs/launch-counties';
import {
  capabilitiesToInsuranceTypes,
  capabilitiesToSpecialties,
  classifyLoas,
  type LoaCapability,
} from '@/lib/dfs/loa';
import { slugifyProducer, type NormalizedDfsProducer } from '@/lib/dfs/normalize';

export type DfsProducerRow = {
  id: string;
  entity_type: 'individual' | 'business';
  license_number: string;
  npn: string | null;
  legal_name: string;
  display_name: string;
  license_status: string;
  lines_of_authority: string[];
  city: string | null;
  county: string | null;
  county_normalized: string | null;
  state: string;
  zip: string | null;
  phone: string | null;
  email: string | null;
  source_checked_at: string;
};

export type PromoteCandidateResult =
  | { ok: true; providerInsert: DbProviderInsert; trustState: 'verified' }
  | { ok: false; reason: string };

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

/** Build a Provider-shaped object for Phase 1 trust evaluation (pre-insert). */
export function candidateToTrustProbe(
  p: DfsProducerRow | NormalizedDfsProducer,
  opts: { checkedAt: string; identityMatchAccepted: boolean }
): Provider {
  const isNorm = 'licenseNumber' in p;
  const id = isNorm
    ? `dfs-probe-${(p as NormalizedDfsProducer).licenseNumber}`
    : (p as DfsProducerRow).id;
  const licenseNumber = isNorm
    ? (p as NormalizedDfsProducer).licenseNumber
    : (p as DfsProducerRow).license_number;
  const name = isNorm
    ? (p as NormalizedDfsProducer).displayName
    : (p as DfsProducerRow).display_name;
  const city = isNorm
    ? (p as NormalizedDfsProducer).city ?? ''
    : (p as DfsProducerRow).city ?? '';
  const phone = isNorm
    ? (p as NormalizedDfsProducer).phone
    : (p as DfsProducerRow).phone;

  return {
    id,
    slug: slugifyProducer(name, licenseNumber),
    name,
    city,
    state: 'FL',
    zip: isNorm ? (p as NormalizedDfsProducer).zip : (p as DfsProducerRow).zip,
    phone,
    insurance_types: ['health'],
    specialties: ['Independent Agency'],
    rating: 0,
    review_count: 0,
    is_verified: true,
    license_number: licenseNumber,
    license_state: 'FL',
    license_source: FL_DFS_REGULATOR,
    license_source_url: FL_DFS_LOOKUP_URL,
    license_checked_at: opts.checkedAt,
    license_method: 'automated',
    license_identity_match_accepted: opts.identityMatchAccepted,
  };
}

/**
 * Decide whether a DFS producer may be promoted to public verified inventory.
 */
export function evaluatePromotionEligibility(
  producer: DfsProducerRow,
  opts?: { identityMatchAccepted?: boolean; now?: Date }
): PromoteCandidateResult {
  if (isSeedProviderId(producer.id)) {
    return { ok: false, reason: 'seed_entity_id' };
  }
  if (!producer.license_number?.trim()) {
    return { ok: false, reason: 'missing_license_number' };
  }
  if ((producer.state || 'FL').toUpperCase() !== 'FL') {
    return { ok: false, reason: 'not_florida' };
  }
  if (/inactive|expired|revoked|suspended/i.test(producer.license_status || '')) {
    return { ok: false, reason: 'inactive_status' };
  }
  if (!producer.display_name?.trim() && !producer.legal_name?.trim()) {
    return { ok: false, reason: 'missing_name' };
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
    return {
      ok: false,
      reason: `trust_state_${state}`,
    };
  }

  const caps: LoaCapability[] = classifyLoas(producer.lines_of_authority ?? []);
  const categories = capabilitiesToInsuranceTypes(caps);
  const entityType = producer.entity_type;
  const specialties = capabilitiesToSpecialties(caps, entityType);
  const name = producer.display_name || producer.legal_name;
  const city = producer.city || '';
  const county = producer.county;

  const short = [
    `Florida DFS-licensed ${entityType === 'business' ? 'agency' : 'producer'}`,
    city ? `in ${city}` : null,
    county ? `(${county} County)` : null,
    '— verified research listing. Re-check license status on official DFS tools.',
  ]
    .filter(Boolean)
    .join(' ');

  const description = [
    `${name} appears in Florida DFS valid license bulk data.`,
    producer.lines_of_authority?.length
      ? `Reported lines of authority: ${producer.lines_of_authority.join('; ')}.`
      : null,
    'This listing is for independent research only. We do not sell insurance, take lead fees, or rank by payment.',
    'Medicare specialty claims are not inferred from DFS alone.',
    `Source: ${FL_DFS_REGULATOR}. Verify: ${FL_DFS_LOOKUP_URL}`,
  ]
    .filter(Boolean)
    .join(' ');

  const license_info: LicenseInfo = {
    licenses: [
      {
        state: 'FL',
        license_number: producer.license_number,
        type: producer.lines_of_authority?.[0] || 'Insurance Producer',
        verification_url: FL_DFS_LOOKUP_URL,
        source: FL_DFS_REGULATOR,
        checkedAt,
        method: 'automated',
        notes: `Imported from ${FL_DFS_SOURCE_URL}; identity match accepted for promotion.`,
        status: 'verified',
        identityMatchAccepted: true,
      },
    ],
    audit: [
      {
        at: checkedAt,
        method: 'automated',
        action: 'phase4_dfs_promote',
        notes: `county=${county ?? 'unknown'}`,
        license_number: producer.license_number,
      },
    ],
  };

  const contact: ContactInfo = {
    phone: producer.phone ?? undefined,
    // email stored only if present — product rule: do not feature in v1 cards
    email: producer.email ?? undefined,
    address: {
      street: '',
      city: city || 'Florida',
      state: 'FL',
      zip: producer.zip || '',
    },
  };

  const providerInsert: DbProviderInsert = {
    slug: slugifyProducer(name, producer.license_number),
    name,
    provider_type: entityType === 'business' ? 'brokerage' : 'independent_agent',
    categories,
    states_licensed: ['FL'],
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

  return { ok: true, providerInsert, trustState: 'verified' };
}

/** Guard: never promote seed-like ids into public inventory. */
export function assertNotSeedPromotion(entityId: string): void {
  if (isSeedProviderId(entityId) || entityId.startsWith('fallback-')) {
    throw new Error(`Refusing to promote seed entity: ${entityId}`);
  }
}
