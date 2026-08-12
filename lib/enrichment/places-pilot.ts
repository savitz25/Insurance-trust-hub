/**
 * Phase 6C — South Florida Places enrichment helpers (ops + write path).
 * Does not require admin session; uses service-role via caller.
 */

import type { Provider } from '@/types/provider';
import type { ContactInfo } from '@/types/supabase';
import type { GooglePlacesSnapshot, ProviderEnrichment } from '@/lib/enrichment/types';
import { isDirectoryOrSocialWebsite } from '@/lib/enrichment/google-places';
import { isMajorCarrierCorporateUrl } from '@/lib/enrichment/places-fp-gate';
import { isPlaceholderPhone } from '@/lib/provenance/phone';

export const SFL_LAUNCH_COUNTY_IDS = [
  'miami_dade',
  'broward',
  'palm_beach',
] as const;

export type SflCountyId = (typeof SFL_LAUNCH_COUNTY_IDS)[number] | 'all';

export type PlacesMatchStatus =
  | 'matched'
  | 'no_match'
  | 'ambiguous'
  | 'skipped'
  | 'error';

export function isSflLaunchCountyId(id: string | null | undefined): boolean {
  return Boolean(id && (SFL_LAUNCH_COUNTY_IDS as readonly string[]).includes(id));
}

export function alreadyHasHighConfidencePlaces(contact: ContactInfo | null | undefined): boolean {
  const enr = (contact as ContactInfo & { enrichment?: ProviderEnrichment })?.enrichment;
  return enr?.google?.matchConfidence === 'high';
}

export function alreadyHasWebsite(contact: ContactInfo | null | undefined): boolean {
  return Boolean(contact?.website?.trim());
}

/**
 * Merge high-confidence Google snapshot into contact.
 * - Always store enrichment.google when matched
 * - Fill website only if missing and not a directory URL
 * - Fill phone only if DFS phone missing/placeholder
 * Never touches license_info / verified / county fields.
 */
export function applyPlacesMatchToContact(
  contact: ContactInfo | null | undefined,
  snapshot: GooglePlacesSnapshot
): ContactInfo {
  const next: ContactInfo & { enrichment?: ProviderEnrichment } = {
    ...(contact ?? {}),
  };
  const enrichment: ProviderEnrichment = {
    ...(next.enrichment ?? {}),
    google: snapshot,
    lastRunAt: snapshot.checkedAt,
  };
  next.enrichment = enrichment;

  if (
    snapshot.website &&
    !isDirectoryOrSocialWebsite(snapshot.website) &&
    !isMajorCarrierCorporateUrl(snapshot.website) &&
    !next.website?.trim()
  ) {
    next.website = snapshot.website;
  }

  if (
    snapshot.formattedPhone &&
    !isPlaceholderPhone(snapshot.formattedPhone) &&
    (!next.phone?.trim() || isPlaceholderPhone(next.phone))
  ) {
    next.phone = snapshot.formattedPhone;
  }

  return next;
}

export function recordPlacesAttempt(
  contact: ContactInfo | null | undefined,
  status: PlacesMatchStatus,
  reason: string
): ContactInfo {
  const next: ContactInfo & { enrichment?: ProviderEnrichment } = {
    ...(contact ?? {}),
  };
  const enrichment: ProviderEnrichment = {
    ...(next.enrichment ?? {}),
    lastRunAt: new Date().toISOString(),
    skipReasons: [
      ...(next.enrichment?.skipReasons ?? []).filter(
        (r) => !r.startsWith('places_')
      ),
      `places_${status}: ${reason}`.slice(0, 280),
    ],
  };
  // Do not wipe a prior high-confidence google snapshot on later no_match
  if (next.enrichment?.google?.matchConfidence === 'high') {
    enrichment.google = next.enrichment.google;
  }
  next.enrichment = enrichment;
  return next;
}

export function providerNeedsPlacesEnrichment(
  provider: Provider,
  onlyMissing: boolean
): boolean {
  if (!onlyMissing) return true;
  if (provider.enrichment?.google?.matchConfidence === 'high') return false;
  return true;
}
