/**
 * Phase 1 — permanent consumer trust-state authority for InsuranceTrustHub.
 *
 * Public states only:
 *   verified | pending_verification | unavailable
 *
 * Internal classes (seed / illustrative / score-suppressed) must never surface
 * as verified. See docs/PROVIDER-TRUST-STATE.md.
 */

import type { Provider } from '@/types/provider';
import type { HubAgent } from '@/types/agent';
import {
  evaluateProviderPromotion,
  isSeedProviderId,
} from '@/lib/provenance/promotion';
import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import type { PublicListingClass } from '@/lib/provenance/types';

/** Only three consumer-facing trust states. No hybrids. */
export type TrustState = 'verified' | 'pending_verification' | 'unavailable';

/**
 * Explicit gates required for TrustState === "verified".
 * Mirrors Phase 6B1 promotion gates (indexable_research + hard verified badge).
 */
export const VERIFIED_REQUIREMENTS = [
  'Non-seed entity id (not fallback-*, seed-*, or *-agent-*)',
  'Re-checkable license number (digits; not emoji/status strings)',
  'License state (2-letter jurisdiction)',
  'Regulator / source name (license_source)',
  'Fresh license_checked_at within 365 days',
  'Operator identity match accepted (license_identity_match_accepted)',
  'Verified promote flag (is_verified / isVerified true)',
] as const;

/** Honest empty-market / empty-directory copy. Network rule: docs/EMPTY-STATE-STANDARD.md */
export const EMPTY_MARKET_COPY = {
  hero:
    "No verified agencies match this market yet. We're expanding from official sources.",
  section:
    "No verified agencies match this market yet. We only publish after official license checks — we won't invent listings.",
  health:
    "No verified health-specialist listings match this view yet. Use license verification and Marketplace tools while we expand from official sources.",
  multiLine:
    "No verified multi-line agency listings match this view yet — we won't invent listings to fill this page.",
  scoreLabel: 'Research score',
  scoreUnavailable: 'Not available yet',
  directoryEmpty:
    "No verified agencies match this view yet. We won't invent listings to fill this page.",
} as const;

const TRUST_LABELS: Record<TrustState, string> = {
  verified: 'Verified research listing',
  pending_verification: 'Pending verification',
  unavailable: 'Unavailable',
};

const TRUST_EXPLANATIONS: Record<TrustState, string> = {
  verified:
    'This agency meets our public research standard: re-checkable license number, regulator source, fresh check date, and identity match.',
  pending_verification:
    'We have a candidate record, but verification is incomplete. It is not shown as a verified research listing.',
  unavailable:
    'No consumer-facing research listing is available for this record.',
};

/**
 * Resolve consumer TrustState for a Provider row.
 * Seed / illustrative / incomplete hub inventory → unavailable (never verified).
 */
export function resolveProviderTrustState(
  record: Provider | null | undefined
): TrustState {
  if (!record?.id || !record.slug || !record.name) return 'unavailable';
  if (isSeedProviderId(record.id)) return 'unavailable';

  const promo = evaluateProviderPromotion(record);

  // Internal seed class never reaches consumers as verified
  if (promo.listingClass === 'seed') return 'unavailable';

  if (
    promo.listingClass === 'indexable_research' &&
    promo.canShowHardVerifiedBadge
  ) {
    return 'verified';
  }

  if (promo.listingClass === 'pending_verification') {
    return 'pending_verification';
  }

  // Soft path: real license number but gates incomplete
  if (cleanLicenseNumber(record.license_number)) {
    return 'pending_verification';
  }

  return 'unavailable';
}

/**
 * Resolve consumer TrustState for a hub agent row.
 * Generated seed agents and incomplete curated rows never verify here.
 */
export function resolveHubAgentTrustState(
  agent: HubAgent | null | undefined
): TrustState {
  if (!agent?.id || !agent.slug || !agent.name) return 'unavailable';
  if (isSeedProviderId(agent.id) || /-agent-\d+$/.test(agent.id)) {
    return 'unavailable';
  }

  const license = cleanLicenseNumber(agent.licenseNumber);
  if (!license) return 'unavailable';

  // Hub agents lack full provenance (source + checkedAt + identity match)
  // until backfilled into the providers table with promotion gates.
  // Product rule: never treat hub catalog as verified research inventory.
  return 'pending_verification';
}

/** Map internal PublicListingClass → consumer TrustState (seed → unavailable). */
export function trustStateFromListingClass(
  listingClass: PublicListingClass
): TrustState {
  if (listingClass === 'indexable_research') return 'verified';
  if (listingClass === 'pending_verification') return 'pending_verification';
  // seed and anything else
  return 'unavailable';
}

export function canShowAsVerified(state: TrustState): boolean {
  return state === 'verified';
}

/**
 * Product default: only verified rows render in consumer directories.
 * Pending/unavailable are omitted (honest empty when zero verified).
 */
export function canShowInPublicDirectory(state: TrustState): boolean {
  return state === 'verified';
}

export function getTrustLabel(state: TrustState): string {
  return TRUST_LABELS[state];
}

export function getTrustExplanation(state: TrustState): string {
  return TRUST_EXPLANATIONS[state];
}

function isProviderRecord(r: Provider | HubAgent): r is Provider {
  return 'license_number' in r || 'is_verified' in r || 'short_description' in r;
}

export function countVerified(records: ReadonlyArray<Provider | HubAgent>): number {
  let n = 0;
  for (const r of records) {
    if (!r) continue;
    // Providers use snake_case license_number; hub agents use licenseNumber
    if ('licenseNumber' in r && !('license_number' in r)) {
      if (canShowAsVerified(resolveHubAgentTrustState(r as HubAgent))) n += 1;
    } else if (isProviderRecord(r)) {
      if (canShowAsVerified(resolveProviderTrustState(r))) n += 1;
    } else {
      if (canShowAsVerified(resolveHubAgentTrustState(r as HubAgent))) n += 1;
    }
  }
  return n;
}

export function filterVerifiedProviders(records: ReadonlyArray<Provider>): Provider[] {
  return records.filter((p) =>
    canShowAsVerified(resolveProviderTrustState(p))
  );
}

export function filterVerifiedHubAgents(records: ReadonlyArray<HubAgent>): HubAgent[] {
  return records.filter((a) =>
    canShowAsVerified(resolveHubAgentTrustState(a))
  );
}

export function verifiedCountLabel(count: number): string {
  if (count <= 0) return EMPTY_MARKET_COPY.hero;
  if (count === 1) return '1 verified research listing';
  return `${count} verified research listings`;
}

export function verifiedCountWithHealth(total: number, health: number): string {
  if (total <= 0) return EMPTY_MARKET_COPY.hero;
  const healthPart = health > 0 ? ` · ${health} health-focused` : '';
  return `${verifiedCountLabel(total)}${healthPart}`;
}

/** Shared market SEO builder — never hardcode inventory counts. */
export function buildMarketMetadata(input: {
  marketName: string;
  regionLabel?: string;
  verifiedCount: number;
  path: string;
  healthCount?: number;
}): {
  title: string;
  description: string;
  verifiedCount: number;
  isEmpty: boolean;
  robots: { index: boolean; follow: boolean };
} {
  const { marketName, regionLabel, verifiedCount, healthCount = 0 } = input;
  const isEmpty = verifiedCount <= 0;
  const place = regionLabel ? `${marketName} (${regionLabel})` : marketName;

  if (isEmpty) {
    return {
      title: `Insurance research in ${marketName} | Insurance Trust Hub`,
      description: `We’re still verifying independent insurance agencies in ${place}. No verified listings are shown yet. Use state DOI tools and our free research calculators — no paid placements.`,
      verifiedCount: 0,
      isEmpty: true,
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `Insurance agencies in ${marketName} — ${verifiedCount} verified research listings`,
    description: `Research ${verifiedCount} verified independent insurance agency listing${
      verifiedCount === 1 ? '' : 's'
    } in ${place}${
      healthCount > 0 ? ` (${healthCount} health-focused)` : ''
    }. Re-check licenses with state DOI. Independent research — no paid placements.`,
    verifiedCount,
    isEmpty: false,
    robots: { index: true, follow: true },
  };
}
