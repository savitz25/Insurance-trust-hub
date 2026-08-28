/**
 * FL-INS-002 — Florida OIR company master identity.
 * Canonical legal-insurer identity remains legal-insurer:naic:{CoCode}.
 * Florida Company Code is an additive identifier, never a second legal insurer.
 * DFS appointing numbers are not NAIC and are not Florida Company Codes.
 */
import { normalizeNaicCompanyCode, legalInsurerProvisionalKey } from './legal-insurer-identity';

export const FL_OIR_SOURCE = {
  authority: 'Florida Office of Insurance Regulation',
  dataset: 'florida_oir_active_company_search',
  portal: 'https://companysearch.floir.gov/',
  retrieval: 'official Active Company Search XML export by company type',
  task: 'FL-INS-002',
} as const;

export const FL_OIR_COMPANY_CODE_SCHEME = 'fl_oir_company_code' as const;

export const MATCH_BASIS_EXACT_NAIC =
  'exact_naic_cocode_same_official_record' as const;

export function oirCompanyUsesNameMatch(): false {
  return false;
}
export function oirCompanyUsesFuzzy(): false {
  return false;
}
export function flCompanyCodeIsCanonicalIdentity(): false {
  return false;
}
export function dfsAppointingNumberEqualsNaic(): false {
  return false;
}
export function dfsAppointingNumberEqualsFlCompanyCode(): false {
  return false;
}
export function flCompanyCodeEqualsNaic(): false {
  return false;
}
export function companyStatusIsEnforcement(): false {
  return false;
}
export function surplusLinesEqualsAdmitted(): false {
  return false;
}
export function brandEqualsInsurer(): false {
  return false;
}
export function groupEqualsInsurer(): false {
  return false;
}
export function oirAuthorizationEqualsCmsRegistration(): false {
  return false;
}
export function titleAgentEqualsTitleInsurer(): false {
  return false;
}
export function mayBridgeAppointerWithoutSameRecord(): false {
  return false;
}

export function normalizeFlOirCompanyCode(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^(n\/?a|none|null|unknown|-)$/i.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (!/^\d{3,6}$/.test(digits)) return null;
  return digits.padStart(5, '0');
}

export function normalizeFein(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!/^\d{9}$/.test(digits)) return null;
  return digits;
}

export type OirTypeBucket =
  | 'P_AND_C'
  | 'LIFE_HEALTH'
  | 'HEALTH_HMO'
  | 'TITLE'
  | 'FRATERNAL'
  | 'SURPLUS_LINES'
  | 'RISK_RETENTION_SPECIALTY'
  | 'REINSURER'
  | 'RESIDUAL_MARKET'
  | 'WARRANTY_SERVICE'
  | 'SELF_INSURANCE'
  | 'ADMINISTRATOR_INTERMEDIARY'
  | 'OTHER_REGULATED';

export function classifyOirCompanyType(raw: string): {
  raw: string;
  bucket: OirTypeBucket;
  admittedInsurerCandidate: boolean;
  propertyMarketCandidate: boolean;
  autoMarketCandidate: boolean;
  healthMarketCandidate: boolean;
  lifeAnnuityCandidate: boolean;
  titleInsurer: boolean;
  surplusLinesEligibleIndicator: boolean;
} {
  const t = raw.trim().toUpperCase();
  const surplus =
    t.includes('SURPLUS LINES') || t.includes('OFFSHORE INSURER') || t.includes('FEDERALLY AUTHORIZED');
  const title = t === 'TITLE INSURANCE';
  const health =
    t.includes('HEALTH MAINTENANCE') ||
    t.includes('PRE-PAID HEALTH') ||
    t.includes('PRE-PAID LIMITED HEALTH') ||
    t.includes('HEALTH FLEX') ||
    t.includes('PROVIDER SERVICE NETWORK') ||
    t.includes('MEDICARE PLUS CHOICE');
  const life = t === 'LIFE AND HEALTH INSURER' || t.includes('FRATERNAL BENEFIT');
  const pc =
    t === 'PROPERTY AND CASUALTY INSURER' ||
    t === 'ASSESSABLE MUTUAL' ||
    t === 'RECIPROCAL' ||
    t === 'CAPTIVE' ||
    t === 'INDUSTRIAL INSURED CAPTIVE INSURER';
  const residual = t === 'RESIDUAL MARKET';
  const rrg =
    t.includes('RISK RETENTION') ||
    t.includes('RISK PURCHASING') ||
    t.includes('LEGAL EXPENSE') ||
    t.includes('MEDICAL MALPRACTICE SELF');
  let bucket: OirTypeBucket = 'OTHER_REGULATED';
  if (title) bucket = 'TITLE';
  else if (surplus) bucket = 'SURPLUS_LINES';
  else if (health) bucket = 'HEALTH_HMO';
  else if (t.includes('FRATERNAL')) bucket = 'FRATERNAL';
  else if (life) bucket = 'LIFE_HEALTH';
  else if (pc) bucket = 'P_AND_C';
  else if (t.includes('REINSUR')) bucket = 'REINSURER';
  else if (residual) bucket = 'RESIDUAL_MARKET';
  else if (t.includes('WARRANTY') || t.includes('SERVICE COMPANY') || t.includes('MOTOR VEHICLE'))
    bucket = 'WARRANTY_SERVICE';
  else if (t.includes('SELF-INSURANCE') || t.includes('SELF-INSURER')) bucket = 'SELF_INSURANCE';
  else if (t.includes('ADMINISTRATOR') || t.includes('INTERMEDIARY') || t.includes('PREMIUM FINANCE') || t.includes('PHARMACY BENEFIT'))
    bucket = 'ADMINISTRATOR_INTERMEDIARY';
  else if (rrg) bucket = 'RISK_RETENTION_SPECIALTY';

  const admitted =
    !surplus &&
    (pc || life || health || title || t.includes('FRATERNAL') || residual || t === 'RECIPROCAL' || t === 'ASSESSABLE MUTUAL');

  return {
    raw,
    bucket,
    admittedInsurerCandidate: admitted,
    propertyMarketCandidate: pc || residual,
    autoMarketCandidate: pc,
    healthMarketCandidate: health || t === 'LIFE AND HEALTH INSURER',
    lifeAnnuityCandidate: life,
    titleInsurer: title,
    surplusLinesEligibleIndicator: surplus,
  };
}

export type OirNaicJoin =
  | {
      action: 'attach';
      confidence: 'CONFIRMED';
      cocode: string;
      key: string;
      matchBasis: typeof MATCH_BASIS_EXACT_NAIC;
    }
  | {
      action: 'hold';
      confidence: 'HIGH_CONFIDENCE_CANDIDATE';
      cocode: null;
      reason: string;
    }
  | { action: 'hold'; confidence: 'REVIEW_REQUIRED'; cocode: string | null; reason: string }
  | { action: 'hold'; confidence: 'UNRESOLVED'; cocode: null; reason: string };

export function decideOirNaicJoin(input: {
  naicCode: string | null | undefined;
  flCompanyCode: string | null | undefined;
  existingLegalInsurerKeys: ReadonlySet<string>;
}): OirNaicJoin {
  const cocode = normalizeNaicCompanyCode(input.naicCode);
  const fl = normalizeFlOirCompanyCode(input.flCompanyCode);
  if (!cocode) {
    if (fl) {
      return {
        action: 'hold',
        confidence: 'HIGH_CONFIDENCE_CANDIDATE',
        cocode: null,
        reason: 'fl_company_code_without_naic',
      };
    }
    return { action: 'hold', confidence: 'UNRESOLVED', cocode: null, reason: 'missing_naic_and_fl_code' };
  }
  const key = legalInsurerProvisionalKey(cocode);
  if (input.existingLegalInsurerKeys.has(key)) {
    return {
      action: 'attach',
      confidence: 'CONFIRMED',
      cocode,
      key,
      matchBasis: MATCH_BASIS_EXACT_NAIC,
    };
  }
  return {
    action: 'hold',
    confidence: 'REVIEW_REQUIRED',
    cocode,
    reason: 'naic_absent_from_national_spine',
  };
}

export function profileReadiness(input: {
  join: OirNaicJoin;
  typeBucket: OirTypeBucket;
}): 'READY_FOR_PROFILE_ENRICHMENT' | 'INTERNAL_ONLY' | 'REVIEW_REQUIRED' | 'NOT_READY' {
  if (input.join.confidence === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (input.join.action !== 'attach') return 'NOT_READY';
  return 'INTERNAL_ONLY';
}

export const ACTIVE_SEARCH_STATUS = 'ACTIVE_IN_OIR_COMPANY_SEARCH' as const;
