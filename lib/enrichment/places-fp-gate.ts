/**
 * Phase 6C-2 — Places false-positive gate (fail closed).
 * Runs after identity scoring; may reject the match or strip website only.
 * Never ranks by Google rating. Never invents data.
 */

import type { Provider } from '@/types/provider';
import type {
  ExternalBusinessCandidate,
  MatchResult,
} from '@/lib/enrichment/match';

/** Ops taxonomy for soft warnings / reject notes (batch logs). */
export type PlacesFpWarningCode =
  | 'possible_non_agency_type'
  | 'weak_insurance_name'
  | 'contractor_or_trade'
  | 'dealer_automotive'
  | 'realty'
  | 'financial_institution'
  | 'carrier_corporate_domain';

export type PlacesFpGateResult = {
  /** Accept identity match (placeId / rating snapshot). */
  acceptMatch: boolean;
  /** Allow writing candidate website onto contact.website. */
  allowWebsite: boolean;
  rejectReason?: string;
  websiteRejectReason?: string;
  softWarnings: PlacesFpWarningCode[];
  notes: string[];
};

/** Hard non-target Places types (reject unless exceptional insurance rescue). */
export const HARD_REJECT_PLACE_TYPES = [
  'car_dealer',
  'motorcycle_dealer',
  'car_repair',
  'car_wash',
  'car_rental',
  'auto_parts_store',
  'auto_body_shop',
  'gas_station',
  'roofing_contractor',
  'general_contractor',
  'electrician',
  'plumber',
  'painter',
  'hvac_contractor',
  'moving_company',
  'locksmith',
  'home_goods_store',
  'furniture_store',
  'clothing_store',
  'shoe_store',
  'jewelry_store',
  'restaurant',
  'meal_takeaway',
  'meal_delivery',
  'cafe',
  'bar',
  'night_club',
  'lodging',
  'hotel',
  'motel',
  'resort_hotel',
  'real_estate_agency',
  'real_estate_agent',
  'storage',
  'cemetery',
  'funeral_home',
  'church',
  'place_of_worship',
  'school',
  'primary_school',
  'secondary_school',
  'university',
  'park',
  'gym',
  'spa',
  'beauty_salon',
  'hair_care',
] as const;

/** Types that count as insurance / title / agency-adjacent. */
export const INSURANCE_SIGNAL_PLACE_TYPES = [
  'insurance_agency',
  'insurance_agent',
  'finance',
  'financial_consultant',
  'accounting',
  'tax_preparation_service',
  'lawyer',
  'attorney',
] as const;

/** Major national carrier corporate hosts — not local agency sites by default. */
export const MAJOR_CARRIER_CORPORATE_HOSTS = [
  'progressive.com',
  'geico.com',
  'statefarm.com',
  'allstate.com',
  'nationwide.com',
  'farmers.com',
  'libertymutual.com',
  'travelers.com',
  'usaa.com',
  'thehartford.com',
  'hartford.com',
  'aig.com',
  'chubb.com',
  'metlife.com',
  'prudential.com',
  'newyorklife.com',
  'northwesternmutual.com',
  'massmutual.com',
  'guardianlife.com',
  'principal.com',
  'lincolnfinancial.com',
  'transamerica.com',
  'aflac.com',
  'cigna.com',
  'uhc.com',
  'unitedhealthgroup.com',
  'humana.com',
  'anthem.com',
  'bluecross.com',
  'bcbs.com',
  'kaiserpermanente.org',
  'mutualofomaha.com',
  'erieinsurance.com',
  'auto-owners.com',
  'americannational.com',
  'safeco.com',
  'esurance.com',
  'nationwide.com',
  'foremost.com',
] as const;

const INSURANCE_NAME_RE =
  /\b(insurance|assurance|ins\.?|title|agency|agencies|broker|brokers|underwrit\w*|adjusters?|adjusting|public\s+adjust\w*|risk|benefits|medicare|medicaid|life|health|p\s*&\s*c|property|casualty|surety|escrow|annuit\w*|financial\s+services|fin\.?\s*services)\b/i;

const FINANCIAL_INSTITUTION_NAME_RE =
  /\b(credit\s*union|federal\s*credit|bank\b|bancorp|savings\s*and\s*loan|s&l|trust\s*company)\b/i;

const DEALER_NAME_RE =
  /\b(bmw|mercedes|toyota|honda|ford|chevrolet|chevy|nissan|hyundai|kia|volkswagen|vw\b|lexus|acura|infiniti|audi|porsche|subaru|mazda|dodge|chrysler|jeep|ram\b|buick|gmc\b|cadillac|motors?|motorcars?|auto\s*group|automotive|car\s*deal|dealership|motorcycle|harley)\b/i;

const CONTRACTOR_NAME_RE =
  /\b(air\s*conditioning|a\.?\s*c\.?\b|hvac|heating|cooling|refrigeration|roofing|roofer|plumbing|plumber|electric|electrical|contractor|construction|remodel|renovation|handyman|pest\s*control|lawn|landscap|pool\s*service)\b/i;

const REALTY_NAME_RE =
  /\b(realty|real\s*estate|realtor|re\/max|remax|keller\s*williams|coldwell|sotheby|century\s*21|property\s*management|homes?\s*for\s*sale)\b/i;

const CARRIER_LOCAL_AGENCY_RE =
  /\b(state\s*farm|allstate|farmers|nationwide|progressive|geico|liberty\s*mutual|american\s*family|erie\s*insurance|auto[- ]?owners)\b/i;

export type PlacesFpGateOptions = {
  /**
   * Phase 25 default for the auto-loop.
   * Weak names without insurance/finance Places types are rejected even on phone match.
   * Carrier corporate homepages without an agency-path signal reject the whole match.
   */
  strict?: boolean;
};

export function hasLocalAgencyWebsitePath(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = `${u.pathname}${u.search}`.toLowerCase();
    return /\/(agent|agency|agencies|find-an-agent|findanagent|local-agent|localagent|office|producer|locator)\b/.test(
      path
    );
  } catch {
    return false;
  }
}

function hostOf(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function collectTypes(candidate: ExternalBusinessCandidate): string[] {
  return [
    ...(candidate.types ?? []),
    candidate.primaryType ?? '',
  ]
    .filter(Boolean)
    .map((t) => t.toLowerCase().replace(/^places\//, ''));
}

export function hasInsuranceNameKeywords(name: string): boolean {
  return INSURANCE_NAME_RE.test(name ?? '');
}

/** DFS often stores `LEGAL LLC DBA AGENCY NAME` — prefer the public DBA for Places. */
export function extractDbaName(legalName: string): string | null {
  const m = (legalName ?? '').match(/\bD\/?B\/?A\b[:\s]+(.+)$/i);
  const dba = m?.[1]?.replace(/[.,]+$/, '').trim() ?? '';
  return dba.length >= 3 ? dba : null;
}

export function preferredPlacesQueryName(legalName: string): string {
  const dba = extractDbaName(legalName);
  if (dba && (hasInsuranceNameKeywords(dba) || !hasInsuranceNameKeywords(legalName))) {
    return dba;
  }
  return legalName;
}

/**
 * Legal names we will never accept in strict mode — skip Places (quota)
 * rather than filling the first A–Z batches with auto dealers / CUs.
 */
export function isHopelessNonAgencyLegalName(legalName: string): boolean {
  const name = legalName ?? '';
  if (hasInsuranceNameKeywords(name) || (extractDbaName(name) && hasInsuranceNameKeywords(extractDbaName(name)!))) {
    return false;
  }
  if (FINANCIAL_INSTITUTION_NAME_RE.test(name)) return true;
  if (DEALER_NAME_RE.test(name)) return true;
  if (CONTRACTOR_NAME_RE.test(name)) return true;
  if (REALTY_NAME_RE.test(name)) return true;
  if (/\b(auto\s*(market|trader|sales|mall|world)|used\s+cars?|motorcycle)\b/i.test(name)) {
    return true;
  }
  return false;
}

export function isMajorCarrierCorporateHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().replace(/^www\./, '');
  return MAJOR_CARRIER_CORPORATE_HOSTS.some(
    (c) => h === c || h.endsWith(`.${c}`)
  );
}

export function isMajorCarrierCorporateUrl(url: string | null | undefined): boolean {
  return isMajorCarrierCorporateHost(hostOf(url));
}

function hasInsurancePlaceType(types: string[]): boolean {
  return types.some((t) =>
    INSURANCE_SIGNAL_PLACE_TYPES.some((s) => t === s || t.includes(s))
  );
}

function hasHardRejectType(types: string[]): string | null {
  for (const t of types) {
    for (const hard of HARD_REJECT_PLACE_TYPES) {
      if (t === hard || t.includes(hard)) return hard;
    }
  }
  // Broad contractor / trade patterns in type strings
  if (types.some((t) => /contractor|roofing|plumb|hvac|electric/.test(t))) {
    return types.find((t) => /contractor|roofing|plumb|hvac|electric/.test(t)) ?? 'contractor';
  }
  if (types.some((t) => /car_dealer|motorcycle|auto_/.test(t))) {
    return types.find((t) => /car_dealer|motorcycle|auto_/.test(t)) ?? 'auto';
  }
  if (types.some((t) => /real_estate/.test(t))) {
    return types.find((t) => /real_estate/.test(t)) ?? 'real_estate';
  }
  if (
    types.length > 0 &&
    types.every((t) =>
      /restaurant|food|lodging|hotel|bar|cafe|church|school|park|gas_station/.test(
        t
      )
    )
  ) {
    return types[0] ?? 'unrelated';
  }
  return null;
}

function typeWarningCodes(types: string[], hard: string | null): PlacesFpWarningCode[] {
  const out: PlacesFpWarningCode[] = [];
  if (hard) {
    if (/car_dealer|motorcycle|auto_|dealer/.test(hard)) out.push('dealer_automotive');
    else if (/real_estate|realty/.test(hard)) out.push('realty');
    else if (/contractor|roof|plumb|hvac|electric|trade/.test(hard))
      out.push('contractor_or_trade');
    else out.push('possible_non_agency_type');
  }
  if (types.some((t) => /bank|credit_union|atm/.test(t))) {
    out.push('financial_institution');
  }
  return out;
}

function nameWarningCodes(legalName: string): PlacesFpWarningCode[] {
  const out: PlacesFpWarningCode[] = [];
  if (!hasInsuranceNameKeywords(legalName)) out.push('weak_insurance_name');
  if (DEALER_NAME_RE.test(legalName)) out.push('dealer_automotive');
  if (CONTRACTOR_NAME_RE.test(legalName)) out.push('contractor_or_trade');
  if (REALTY_NAME_RE.test(legalName)) out.push('realty');
  if (FINANCIAL_INSTITUTION_NAME_RE.test(legalName)) out.push('financial_institution');
  return out;
}

function strongNameSimilarity(match: MatchResult): boolean {
  return match.reasons.some((r) =>
    /Exact name match|Partial name match|Name token overlap \([2-9]/.test(r)
  );
}

function hasPhoneMatch(match: MatchResult): boolean {
  return match.reasons.some((r) => /Phone match/.test(r));
}

function hasGeoMatch(match: MatchResult): boolean {
  return (
    match.reasons.some((r) => /City\/locality match/.test(r)) &&
    match.reasons.some((r) => /State match/.test(r))
  );
}

function hasInsuranceTypeSignal(match: MatchResult, types: string[]): boolean {
  return (
    hasInsurancePlaceType(types) ||
    match.reasons.some((r) => /insurance\/finance/i.test(r))
  );
}

/**
 * False-positive gate after scoreBusinessMatch / pickBestMatch.
 * Call only when identity scoring already accepted (or to re-check cleanup).
 */
export function evaluatePlacesFalsePositiveGate(
  provider: Provider,
  candidate: ExternalBusinessCandidate,
  match: MatchResult,
  opts?: PlacesFpGateOptions
): PlacesFpGateResult {
  const strict = opts?.strict !== false;
  const notes: string[] = [];
  const softWarnings = new Set<PlacesFpWarningCode>();
  const legalName = provider.name ?? '';
  const types = collectTypes(candidate);
  const hardType = hasHardRejectType(types);
  const weakName = !hasInsuranceNameKeywords(legalName);
  const exceptional =
    match.score >= 85 &&
    hasInsuranceNameKeywords(legalName) &&
    strongNameSimilarity(match) &&
    (hasPhoneMatch(match) || hasGeoMatch(match));

  for (const c of nameWarningCodes(legalName)) softWarnings.add(c);
  for (const c of typeWarningCodes(types, hardType)) softWarnings.add(c);

  // --- 1) Hard reject non-target types ---
  if (hardType && !exceptional) {
    // Rescue only when legal name is strongly insurance-domain AND score exceptional
    if (!(hasInsuranceNameKeywords(legalName) && match.score >= 90 && hasPhoneMatch(match))) {
      const code =
        typeWarningCodes(types, hardType)[0] ?? 'possible_non_agency_type';
      softWarnings.add(code);
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason: `fp_gate hard type reject (${hardType})`,
        softWarnings: [...softWarnings],
        notes: [`Rejected Places type: ${hardType}`],
      };
    }
    notes.push(`Hard type ${hardType} overridden by exceptional insurance signals`);
  }

  // --- Name patterns that look like non-agencies even with weak types ---
  if (DEALER_NAME_RE.test(legalName) && !hasInsuranceNameKeywords(legalName)) {
    softWarnings.add('dealer_automotive');
    if (!hasInsurancePlaceType(types) || match.score < 90) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason: 'fp_gate dealer/automotive legal name without insurance signals',
        softWarnings: [...softWarnings],
        notes: ['Legal name looks like automotive dealer'],
      };
    }
  }

  if (CONTRACTOR_NAME_RE.test(legalName) && !hasInsuranceNameKeywords(legalName)) {
    softWarnings.add('contractor_or_trade');
    if (!hasInsurancePlaceType(types) || !hasPhoneMatch(match) || match.score < 88) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason: 'fp_gate contractor/trade legal name without strong insurance corroboration',
        softWarnings: [...softWarnings],
        notes: ['Legal name looks like contractor/trade'],
      };
    }
  }

  if (REALTY_NAME_RE.test(legalName) && !hasInsuranceNameKeywords(legalName)) {
    softWarnings.add('realty');
    if (!hasInsurancePlaceType(types) || match.score < 90) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason: 'fp_gate realty legal name without insurance signals',
        softWarnings: [...softWarnings],
        notes: ['Legal name looks like realty'],
      };
    }
  }

  // --- 2) Weak-name rule: need stronger corroboration ---
  if (weakName) {
    softWarnings.add('weak_insurance_name');
    const insuranceType = hasInsuranceTypeSignal(match, types);
    const strongLocal =
      strongNameSimilarity(match) && hasGeoMatch(match) && match.score >= 78;
    const phonePlusType = hasPhoneMatch(match) && insuranceType && match.score >= 75;
    const phonePlusStrongName =
      hasPhoneMatch(match) && strongNameSimilarity(match) && match.score >= 82;

    if (hardType) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason: `fp_gate weak name + non-target type (${hardType})`,
        softWarnings: [...softWarnings],
        notes: ['Weak insurance name cannot rescue hard non-target type'],
      };
    }

    if (!insuranceType && !strongLocal && !phonePlusType && !phonePlusStrongName) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason:
          'fp_gate weak insurance name needs insurance type and/or very strong name+geo/phone',
        softWarnings: [...softWarnings],
        notes: [
          'Weak name: require insurance/finance type or strong name+geo or phone+type',
        ],
      };
    }

    // Phase 25 strict: no insurance keywords + no insurance/finance type → reject
    // even when phone matches (motorcycle dealers / contractors sharing a number).
    if (strict && !insuranceType) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason:
          'fp_gate strict: weak name and no insurance/finance Places type (phone match insufficient)',
        softWarnings: [...softWarnings],
        notes: [
          'Strict: legal name lacks insurance|agency|title|broker keywords and Places types are not insurance/finance',
        ],
      };
    }

    // Phone-only weak DBA without insurance type → reject (common FP pattern)
    if (
      hasPhoneMatch(match) &&
      !insuranceType &&
      !strongNameSimilarity(match) &&
      match.score < 88
    ) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason: 'fp_gate weak name matched mainly by phone without insurance type',
        softWarnings: [...softWarnings],
        notes: ['Reject phone-primary weak DBA without insurance type'],
      };
    }

    notes.push('Weak name accepted with elevated corroboration');
  }

  // --- 4) Credit union / bank caution ---
  const bankishName = FINANCIAL_INSTITUTION_NAME_RE.test(legalName);
  const bankishType = types.some((t) => /bank|credit_union|atm/.test(t));
  if (bankishName || (bankishType && !hasInsurancePlaceType(types))) {
    softWarnings.add('financial_institution');
    const insuranceSignals =
      hasInsuranceNameKeywords(legalName) ||
      types.some((t) => /insurance/.test(t));
    if (bankishName && !insuranceSignals) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason:
          'fp_gate credit union/bank name without explicit insurance agency signals',
        softWarnings: [...softWarnings],
        notes: ['Financial institution without insurance signals'],
      };
    }
    if (bankishName && insuranceSignals) {
      notes.push('Financial institution name with insurance signals — match allowed');
    }
  }

  // --- 3) Corporate carrier landing pages (website strip; match may stay) ---
  let allowWebsite = true;
  let websiteRejectReason: string | undefined;
  const host = hostOf(candidate.website ?? null);
  if (isMajorCarrierCorporateHost(host)) {
    softWarnings.add('carrier_corporate_domain');
    const localAgencyPattern = CARRIER_LOCAL_AGENCY_RE.test(legalName);
    const agencyPath = hasLocalAgencyWebsitePath(candidate.website ?? null);
    if (strict && !localAgencyPattern && !agencyPath) {
      return {
        acceptMatch: false,
        allowWebsite: false,
        rejectReason:
          'fp_gate strict: carrier consumer portal homepage without agency path',
        softWarnings: [...softWarnings],
        notes: [`Rejected carrier host ${host} (no /agent|/agency path)`],
      };
    }
    if (!localAgencyPattern && !agencyPath) {
      allowWebsite = false;
      websiteRejectReason =
        'fp_gate carrier corporate domain — not writing website (placeId/rating may remain)';
      notes.push(`Website suppressed: carrier host ${host}`);
    } else {
      notes.push(
        `Carrier host ${host} kept — ${
          localAgencyPattern ? 'legal name looks like local carrier agency' : 'agency path on URL'
        }`
      );
    }
  }

  // Identity still must have been high from scorer; gate does not invent accept
  if (!match.accept) {
    return {
      acceptMatch: false,
      allowWebsite: false,
      rejectReason: 'fp_gate underlying match not accepted',
      softWarnings: [...softWarnings],
      notes,
    };
  }

  return {
    acceptMatch: true,
    allowWebsite,
    websiteRejectReason,
    softWarnings: [...softWarnings],
    notes,
  };
}

/** Format soft warnings for logs / matchNotes. */
export function formatPlacesFpWarnings(codes: PlacesFpWarningCode[]): string {
  if (!codes.length) return '';
  return codes.map((c) => `fp:${c}`).join(',');
}

/**
 * Conservative cleanup heuristic without re-fetching Places:
 * clear website only when clearly wrong (carrier corp or non-agency legal name patterns).
 */
export function shouldClearWebsiteHeuristic(provider: {
  name: string;
  website?: string | null;
}): { clear: boolean; reasons: string[]; softWarnings: PlacesFpWarningCode[] } {
  const softWarnings: PlacesFpWarningCode[] = [];
  const reasons: string[] = [];
  const name = provider.name ?? '';
  const site = provider.website ?? null;

  if (isMajorCarrierCorporateUrl(site) && !CARRIER_LOCAL_AGENCY_RE.test(name)) {
    softWarnings.push('carrier_corporate_domain');
    reasons.push('carrier corporate website');
  }

  if (site && DEALER_NAME_RE.test(name) && !hasInsuranceNameKeywords(name)) {
    softWarnings.push('dealer_automotive');
    reasons.push('dealer name + website present');
  }
  if (site && CONTRACTOR_NAME_RE.test(name) && !hasInsuranceNameKeywords(name)) {
    softWarnings.push('contractor_or_trade');
    reasons.push('contractor name + website present');
  }
  if (site && REALTY_NAME_RE.test(name) && !hasInsuranceNameKeywords(name)) {
    softWarnings.push('realty');
    reasons.push('realty name + website present');
  }
  if (
    site &&
    FINANCIAL_INSTITUTION_NAME_RE.test(name) &&
    !hasInsuranceNameKeywords(name)
  ) {
    softWarnings.push('financial_institution');
    reasons.push('bank/credit union name without insurance keywords + website');
  }

  return { clear: reasons.length > 0, reasons, softWarnings };
}
