/**
 * Phase 6B1 — promotion gates for indexable_research.
 * Real licenses only. Official source is authoritative.
 */

import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import { isPlaceholderPhone } from '@/lib/provenance/phone';
import type { PublicListingClass } from '@/lib/provenance/types';
import type { Provider } from '@/types/provider';
import { classifyBailBondDirectoryPublication } from '@/lib/directory/bail-bond-publication';

export function isSeedProviderId(id: string | null | undefined): boolean {
  if (!id) return true;
  return (
    id.startsWith('fallback-') ||
    id.startsWith('seed-') ||
    id.includes('-agent-')
  );
}

export type LicenseBackfillPayload = {
  licenseNumber: string;
  licenseState: string;
  source: string;
  sourceUrl?: string;
  checkedAt: string; // ISO
  method: 'manual' | 'automated';
  notes?: string;
  /** Operator accepts identity match */
  identityMatchAccepted: boolean;
  /** Promote to verified indexable, or only save pending */
  intent: 'promote_indexable' | 'save_pending' | 'keep_suppressed';
};

export type PromotionGateResult = {
  ok: boolean;
  listingClass: PublicListingClass;
  canShowHardVerifiedBadge: boolean;
  reasons: string[];
  missing: string[];
};

export function hasFreshCheckedAt(
  checkedAt: string | null | undefined,
  freshnessDays = 365
): boolean {
  if (!checkedAt) return false;
  const d = new Date(checkedAt);
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  return ageMs >= 0 && ageMs <= freshnessDays * 24 * 60 * 60 * 1000;
}

/**
 * Minimum gates for indexable_research (Phase 6B1).
 * Does not invent licenses — only evaluates provided fields.
 */
export function evaluatePromotionGates(input: {
  id?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  isVerified?: boolean | null;
  identityMatchAccepted?: boolean | null;
  phone?: string | null;
  businessName?: string | null;
  licenseEvidence?: readonly (string | null | undefined)[] | null;
}): PromotionGateResult {
  const reasons: string[] = [];
  const missing: string[] = [];

  if (isSeedProviderId(input.id)) {
    return {
      ok: false,
      listingClass: 'seed',
      canShowHardVerifiedBadge: false,
      reasons: ['Known seed / generated / fallback entity — never promote'],
      missing: [],
    };
  }

  const bail = classifyBailBondDirectoryPublication({
    businessNames: [input.businessName],
    licenseEvidence: input.licenseEvidence,
  });
  if (bail.excludeFromConsumerDirectory) {
    return {
      ok: false,
      listingClass: 'pending_verification',
      canShowHardVerifiedBadge: false,
      reasons: [
        'Bail-bond activity is retained as regulatory evidence but is not eligible for the consumer insurance-agency directory',
        bail.reason,
      ],
      missing: ['consumer_insurance_agency_eligibility'],
    };
  }

  const license = cleanLicenseNumber(input.licenseNumber);
  if (!license) {
    missing.push('licenseNumber');
    reasons.push('No re-checkable license number');
  }

  const source = (input.source ?? '').trim();
  if (!source) {
    missing.push('source');
    reasons.push('Missing regulator / source name');
  }

  const checkedAt = (input.checkedAt ?? '').trim();
  if (!checkedAt) {
    missing.push('checkedAt');
    reasons.push('Missing checkedAt timestamp');
  } else if (!hasFreshCheckedAt(checkedAt)) {
    reasons.push('checkedAt missing, invalid, or older than freshness window');
    missing.push('checkedAt_fresh');
  }

  if (!input.identityMatchAccepted) {
    missing.push('identityMatchAccepted');
    reasons.push('Identity match not accepted by operator');
  }

  const state = (input.licenseState ?? '').trim();
  if (!state) {
    missing.push('licenseState');
    reasons.push('License state missing');
  }

  // Optional hygiene — does not block pending, blocks "complete" phone claims only
  if (input.phone && isPlaceholderPhone(input.phone)) {
    reasons.push('Phone is placeholder/fiction — will not display publicly');
  }

  const hasCore =
    Boolean(license) &&
    Boolean(source) &&
    hasFreshCheckedAt(checkedAt) &&
    Boolean(input.identityMatchAccepted) &&
    Boolean(state);

  if (!hasCore) {
    if (license) {
      return {
        ok: false,
        listingClass: 'pending_verification',
        canShowHardVerifiedBadge: false,
        reasons,
        missing,
      };
    }
    return {
      ok: false,
      listingClass: 'seed',
      canShowHardVerifiedBadge: false,
      reasons,
      missing,
    };
  }

  // Hard verified badge requires explicit verified intent + all gates
  const hardVerified = Boolean(input.isVerified) && hasCore;

  return {
    ok: hardVerified,
    listingClass: hardVerified ? 'indexable_research' : 'pending_verification',
    canShowHardVerifiedBadge: hardVerified,
    reasons: hardVerified
      ? ['All promotion gates passed']
      : [...reasons, 'Set verified/promote intent after confirming official record'],
    missing: hardVerified ? [] : missing.includes('identityMatchAccepted') ? missing : ['verified_flag'],
  };
}

export function evaluateProviderPromotion(provider: Provider): PromotionGateResult {
  const licenseEvidence = [
    provider.license_notes,
    ...(provider.licenses ?? []).map((l) => l.type),
    ...(provider.licenses ?? []).map((l) => l.notes),
  ];
  return evaluatePromotionGates({
    id: provider.id,
    licenseNumber: provider.license_number,
    licenseState: provider.license_state ?? provider.state,
    source: provider.license_source,
    sourceUrl: provider.license_source_url,
    checkedAt: provider.license_checked_at,
    isVerified: provider.is_verified,
    identityMatchAccepted: provider.license_identity_match_accepted ?? false,
    phone: provider.phone,
    businessName: provider.name,
    licenseEvidence,
  });
}

/**
 * Validate a backfill payload before write. Never invents fields.
 */
export function validateBackfillPayload(
  payload: LicenseBackfillPayload,
  entityId: string
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (isSeedProviderId(entityId) && payload.intent === 'promote_indexable') {
    errors.push('Cannot promote seed/generated entity to indexable_research');
  }
  if (!cleanLicenseNumber(payload.licenseNumber)) {
    errors.push('licenseNumber is not a re-checkable value');
  }
  if (!payload.source?.trim()) errors.push('source is required');
  if (!payload.checkedAt || Number.isNaN(new Date(payload.checkedAt).getTime())) {
    errors.push('checkedAt must be a valid ISO timestamp');
  }
  if (!payload.licenseState?.trim() || payload.licenseState.trim().length !== 2) {
    errors.push('licenseState must be a 2-letter code');
  }
  if (!payload.identityMatchAccepted && payload.intent === 'promote_indexable') {
    errors.push('identityMatchAccepted required to promote');
  }
  if (payload.method !== 'manual' && payload.method !== 'automated') {
    errors.push('method must be manual or automated');
  }
  return { ok: errors.length === 0, errors };
}
