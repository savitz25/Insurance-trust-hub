/**
 * INS-DIR-BAIL-001 — consumer directory publication firewall for bail-bond businesses.
 *
 * Regulatory evidence may be retained. Bail-bond activity is not a Health / Life / P&C
 * insurance-agency listing. Paid status never matters.
 */

export const BAIL_BOND_DIRECTORY_POLICY =
  'bail_bond_evidence_retained_but_not_consumer_insurance_agency' as const;

export const MIXED_BAIL_AND_INSURANCE_POLICY =
  'census_first_if_zero_exclude_entity_from_consumer_directory' as const;

export const CONSUMER_INSURANCE_PUBLIC_CATEGORIES = [
  'health',
  'life',
  'homeowners',
  'auto',
  'medicare',
  'renters',
  'umbrella',
  'flood',
  'property',
  'casualty',
  'p&c',
  'marketplace',
] as const;

export const CONSUMER_INSURANCE_PUBLIC_SPECIALTIES = [
  'Health',
  'Life',
  'Property & Casualty',
  'Medicare Specialists',
  'ACA Marketplace',
  'Life & Annuities',
] as const;

export type BailBondDirectoryReason =
  | 'authoritative_bail_license'
  | 'defensive_bail_business_name'
  | 'not_bail';

export type BailBondDirectoryDecision = {
  excludeFromConsumerDirectory: boolean;
  authoritativeBailLicense: boolean;
  defensiveBailBusinessName: boolean;
  mixedNonBailInsuranceCredential: boolean;
  reason: BailBondDirectoryReason;
};

function normalizeEvidence(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Authoritative license/source text: BAIL and BOND as words on the same evidence string. */
export function hasAuthoritativeBailBondLicenseEvidence(texts: readonly string[] | null | undefined): boolean {
  for (const raw of texts || []) {
    const n = normalizeEvidence(raw);
    if (!n) continue;
    if (/\bBAIL\b/.test(n) && /\bBONDS?\b/.test(n)) return true;
    if (/\bSURETY\s+BAIL\b/.test(n)) return true;
  }
  return false;
}

/**
 * Clear business-name bail activity. Word-boundary BAIL, not surnames (Bailey, Bailie).
 * Does not use name LIKE '%bail%'.
 */
export function hasClearBailBondBusinessName(name: string | null | undefined): boolean {
  const n = normalizeEvidence(name || '');
  if (!n) return false;
  if (/\bBAIL\s*BONDS?\b/.test(n)) return true;
  if (/\bBAILBONDS?\b/.test(n)) return true;
  return /\bBAIL\b/.test(n);
}

export function classifyBailBondDirectoryPublication(input: {
  businessNames?: readonly (string | null | undefined)[] | null;
  licenseEvidence?: readonly (string | null | undefined)[] | null;
  hasSeparateNonBailInsuranceCredential?: boolean;
}): BailBondDirectoryDecision {
  const names = (input.businessNames || []).filter((s): s is string => Boolean(s && String(s).trim()));
  const evidence = (input.licenseEvidence || []).filter((s): s is string => Boolean(s && String(s).trim()));
  const authoritative = hasAuthoritativeBailBondLicenseEvidence(evidence);
  const defensive = names.some((n) => hasClearBailBondBusinessName(n));
  const mixed = Boolean(input.hasSeparateNonBailInsuranceCredential);
  if (authoritative) {
    return {
      excludeFromConsumerDirectory: true,
      authoritativeBailLicense: true,
      defensiveBailBusinessName: defensive,
      mixedNonBailInsuranceCredential: mixed,
      reason: 'authoritative_bail_license',
    };
  }
  if (defensive) {
    return {
      excludeFromConsumerDirectory: true,
      authoritativeBailLicense: false,
      defensiveBailBusinessName: true,
      mixedNonBailInsuranceCredential: mixed,
      reason: 'defensive_bail_business_name',
    };
  }
  return {
    excludeFromConsumerDirectory: false,
    authoritativeBailLicense: false,
    defensiveBailBusinessName: false,
    mixedNonBailInsuranceCredential: mixed,
    reason: 'not_bail',
  };
}

export function mayPublishAsConsumerInsuranceAgency(decision: BailBondDirectoryDecision): boolean {
  return !decision.excludeFromConsumerDirectory;
}

export function mayAssignPublicInsuranceCategory(
  category: string,
  decision: BailBondDirectoryDecision
): boolean {
  if (!decision.excludeFromConsumerDirectory) return true;
  const key = category.trim().toLowerCase();
  return !CONSUMER_INSURANCE_PUBLIC_CATEGORIES.some((c) => c === key);
}

export function mayAssignPublicInsuranceSpecialty(
  specialty: string,
  decision: BailBondDirectoryDecision
): boolean {
  if (!decision.excludeFromConsumerDirectory) return true;
  return !CONSUMER_INSURANCE_PUBLIC_SPECIALTIES.includes(
    specialty as (typeof CONSUMER_INSURANCE_PUBLIC_SPECIALTIES)[number]
  );
}

export function maySetDirectoryVerified(decision: BailBondDirectoryDecision): boolean {
  return !decision.excludeFromConsumerDirectory;
}

export function rejectBailBondDirectoryPromotion(input: {
  legalName?: string | null;
  displayName?: string | null;
  licenseEvidence?: readonly (string | null | undefined)[] | null;
}): { ok: false; reason: string } | null {
  const decision = classifyBailBondDirectoryPublication({
    businessNames: [input.legalName, input.displayName],
    licenseEvidence: input.licenseEvidence,
  });
  if (!decision.excludeFromConsumerDirectory) return null;
  return { ok: false, reason: `bail_bond_directory_${decision.reason}` };
}

export function usedRawBailSubstringClassifier(): false {
  return false;
}
