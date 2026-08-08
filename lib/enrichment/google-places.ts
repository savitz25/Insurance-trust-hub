/**
 * Phase 6B2 — Google Places Text API (New) client.
 * Runs only when GOOGLE_PLACES_API_KEY is set. Never invents matches.
 */

import type { Provider } from '@/types/provider';
import type { ExternalBusinessCandidate } from '@/lib/enrichment/match';
import type { GooglePlacesSnapshot } from '@/lib/enrichment/types';
import { pickBestMatch } from '@/lib/enrichment/match';

const PLACES_SEARCH =
  'https://places.googleapis.com/v1/places:searchText';

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
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
    addressComponents?: Array<{
      longText?: string;
      shortText?: string;
      types?: string[];
    }>;
  }>;
};

function extractState(components?: PlacesTextSearchResponse['places'] extends
  | (infer P)[]
  | undefined
  ? P extends { addressComponents?: infer C }
    ? C
    : never
  : never): string | null {
  if (!Array.isArray(components)) return null;
  const admin = components.find((c) =>
    c.types?.includes('administrative_area_level_1')
  );
  return admin?.shortText ?? null;
}

function extractCity(components?: PlacesTextSearchResponse['places'] extends
  | (infer P)[]
  | undefined
  ? P extends { addressComponents?: infer C }
    ? C
    : never
  : never): string | null {
  if (!Array.isArray(components)) return null;
  const locality = components.find((c) => c.types?.includes('locality'));
  return locality?.longText ?? null;
}

/**
 * Search Places and return high-confidence snapshot or skip reasons.
 */
export async function fetchGooglePlacesSnapshot(
  provider: Provider
): Promise<
  | { ok: true; snapshot: GooglePlacesSnapshot }
  | { ok: false; reason: string; candidates?: number }
> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: 'GOOGLE_PLACES_API_KEY not configured' };
  }

  const query = [provider.name, provider.city, provider.state, 'insurance']
    .filter(Boolean)
    .join(' ');

  let data: PlacesTextSearchResponse;
  try {
    const res = await fetch(PLACES_SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus,places.addressComponents',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
        languageCode: 'en',
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `Places API ${res.status}: ${body.slice(0, 200)}` };
    }
    data = (await res.json()) as PlacesTextSearchResponse;
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Places fetch failed',
    };
  }

  const places = data.places ?? [];
  if (!places.length) {
    return { ok: false, reason: 'No Places results', candidates: 0 };
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
  }));

  const { best, match, ambiguous } = pickBestMatch(provider, candidates);
  if (ambiguous) {
    return {
      ok: false,
      reason: `Ambiguous Places match: ${match.reasons.join('; ')}`,
      candidates: candidates.length,
    };
  }
  if (!best || !match.accept) {
    return {
      ok: false,
      reason: `Weak Places match (confidence=${match.confidence}): ${match.reasons.join('; ')}`,
      candidates: candidates.length,
    };
  }

  const place = places.find((p) => p.id === best.placeId) ?? places[0]!;
  const checkedAt = new Date().toISOString();

  const snapshot: GooglePlacesSnapshot = {
    placeId: place.id,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    formattedPhone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    formattedAddress: place.formattedAddress ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    displayName: place.displayName?.text ?? null,
    checkedAt,
    sourceUrl: place.googleMapsUri,
    method: 'automated',
    matchConfidence: match.confidence,
    matchNotes: match.reasons.join('; '),
  };

  return { ok: true, snapshot };
}
