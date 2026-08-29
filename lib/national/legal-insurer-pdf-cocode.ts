/**
 * INS-INSURER-004 — CoCode mention ≠ exam subject.
 * Five-digit numbers are not automatically NAIC. Name validates; CoCode identifies.
 */
export const INS_INSURER_004_DECISION = 'ZERO_PUBLICATION' as const;
export const INS_INSURER_004_WAVE1_SIZE = 0;
export const INS_INSURER_004_PUBLISHED_URLS = 0;
export const INS_INSURER_004_IDENTITY_WRITES = 0;

export const EXAM_ATTACHMENT_CLASS = {
  EXAMINED_ENTITY_EXACT: 'EXAMINED_ENTITY_EXACT',
  CONSOLIDATED_EXAM_EXPLICIT: 'CONSOLIDATED_EXAM_EXPLICIT',
  COCODE_MENTION_ONLY: 'COCODE_MENTION_ONLY',
  NAME_ONLY: 'NAME_ONLY',
  AMBIGUOUS: 'AMBIGUOUS',
  UNREADABLE: 'UNREADABLE',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
} as const;

export type ExamAttachmentClass = (typeof EXAM_ATTACHMENT_CLASS)[keyof typeof EXAM_ATTACHMENT_CLASS];

export const ATTACHABLE_CLASSES: readonly ExamAttachmentClass[] = [
  'EXAMINED_ENTITY_EXACT',
  'CONSOLIDATED_EXAM_EXPLICIT',
];

export function cocodeMentionIsExamSubject(): false {
  return false;
}
export function fiveDigitNumberIsAutomaticallyNaic(): false {
  return false;
}
export function groupMemberMentionAttaches(): false {
  return false;
}
export function nameOnlyPdfAttaches(): false {
  return false;
}
export function nameIsIdentityJoin(): false {
  return false;
}
export function financialExamIsEnforcement(): false {
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

export function mayAttachExamClass(c: ExamAttachmentClass): boolean {
  return ATTACHABLE_CLASSES.includes(c);
}

export function reportDateIsRetrievedDate(reportDate: string, retrievedAt: string): boolean {
  return reportDate === retrievedAt;
}

/** Unique reports must land in exactly one class; X5+…+X10 = unique classified PDFs. */
export function assertClassPartition(x: {
  X1: number;
  X5: number;
  X6: number;
  X7: number;
  X8: number;
  X9: number;
  X10: number;
}): string[] {
  const sum = x.X5 + x.X6 + x.X7 + x.X8 + x.X9 + x.X10;
  if (sum !== x.X1) return [`X5+…+X10=${sum} ≠ X1=${x.X1}`];
  return [];
}
