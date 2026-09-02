/**
 * INS-INSURER-003 — examination evidence spine.
 * California primary. Florida OIR conditional (listing has no NAIC → unattached).
 * Does not mix TDI complaint-index rows. Does not launch /insurers unless PUBLIC_SAFE exists.
 */
import { normalizeNaicCompanyCode } from './legal-insurer-identity';
import { TDI_COMPLAINT_INDEX_DATASET } from './legal-insurer-regulatory-gate';

export const INS_INSURER_003_DECISION = 'ZERO_PUBLICATION' as const;
export const INS_INSURER_003_WAVE1_SIZE = 0;
export const INS_INSURER_003_PUBLISHED_URLS = 0;
export const INS_INSURER_003_PUBLIC_SOURCE_ALLOWLIST: readonly string[] = [];

export const EXAMINATION_FAMILY = {
  MARKET_CONDUCT_EXAMINATION: 'MARKET_CONDUCT_EXAMINATION',
  FINANCIAL_EXAMINATION: 'FINANCIAL_EXAMINATION',
} as const;

export type ExaminationFamily = (typeof EXAMINATION_FAMILY)[keyof typeof EXAMINATION_FAMILY];

export const CDI_FINANCIAL_DATASET = 'california_cdi_financial_exams' as const;
export const CDI_MARKET_CONDUCT_DATASET = 'california_cdi_market_conduct_exams' as const;
export const FL_OIR_MARKET_CONDUCT_DATASET = 'florida_oir_market_conduct_exams' as const;
export const FL_OIR_FINANCIAL_DATASET = 'florida_oir_financial_exams' as const;
export const NJ_DOBI_MARKET_CONDUCT_DATASET = 'nj_dobi_market_conduct_exams' as const;
export const NJ_DOBI_FINANCIAL_DATASET = 'nj_dobi_financial_exams' as const;

export const EXAMINATION_HEADING = 'Examination Reports' as const;
export const EXAMINATION_ABSENCE =
  'No examination found in InsuranceTrustHub does not mean the insurer has never been examined.';
export const EXAMINATION_NOT_MISCONDUCT =
  'The existence of an examination does not by itself mean misconduct. A finding in a report should be read in its source context.';
export const EXAMINATION_NOT_ENFORCEMENT =
  'An examination is a regulator review of specified company practices or financial condition. It is not an enforcement action, violation, penalty, or discipline label.';

export type ExaminationIdentityMethod =
  | 'exact_cocode_in_source_document'
  | 'exact_source_native_mapped_to_naic'
  | 'previously_accepted_bridge'
  | 'group_only'
  | 'name_only'
  | 'ambiguous_multi_entity'
  | 'missing_identifier';

export type ExaminationIdentityDecision =
  | {
      attach: true;
      confidence: 'CONFIRMED';
      cocode: string;
      method: 'exact_cocode_in_source_document' | 'exact_source_native_mapped_to_naic' | 'previously_accepted_bridge';
    }
  | {
      attach: false;
      confidence: 'UNRESOLVED' | 'REVIEW_REQUIRED';
      cocode: null;
      method: ExaminationIdentityMethod;
      reason: string;
    };

export function marketConductIsEnforcementAction(): false {
  return false;
}
export function financialExaminationIsEnforcementAction(): false {
  return false;
}
export function examinationExistenceIsMisconduct(): false {
  return false;
}
export function examinationIsViolation(): false {
  return false;
}
export function nameOnlyExamAttachAllowed(): false {
  return false;
}
export function naicGroupIsCompanyForExam(): false {
  return false;
}
export function reportDateEqualsRetrievedDate(): false {
  return false;
}
export function tdiComplaintIsExamination(): false {
  return false;
}

/** Five-digit CoCode in the source document, verified as company (not group). */
export function decideExaminationIdentity(input: {
  naicCompanyCode?: string | null;
  naicGroupCode?: string | null;
  listingNameOnly?: boolean;
  multipleLegalEntities?: boolean;
  officialCoCodes: ReadonlySet<string>;
}): ExaminationIdentityDecision {
  if (input.multipleLegalEntities) {
    return {
      attach: false,
      confidence: 'REVIEW_REQUIRED',
      cocode: null,
      method: 'ambiguous_multi_entity',
      reason: 'report_or_listing_covers_multiple_legal_entities_without_per_entity_cocode_map',
    };
  }
  const cocode = normalizeNaicCompanyCode(input.naicCompanyCode);
  const group = String(input.naicGroupCode || '').replace(/\D/g, '');
  if (!cocode && group) {
    return {
      attach: false,
      confidence: 'UNRESOLVED',
      cocode: null,
      method: 'group_only',
      reason: 'naic_group_is_not_naic_company',
    };
  }
  if (!cocode) {
    return {
      attach: false,
      confidence: 'UNRESOLVED',
      cocode: null,
      method: input.listingNameOnly ? 'name_only' : 'missing_identifier',
      reason: input.listingNameOnly ? 'name_only_attachment_prohibited' : 'no_deterministic_identifier',
    };
  }
  if (!input.officialCoCodes.has(cocode)) {
    return {
      attach: false,
      confidence: 'UNRESOLVED',
      cocode: null,
      method: 'exact_cocode_in_source_document',
      reason: 'cocode_not_on_official_legal_insurer_spine',
    };
  }
  return {
    attach: true,
    confidence: 'CONFIRMED',
    cocode,
    method: 'exact_cocode_in_source_document',
  };
}

export function examinationPublicSafe(input: {
  attached: boolean;
  identityConfidence: string;
  examType: ExaminationFamily | null;
  reportDate: string | null;
  retrievedAt: string | null;
  sourceUrl: string | null;
  nameOnly: boolean;
}): 'PUBLIC_SAFE' | 'INTERNAL_ONLY' | 'REVIEW_REQUIRED' {
  if (input.nameOnly || !input.attached) return 'REVIEW_REQUIRED';
  if (input.identityConfidence !== 'CONFIRMED') return 'INTERNAL_ONLY';
  if (!input.examType || !input.reportDate || !input.sourceUrl) return 'REVIEW_REQUIRED';
  if (input.retrievedAt && input.reportDate === input.retrievedAt) return 'REVIEW_REQUIRED';
  if (INS_INSURER_003_PUBLIC_SOURCE_ALLOWLIST.length === 0) return 'INTERNAL_ONLY';
  return 'PUBLIC_SAFE';
}

export function examinationDedupeKey(input: {
  regulator: string;
  sourceNativeId?: string | null;
  naic?: string | null;
  examType?: string | null;
  reportDate?: string | null;
  sourceUrl?: string | null;
}): string {
  if (input.sourceNativeId) return `${input.regulator}|${input.sourceNativeId}`;
  return [input.regulator, input.naic || '', input.examType || '', input.reportDate || '', input.sourceUrl || ''].join(
    '|',
  );
}

export function tdiDatasetMustStayInternal(dataset: string): boolean {
  return dataset === TDI_COMPLAINT_INDEX_DATASET;
}

export type ExaminationRecordV1 = {
  entityId: string | null;
  entityKind: 'legal_insurer';
  naicCocode: string | null;
  regulator: string;
  jurisdiction: string;
  sourceDataset: string;
  evidenceFamily: ExaminationFamily;
  reportTitle: string;
  reportIdentifier: string | null;
  examType: ExaminationFamily;
  examScopeStart: string | null;
  examScopeEnd: string | null;
  reportDate: string | null;
  sourceUrl: string;
  sourceDocumentUrl: string | null;
  sourceObservedAt: string | null;
  retrievedAt: string;
  attachmentMethod: ExaminationIdentityMethod;
  attachmentConfidence: string;
  publicEligibility: 'PUBLIC_SAFE' | 'INTERNAL_ONLY' | 'REVIEW_REQUIRED';
  publicHoldReason: string | null;
};

export type ExamDenominators = {
  E1: number;
  E2: number;
  E3: number;
  E4: number;
  E5: number;
  E6: number;
  E7: number;
  E8: number;
  E9: number;
  E10: number;
  E11: number;
};

export function assertExamEquations(d: ExamDenominators): string[] {
  const errors: string[] = [];
  if (d.E2 + d.E3 + d.E4 !== d.E1) errors.push(`E2+E3+E4=${d.E2 + d.E3 + d.E4} ≠ E1=${d.E1}`);
  if (d.E5 + d.E6 > d.E2) errors.push(`E5+E6=${d.E5 + d.E6} > E2=${d.E2}`);
  return errors;
}
