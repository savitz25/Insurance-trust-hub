/**
 * Phase 24 — fail-closed firm detection for Mississippi MID entity lists.
 * Wave 1 promotes Insurance Producer Entity / business rows only.
 */

const FIRM_NAME_RE =
  /\b(LLC|L\.L\.C|INC\.?|INCORPORATED|CORP\.?|CORPORATION|LTD\.?|AGENCY|INSURANCE|BROKER|COMPANY|LLP|P\.?C\.?|PLC|ASSOCIATES|GROUP|SERVICES|PARTNERS|HOLDINGS|CO\.|PC)\b/i;

export const MS_PROMOTE_LICENSE_TYPES = [
  'insurance producer entity',
  'producer entity',
  'producer',
  'agency',
  'business entity',
] as const;

export function isFirmName(name: string | null | undefined): boolean {
  return FIRM_NAME_RE.test((name ?? '').trim());
}

/** Entity search exports are business lists; still skip obvious person-only names. */
export function isMississippiFirm(input: {
  name?: string | null;
  entityTypeRaw?: string | null;
}): boolean {
  const raw = (input.entityTypeRaw ?? '').toLowerCase();
  if (/individual|person|producer individual/.test(raw) && !/agenc|business|firm|entity/.test(raw)) {
    return isFirmName(input.name);
  }
  if (/agenc|business|firm|entity|organization|producer entity/.test(raw)) return true;
  return isFirmName(input.name);
}

export function isPromoteLicenseType(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toLowerCase();
  if (!t) return false;
  if (isExcludedClass(t)) return false;
  return MS_PROMOTE_LICENSE_TYPES.some((c) => t.includes(c));
}

export function isExcludedClass(raw: string | null | undefined): boolean {
  return /appraiser|public adjuster|motor vehicle damage|third party admin|\btpa\b|reinsur|insurer\b|pharmacy benefit|risk retention|risk purchasing/i.test(
    raw ?? ''
  );
}
