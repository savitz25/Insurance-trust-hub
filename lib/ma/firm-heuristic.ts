/**
 * Phase 23 — fail-closed firm detection for Massachusetts DOI agency lists.
 * Wave 1 promotes agency/business entities only.
 * Licensed companies / carriers / reinsurers are never agencies.
 */

const FIRM_NAME_RE =
  /\b(LLC|L\.L\.C|INC\.?|INCORPORATED|CORP\.?|CORPORATION|LTD\.?|AGENCY|INSURANCE|BROKER|COMPANY|LLP|P\.?C\.?|PLC|ASSOCIATES|GROUP|SERVICES|PARTNERS|HOLDINGS|CO\.|PC)\b/i;

export const MA_PROMOTE_LICENSE_TYPES = [
  'accident and health',
  'a&h',
  'life',
  'property and casualty',
  'p&c',
  'variable',
  'insurance agency',
  'agency',
  'producer',
] as const;

/** Official "Licensed Or Approved Companies" types — carriers, not producers. */
const CARRIER_TYPE_RE =
  /reinsur|insurer|\binsurance company\b|health maintenance|\bhmo\b|fraternal|risk retention|reciprocal|captive|title insurer|surplus lines (insurer|company)|lloyd|pharmacy manager|assessment association|mutual (insur|company)|preferred provider|hospital service|medical service|dental service|vision service|life company|property.?casualty company/i;

export function isFirmName(name: string | null | undefined): boolean {
  return FIRM_NAME_RE.test((name ?? '').trim());
}

/** Agency files are entity lists; still skip obvious person-only names. */
export function isMassachusettsFirm(input: {
  name?: string | null;
  entityTypeRaw?: string | null;
}): boolean {
  const raw = (input.entityTypeRaw ?? '').toLowerCase();
  if (/individual|person|producer individual/.test(raw) && !/agenc|business|firm|entity/.test(raw)) {
    return isFirmName(input.name);
  }
  if (/agenc|business|firm|entity|organization|company/.test(raw)) return true;
  return isFirmName(input.name);
}

export function isCarrierCompanyType(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim();
  if (!t) return false;
  return CARRIER_TYPE_RE.test(t);
}

export function isLicensedCompanyRecord(input: {
  recordKind?: string | null;
  licenseType?: string | null;
  sourceFile?: string | null;
}): boolean {
  if (input.recordKind === 'licensed_company') return true;
  if (/licensed.?compan/i.test(input.sourceFile ?? '')) return true;
  return isCarrierCompanyType(input.licenseType);
}

export function isPromoteLicenseType(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toLowerCase();
  if (!t) return false;
  if (isCarrierCompanyType(t)) return false;
  if (/appraiser|adjuster|surplus lines broker only/.test(t) && !/agenc/.test(t)) {
    return false;
  }
  return MA_PROMOTE_LICENSE_TYPES.some((c) => t.includes(c));
}

export function isExcludedClass(raw: string | null | undefined): boolean {
  return (
    isCarrierCompanyType(raw) ||
    /appraiser|motor vehicle damage|public adjuster/i.test(raw ?? '')
  );
}
