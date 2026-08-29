/**
 * INS-INSURER-005 — exact examination evidence ingest + public-safe gate.
 * Routes stay unpublished. TDI complaint indexes stay INTERNAL_ONLY.
 */
import {
  EXAMINATION_FAMILY,
  type ExaminationFamily,
} from './legal-insurer-examination';
import { TDI_COMPLAINT_INDEX_DATASET } from './legal-insurer-regulatory-gate';
import { ATTACHABLE_CLASSES, type ExamAttachmentClass } from './legal-insurer-pdf-cocode';
import type { PublicationReadiness } from './legal-insurer-publication';

export const INS_INSURER_005_DECISION = 'ZERO_PUBLICATION' as const;
export const INS_INSURER_005_WAVE1_SIZE = 0;
export const INS_INSURER_005_PUBLISHED_URLS = 0;
export const INS_INSURER_005_IDENTITY_WRITES = 0;
export const INS_INSURER_005_SITEMAP_DELTA = 0;

export const FARMERS_EXACT_COCODES = [
  '21652',
  '21660',
  '21709',
  '10315',
  '10318',
  '21687',
  '10317',
] as const;

export const FARMERS_DOCUMENT_HASH =
  'ba88e28116e08e27ecab2dfaeea39a7649ee646012f9e299f003f9e31fb28ca0' as const;

/** Deterministic lock of the first 26 PUBLIC_READY legal insurers (NAIC|entity_id). */
export const INS_INSURER_005B_COHORT_FINGERPRINT =
  '9fae2c8fba13789a0445b50eae7af15a48c9cda3662d4ce8c31c0d6b4d488681' as const;

export const NON_CANONICAL_FIVE_DIGIT = '32399' as const;

export const ATTACHMENT_METHOD = {
  PDF_NATIVE_COCODE_EXPLICIT_SUBJECT: 'PDF_NATIVE_COCODE_EXPLICIT_SUBJECT',
  PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE: 'PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE',
} as const;

export type ExamAttachmentMethod = (typeof ATTACHMENT_METHOD)[keyof typeof ATTACHMENT_METHOD];

export const EXAM_DATASETS = {
  CA_FINANCIAL: 'california_cdi_financial_exams',
  FL_MARKET_CONDUCT: 'florida_oir_market_conduct_exams',
} as const;

/** Data-plane public-safe exam sources. Does not mount /insurers. */
export const INS_INSURER_005_PUBLIC_EXAM_DATASETS: readonly string[] = [
  EXAM_DATASETS.CA_FINANCIAL,
  EXAM_DATASETS.FL_MARKET_CONDUCT,
];

export const EXAMINATION_REPORTS_HEADING = 'Examination Reports' as const;

export const PUBLIC_EXAM_COPY = {
  caFinancial: 'California Department of Insurance filed a financial examination report for this legal insurer.',
  flMarketConduct:
    'Florida Office of Insurance Regulation published a market conduct examination report for this legal insurer.',
  notMisconduct:
    'An examination is a regulator review. Its existence does not by itself establish misconduct, a violation, or a quality rating.',
  absence:
    'No examination shown here does not mean the company has never been examined.',
} as const;

export function cocodeMentionIsExamSubject(): false {
  return false;
}
export function floridaCoverCocodeRequiresExplicitSubject(): true {
  return true;
}
export function fiveDigit32399CannotAttach(): true {
  return true;
}
export function nameValidatesNeverJoins(): true {
  return true;
}
export function nameOnlyPdfAttaches(): false {
  return false;
}
export function mentionOnlyPdfAttaches(): false {
  return false;
}
export function financialExamIsMarketConduct(): false {
  return false;
}
export function marketConductIsEnforcement(): false {
  return false;
}
export function examIsViolation(): false {
  return false;
}
export function absenceMeansNeverExamined(): false {
  return false;
}
export function complaintIndexIsScore(): false {
  return false;
}
export function enforcementScoreExists(): false {
  return false;
}
export function trustScoreExists(): false {
  return false;
}
export function recommendationExists(): false {
  return false;
}

export function mayAttachExamClass(c: ExamAttachmentClass): boolean {
  return ATTACHABLE_CLASSES.includes(c);
}

export function mayAttachFiveDigit(code: string): boolean {
  return code !== NON_CANONICAL_FIVE_DIGIT;
}

export function attachmentMethodForClass(c: ExamAttachmentClass): ExamAttachmentMethod | null {
  if (c === 'EXAMINED_ENTITY_EXACT') return ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_SUBJECT;
  if (c === 'CONSOLIDATED_EXAM_EXPLICIT') return ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE;
  return null;
}

export type ExamPublicSafeInput = {
  classification: string;
  naicCocode: string;
  spineHasUnique: boolean;
  officialSourceUrl: string | null;
  documentHash: string | null;
  examType: ExaminationFamily | null;
  reportDate: string | null;
  retrievedAt: string | null;
  confidentialRequired: boolean;
  consumerSafeDescription: string | null;
};

export function classifyExamRelationshipPublicSafe(input: ExamPublicSafeInput): 'PUBLIC_SAFE' | 'REVIEW_REQUIRED' | 'INTERNAL_ONLY' {
  if (input.classification === 'HISTORICAL_NAME_REVIEW') return 'REVIEW_REQUIRED';
  if (!mayAttachExamClass(input.classification as ExamAttachmentClass)) return 'INTERNAL_ONLY';
  if (!mayAttachFiveDigit(input.naicCocode)) return 'INTERNAL_ONLY';
  if (!input.spineHasUnique) return 'REVIEW_REQUIRED';
  if (!input.officialSourceUrl || !input.documentHash) return 'REVIEW_REQUIRED';
  if (input.documentHash.length !== 64) return 'REVIEW_REQUIRED';
  if (!input.examType || !input.reportDate) return 'REVIEW_REQUIRED';
  if (input.retrievedAt && input.reportDate === input.retrievedAt) return 'REVIEW_REQUIRED';
  if (input.confidentialRequired) return 'INTERNAL_ONLY';
  if (!input.consumerSafeDescription) return 'REVIEW_REQUIRED';
  return 'PUBLIC_SAFE';
}

export type ReadinessV4Input = {
  entityKind: string;
  identityConfidence: string;
  naicCode: string | null;
  duplicateNaic: boolean;
  publicSafeExamCount: number;
  reviewRequiredExamCount: number;
  internalOnlyAttachedCount: number;
};

export function classifyLegalInsurerReadinessV4(input: ReadinessV4Input): PublicationReadiness {
  if (input.entityKind !== 'legal_insurer') return 'INTERNAL_ONLY';
  if (input.duplicateNaic) return 'IDENTITY_COLLISION';
  if (input.identityConfidence === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (input.reviewRequiredExamCount > 0 && input.publicSafeExamCount === 0) return 'REVIEW_REQUIRED';
  if (!input.naicCode || input.identityConfidence === 'UNRESOLVED') return 'INSUFFICIENT_EVIDENCE';
  if (input.publicSafeExamCount > 0) return 'PUBLIC_READY';
  if (input.internalOnlyAttachedCount > 0) return 'INTERNAL_ONLY';
  return 'INSUFFICIENT_EVIDENCE';
}

export type PublicSafeDenominators = {
  PS1: number;
  PS2: number;
  PS3: number;
  PS4: number;
  PS5: number;
  PS6: number;
  PS7: number;
  PS8: number;
  PS9: number;
  PS10: number;
};

export function assertPublicSafeEquations(d: PublicSafeDenominators): string[] {
  const errors: string[] = [];
  if (d.PS5 + d.PS6 + d.PS7 !== d.PS3) {
    errors.push(`PS5+PS6+PS7=${d.PS5 + d.PS6 + d.PS7} ≠ PS3=${d.PS3}`);
  }
  if (d.PS4 > d.PS3) errors.push(`PS4=${d.PS4} > PS3=${d.PS3}`);
  if (d.PS8 + d.PS9 > d.PS5) errors.push(`PS8+PS9=${d.PS8 + d.PS9} > PS5=${d.PS5}`);
  if (d.PS10 > d.PS4) errors.push(`PS10=${d.PS10} > PS4=${d.PS4}`);
  if (d.PS1 > d.PS2) errors.push(`PS1=${d.PS1} > PS2=${d.PS2}`);
  return errors;
}

export function tdiComplaintRemainsInternal(dataset: string): boolean {
  return dataset === TDI_COMPLAINT_INDEX_DATASET;
}

export function examFamilyIsEnforcement(family: string): boolean {
  return family !== EXAMINATION_FAMILY.FINANCIAL_EXAMINATION && family !== EXAMINATION_FAMILY.MARKET_CONDUCT_EXAMINATION
    ? false
    : false;
}

export function relationshipRecordId(sourceDataset: string, documentHash: string, cocode: string): string {
  return `${sourceDataset}|${documentHash}|${cocode}`;
}

export function examinationRecordId(sourceDataset: string, documentHash: string): string {
  return `${sourceDataset}|exam|${documentHash}`;
}
