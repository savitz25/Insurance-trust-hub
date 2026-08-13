/**
 * Phase 15 — fail-closed firm vs individual detection for VT DFR lists.
 * The quarterly spreadsheet has FIRST NAME + LAST NAME OR BUSINESS NAME.
 * Business entities typically leave FIRST NAME blank.
 */

const FIRM_NAME_RE =
  /\b(LLC|L\.L\.C|INC\.?|INCORPORATED|CORP\.?|CORPORATION|LTD\.?|AGENCY|INSURANCE|BROKER|COMPANY|LLP|P\.?C\.?|PLC|ASSOCIATES|GROUP|SERVICES|PARTNERS|HOLDINGS|CO\.)\b/i;

export const VT_PROMOTE_LICENSE_CLASSES = [
  'Insurance Producer',
  'Surplus Lines Broker',
  'Title Agent',
  'Managing General Agent',
  'Consultant',
] as const;

export function isFirmName(lastOrBusiness: string | null | undefined): boolean {
  return FIRM_NAME_RE.test((lastOrBusiness ?? '').trim());
}

/** High-confidence firm: blank first name, or explicit firm suffix in the name. */
export function isVermontFirm(input: {
  firstName?: string | null;
  lastOrBusinessName?: string | null;
}): boolean {
  const first = (input.firstName ?? '').trim();
  const last = (input.lastOrBusinessName ?? '').trim();
  if (!last) return false;
  if (!first) return true;
  return isFirmName(last);
}

export function isPromoteLicenseClass(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toLowerCase();
  return (VT_PROMOTE_LICENSE_CLASSES as readonly string[]).some(
    (c) => c.toLowerCase() === t
  );
}

export function isAdjusterClass(raw: string | null | undefined): boolean {
  return /adjuster/i.test(raw ?? '');
}
