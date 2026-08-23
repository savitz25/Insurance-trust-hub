/** Physical city matching for Ask handoff (slug or display). */

export function slugifyCityToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Exact physical-city match. Does not use licensed/service state as locality.
 */
export function physicalCityMatches(
  providerCity: string | null | undefined,
  wantedCity: string | null | undefined
): boolean {
  if (!wantedCity?.trim() || !providerCity?.trim()) return false;
  const a = slugifyCityToken(providerCity);
  const b = slugifyCityToken(wantedCity);
  return Boolean(a && b && a === b);
}
