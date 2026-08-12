/**
 * Google Places API (New) client for agency enrichment.
 * Runs only when GOOGLE_PLACES_API_KEY is set. Never invents matches.
 * Phase 6C: retries, rate-limit spacing, insurance-type soft signals, directory URL reject.
 */

import type { Provider } from '@/types/provider';
import type { ExternalBusinessCandidate } from '@/lib/enrichment/match';
import type { GooglePlacesSnapshot } from '@/lib/enrichment/types';
import { pickBestMatch } from '@/lib/enrichment/match';
import {
  evaluatePlacesFalsePositiveGate,
  formatPlacesFpWarnings,
  isMajorCarrierCorporateUrl,
  INSURANCE_SIGNAL_PLACE_TYPES,
} from '@/lib/enrichment/places-fp-gate';

const PLACES_SEARCH = 'https://places.googleapis.com/v1/places:searchText';

/** Soft-reject websites that are directories / social, not agency sites */
const DIRECTORY_HOST_RE =
  /(^|\.)(yelp|facebook|fb\.com|instagram|linkedin|twitter|x\.com|tiktok|yellowpages|yp\.com|bbb\.org|angi|homeadvisor|mapquest|foursquare|nextdoor|superpages|manta|hotfrog|chamberofcommerce|google\.com\/maps)\b/i;

/** Agency-adjacent types only (realty removed — handled by FP gate). */
const INSURANCE_PLACE_TYPES = new Set([
  ...INSURANCE_SIGNAL_PLACE_TYPES,
  'point_of_interest',
  'establishment',
]);

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

export function isDirectoryOrSocialWebsite(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    return DIRECTORY_HOST_RE.test(host);
  } catch {
    return true;
  }
}

type PlacesTextSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    rating?: number;
    userRatingCount?: number;
    businessStatus?: string;
    types?: string[];
    primaryType?: string;
    addressComponents?: Array<{
      longText?: string;
      shortText?: string;
      types?: string[];
    }>;
  }>;
};

function extractState(
  components?: PlacesTextSearchResponse['places'] extends
    | (infer P)[]
    | undefined
    ? P extends { addressComponents?: infer C }
      ? C
      : never
    : never
): string | null {
  if (!Array.isArray(components)) return null;
  const admin = components.find((c) =>
    c.types?.includes('administrative_area_level_1')
  );
  return admin?.shortText ?? null;
}

function extractCity(
  components?: PlacesTextSearchResponse['places'] extends
    | (infer P)[]
    | undefined
    ? P extends { addressComponents?: infer C }
      ? C
      : never
    : never
): string | null {
  if (!Array.isArray(components)) return null;
  const locality = components.find((c) => c.types?.includes('locality'));
  return locality?.longText ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3
): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await fetch(url, init);
    if (last.ok) return last;
    if (last.status === 429 || last.status >= 500) {
      await sleep(400 * Math.pow(2, i) + Math.random() * 200);
      continue;
    }
    return last;
  }
  return last!;
}

export type PlacesSearchResult =
  | { ok: true; snapshot: GooglePlacesSnapshot }
  | {
      ok: false;
      reason: string;
      status: 'no_match' | 'ambiguous' | 'skipped' | 'error';
      candidates?: number;
    };

/**
 * Search Places and return high-confidence snapshot or skip reasons.
 */
export async function fetchGooglePlacesSnapshot(
  provider: Provider,
  opts?: { requestDelayMs?: number }
): Promise<PlacesSearchResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      reason: 'GOOGLE_PLACES_API_KEY not configured',
      status: 'skipped',
    };
  }

  if (opts?.requestDelayMs && opts.requestDelayMs > 0) {
    await sleep(opts.requestDelayMs);
  }

  const query = [
    provider.name,
    'insurance',
    provider.city,
    provider.county,
    provider.state || 'FL',
  ]
    .filter(Boolean)
    .join(' ');

  let data: PlacesTextSearchResponse;
  try {
    const res = await fetchWithRetry(PLACES_SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus,places.addressComponents,places.types,places.primaryType',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
        languageCode: 'en',
        regionCode: 'US',
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        reason: `Places API ${res.status}: ${body.slice(0, 200)}`,
        status: 'error',
      };
    }
    data = (await res.json()) as PlacesTextSearchResponse;
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Places fetch failed',
      status: 'error',
    };
  }

  const places = data.places ?? [];
  if (!places.length) {
    return { ok: false, reason: 'No Places results', status: 'no_match', candidates: 0 };
  }

  const candidates: ExternalBusinessCandidate[] = places.map((p) => ({
    name: p.displayName?.text,
    phone: p.nationalPhoneNumber,
    website: p.websiteUri,
    address: p.formattedAddress,
    city: extractCity(p.addressComponents),
    state: extractState(p.addressComponents),
    placeId: p.id,
    profileUrl: p.googleMapsUri,
    businessStatus: p.businessStatus,
    types: p.types,
    primaryType: p.primaryType,
  }));

  const { best, match, ambiguous } = pickBestMatch(provider, candidates);
  if (ambiguous) {
    return {
      ok: false,
      reason: `Ambiguous Places match: ${match.reasons.join('; ')}`,
      status: 'ambiguous',
      candidates: candidates.length,
    };
  }
  if (!best || !match.accept) {
    return {
      ok: false,
      reason: `Weak Places match (confidence=${match.confidence}): ${match.reasons.join('; ')}`,
      status: 'no_match',
      candidates: candidates.length,
    };
  }

  // Phase 6C-2 — false-positive gate (after scoring, before write)
  const fp = evaluatePlacesFalsePositiveGate(provider, best, match);
  if (!fp.acceptMatch) {
    const warn = formatPlacesFpWarnings(fp.softWarnings);
    return {
      ok: false,
      reason: `FP gate reject: ${fp.rejectReason ?? 'false_positive'}${
        warn ? ` [${warn}]` : ''
      }; ${match.reasons.join('; ')}`,
      status: 'no_match',
      candidates: candidates.length,
    };
  }

  const place = places.find((p) => p.id === best.placeId) ?? places[0]!;
  let website = place.websiteUri ?? null;
  if (website && isDirectoryOrSocialWebsite(website)) {
    // Soft reject: keep match for rating/place_id but do not publish directory URL as website
    website = null;
  }
  if (website && (!fp.allowWebsite || isMajorCarrierCorporateUrl(website))) {
    website = null;
  }

  const checkedAt = new Date().toISOString();
  const fpNotes = [
    ...match.reasons,
    ...fp.notes,
    formatPlacesFpWarnings(fp.softWarnings),
    fp.websiteRejectReason,
  ]
    .filter(Boolean)
    .join('; ');

  const snapshot: GooglePlacesSnapshot = {
    placeId: place.id,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    formattedPhone: place.nationalPhoneNumber ?? null,
    website,
    formattedAddress: place.formattedAddress ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    displayName: place.displayName?.text ?? null,
    checkedAt,
    sourceUrl: place.googleMapsUri,
    method: 'automated',
    matchConfidence: match.confidence,
    matchNotes: fpNotes,
  };

  return { ok: true, snapshot };
}

export { INSURANCE_PLACE_TYPES };
