/**
 * Normalized credential namespace — NOT free-text license_class.
 * Unique key: jurisdiction + entity_kind + license_namespace + license_number.
 *
 * Current DOI staging tables unique on license_number (FL: + entity_type) and
 * never store two classes under one number. Namespace is defense for future
 * sources that can issue the same displayed number in different families.
 */

export const LICENSE_NAMESPACES = [
  'producer',
  'bail_bond',
  'adjuster',
  'title',
  'warranty',
  'surplus_lines',
  'tpa',
  'limited_lines',
  'other',
] as const;

export type LicenseNamespace = (typeof LICENSE_NAMESPACES)[number];

function haystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
}

export function resolveLicenseNamespace(input: {
  licenseClass?: string | null;
  licenseTypes?: string[] | null;
  linesOfAuthority?: string[] | null;
  licenseNumber?: string | null;
}): LicenseNamespace {
  const text = haystack([
    input.licenseClass,
    ...(input.licenseTypes ?? []),
    ...(input.linesOfAuthority ?? []),
  ]);
  const prefix = String(input.licenseNumber || '')
    .trim()
    .toUpperCase()
    .slice(0, 1);

  if (/bail/.test(text) || prefix === 'B') return 'bail_bond';
  if (/title|escrow/.test(text)) return 'title';
  if (
    /public\s*adjust|independent adjust|adjuster|adjusting firm/.test(text) ||
    prefix === 'P' && /adjust/.test(text)
  ) {
    return 'adjuster';
  }
  if (/warrant/.test(text) || prefix === 'W' || prefix === 'G') {
    // FL G-prefix includes automobile warranty in current extract
    if (/warrant/.test(text)) return 'warranty';
  }
  if (/surplus/.test(text)) return 'surplus_lines';
  if (/third party administrator|\btpa\b|utilization review/.test(text)) {
    return 'tpa';
  }
  if (
    /portable electronics|travel insurance|credit|motor vehicle rental|limited lines|in-transit/.test(
      text
    )
  ) {
    return 'limited_lines';
  }
  if (
    /agency|producer|general lines|life agency|managing general|broker|consultant/.test(
      text
    ) ||
    prefix === 'L' ||
    prefix === 'E' ||
    prefix === 'A'
  ) {
    return 'producer';
  }
  if (/warrant/.test(text)) return 'warranty';
  return 'other';
}
