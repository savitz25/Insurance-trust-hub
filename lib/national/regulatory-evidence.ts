/**
 * INS-NAT-FINAL-004 — National regulatory/enforcement evidence contract.
 * Complaints ≠ findings. Public rendering remains OFF until FINAL-005.
 */

import type { IdentityConfidence } from './types';
import { mayTraverseRegulatoryEvidence } from './legal-insurer-identity';

export const EVIDENCE_TASK = 'INS-NAT-FINAL-004';
export const EVIDENCE_TRANSFORM = 'ins-nat-final-004.v1';

export const PUBLIC_REGULATORY_EVIDENCE_ENABLED = false;

export const EVIDENCE_FAMILY = {
  COMPLAINT: 'COMPLAINT',
  ALLEGATION_OR_NOTICE: 'ALLEGATION_OR_NOTICE',
  INVESTIGATION: 'INVESTIGATION',
  ADMINISTRATIVE_ACTION: 'ADMINISTRATIVE_ACTION',
  FINAL_ORDER: 'FINAL_ORDER',
  CONSENT_ORDER: 'CONSENT_ORDER',
  LICENSE_ACTION: 'LICENSE_ACTION',
  MONETARY_PENALTY: 'MONETARY_PENALTY',
  CEASE_AND_DESIST: 'CEASE_AND_DESIST',
  MARKET_CONDUCT_EXAM: 'MARKET_CONDUCT_EXAM',
  FINANCIAL_EXAM: 'FINANCIAL_EXAM',
  RECEIVERSHIP: 'RECEIVERSHIP',
  REHABILITATION: 'REHABILITATION',
  LIQUIDATION: 'LIQUIDATION',
  CIVIL_REMEDY_NOTICE: 'CIVIL_REMEDY_NOTICE',
  PROGRAM_STATUS_ACTION: 'PROGRAM_STATUS_ACTION',
  OTHER_REGULATORY_EVENT: 'OTHER_REGULATORY_EVENT',
} as const;

export type EvidenceFamily = (typeof EVIDENCE_FAMILY)[keyof typeof EVIDENCE_FAMILY];

export const EVIDENCE_DISPOSITION = {
  PENDING: 'PENDING',
  OPEN: 'OPEN',
  FINAL: 'FINAL',
  SETTLED: 'SETTLED',
  CONSENTED: 'CONSENTED',
  DISMISSED: 'DISMISSED',
  WITHDRAWN: 'WITHDRAWN',
  CLOSED_NO_ACTION: 'CLOSED_NO_ACTION',
  REVOKED: 'REVOKED',
  SUSPENDED: 'SUSPENDED',
  PROBATION: 'PROBATION',
  FINED: 'FINED',
  CEASE_AND_DESIST: 'CEASE_AND_DESIST',
  RECEIVERSHIP: 'RECEIVERSHIP',
  REHABILITATION: 'REHABILITATION',
  LIQUIDATION: 'LIQUIDATION',
  UNKNOWN: 'UNKNOWN',
} as const;

export const PUBLICATION_READINESS = {
  READY_FOR_PUBLIC_REVIEW: 'READY_FOR_PUBLIC_REVIEW',
  INTERNAL_ONLY: 'INTERNAL_ONLY',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  NOT_READY: 'NOT_READY',
} as const;

export const SAFE_PUBLIC_COPY = {
  heading: 'Regulatory & Enforcement History',
  coverage:
    'Research currently includes the official sources listed below as of [date].',
  noMatch:
    'No matched regulatory action was found in the sources currently included in our research as of [date].',
} as const;

export const FORBIDDEN_PUBLIC_COPY = [
  'No regulatory history.',
  'Clean record.',
  'No complaints.',
  'bad actor',
  'fraudulent',
  'unsafe',
  'high risk',
  'poor quality',
] as const;

export const RESPONDENT_KIND = {
  PERSON: 'person',
  AGENCY: 'agency',
  LEGAL_INSURER: 'legal_insurer',
  STATE_APPOINTING_ENTITY: 'carrier',
  INSURANCE_GROUP: 'insurance_group',
  OTHER_REGULATED_ENTITY: 'other_regulated_entity',
} as const;

export function complaintIsFinalOrder(): false {
  return false;
}
export function complaintIsEnforcementFinding(): false {
  return false;
}
export function cmsTerminationIsMisconduct(): false {
  return false;
}
export function naicStatusIsEnforcementEvent(): false {
  return false;
}
export function nameAloneIsEvidenceIdentity(): false {
  return false;
}
export function affiliationInheritsAdverse(): false {
  return false;
}
export function appointmentInheritsAdverse(): false {
  return false;
}
export function brandInheritsAdverse(): false {
  return false;
}
export function groupInheritsMemberAdverse(): false {
  return false;
}
export function personActionDisciplinesAgency(): false {
  return false;
}
export function agencyActionDisciplinesPerson(): false {
  return false;
}
export function mayPublishRegulatoryEvidence(): boolean {
  return PUBLIC_REGULATORY_EVIDENCE_ENABLED;
}
export function reviewRequiredMayAttachToCanonicalEntity(): false {
  return false;
}

export function evidenceMayTraverseBridge(bridge: IdentityConfidence): boolean {
  return mayTraverseRegulatoryEvidence(bridge);
}

export function publicationReadinessForThisTask(): 'INTERNAL_ONLY' {
  return 'INTERNAL_ONLY';
}

export type EvidenceIdentityDecision =
  | {
      confidence: 'CONFIRMED';
      respondentKind: 'legal_insurer';
      cocode: string;
      legalInsurerKey: string;
      matchBasis: string;
    }
  | {
      confidence: 'REVIEW_REQUIRED';
      respondentKind: 'legal_insurer' | 'insurance_group' | null;
      matchBasis: string;
    }
  | {
      confidence: 'UNRESOLVED';
      respondentKind: null;
      matchBasis: string;
    };

export function decideLegalInsurerEvidenceIdentity(input: {
  naicId?: string | null;
  officialCoCodes: ReadonlySet<string>;
  officialGroupCodes: ReadonlySet<string>;
}): EvidenceIdentityDecision {
  const digits = String(input.naicId || '').replace(/\D/g, '');
  if (!digits) {
    return { confidence: 'UNRESOLVED', respondentKind: null, matchBasis: 'missing_naic_id' };
  }
  const cocode = /^\d{5}$/.test(digits) ? digits : null;
  const group = String(parseInt(digits, 10));
  const coHit = cocode ? input.officialCoCodes.has(cocode) : false;
  const groupHit = input.officialGroupCodes.has(group);
  if (cocode && coHit && groupHit) {
    return {
      confidence: 'REVIEW_REQUIRED',
      respondentKind: 'legal_insurer',
      matchBasis: 'naic_id_matches_both_cocode_and_group',
    };
  }
  if (cocode && coHit) {
    return {
      confidence: 'CONFIRMED',
      respondentKind: 'legal_insurer',
      cocode,
      legalInsurerKey: `legal-insurer:naic:${cocode}`,
      matchBasis: 'exact_tdi_naic_id_equals_official_loc_cocode',
    };
  }
  if (groupHit && !coHit) {
    return {
      confidence: 'REVIEW_REQUIRED',
      respondentKind: 'insurance_group',
      matchBasis: 'naic_id_equals_group_code_complaint_index_not_group_level_action',
    };
  }
  return {
    confidence: 'UNRESOLVED',
    respondentKind: null,
    matchBasis: 'naic_id_not_in_official_legal_insurer_spine',
  };
}

export function normalizeComplaintIndexDisposition(confirmedCount: number | null): string {
  if (confirmedCount == null) return EVIDENCE_DISPOSITION.UNKNOWN;
  return EVIDENCE_DISPOSITION.UNKNOWN;
}
