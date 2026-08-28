/**
 * FL-INS-004 — Florida regulatory / enforcement evidence identity and semantics.
 *
 * CRN ≠ finding ≠ final order. Market-conduct ≠ financial exam.
 * Exam existence ≠ misconduct. Receivership ≠ conduct violation.
 * Attach only via exact NAIC CoCode or a Florida Company Code already
 * mapped to that CoCode. Name-only adverse matching is rejected.
 * Publication remains INTERNAL_ONLY / fail-closed.
 */
import type { IdentityConfidence } from './types';
import { legalInsurerProvisionalKey, normalizeNaicCompanyCode } from './legal-insurer-identity';
import { normalizeFlOirCompanyCode } from './fl-oir-company';
import { EVIDENCE_FAMILY, PUBLIC_REGULATORY_EVIDENCE_ENABLED } from './regulatory-evidence';

export const FL_EVIDENCE_TASK = 'FL-INS-004';
export const FL_EVIDENCE_TRANSFORM = 'fl-ins-004.v1';

export const FL_EVIDENCE_SOURCES = {
  crn: {
    authority: 'Florida Department of Financial Services',
    portal: 'https://apps.fldfs.com/civilremedy/',
    search: 'https://apps.fldfs.com/civilremedy/SearchFiling.aspx',
    statute: 'F.S. 624.155',
    retrieval: 'interactive ASP.NET search only; no public bulk/CSV/API',
  },
  marketConductPc: {
    authority: 'Florida Office of Insurance Regulation',
    portal: 'https://floir.gov/property-casualty/property-and-casualty-market-regulation',
    retrieval: 'published HTML listing of examination reports and consent orders',
  },
  marketConductLh: {
    authority: 'Florida Office of Insurance Regulation',
    portal: 'https://floir.gov/life-health/life-and-health-market-regulation',
    retrieval: 'published HTML listing of examination reports and consent orders',
  },
  financialExamPc: {
    authority: 'Florida Office of Insurance Regulation',
    portal: 'https://floir.gov/property-casualty/property-casualty-financial-oversight',
    retrieval: 'published HTML listing of financial examination reports',
  },
  financialExamLh: {
    authority: 'Florida Office of Insurance Regulation',
    portal: 'https://floir.gov/life-health/life-health-financial-oversight',
    retrieval: 'published HTML listing of financial examination reports',
  },
  ordersMemoranda: {
    authority: 'Florida Office of Insurance Regulation',
    portal: 'https://floir.gov/resources-and-reports/orders-and-memoranda',
    retrieval: 'published HTML listing of administrative orders and memoranda',
  },
  receiver: {
    authority: 'Florida Department of Financial Services, Division of Rehabilitation and Liquidation',
    portal: 'https://www.myfloridacfo.com/division/receiver/companies',
    retrieval: 'official open-receivership HTML list and company detail pages',
  },
} as const;

export const FL_RECEIVER_SOURCE_DATASET = 'florida_dfs_receiver_companies';
export const FL_CRN_SOURCE_DATASET = 'florida_dfs_civil_remedy_notices';
export const FL_MARKET_EXAM_SOURCE_DATASET = 'florida_oir_market_conduct_exams';
export const FL_FINANCIAL_EXAM_SOURCE_DATASET = 'florida_oir_financial_exams';
export const FL_ORDER_SOURCE_DATASET = 'florida_oir_administrative_orders';

export const CRN_SAFE_PUBLIC_COPY =
  'Civil Remedy Notice filed in Florida DFS records.';

export function crnIsFinalOrder(): false {
  return false;
}
export function crnIsEnforcementFinding(): false {
  return false;
}
export function crnIsComplaintIndex(): false {
  return false;
}
export function crnNameOnlyAttaches(): false {
  return false;
}
export function marketExamEqualsFinancialExam(): false {
  return false;
}
export function examExistenceIsMisconduct(): false {
  return false;
}
export function pendingActionIsFinal(): false {
  return false;
}
export function receivershipIsConductViolation(): false {
  return false;
}
export function nameOnlyAdverseMatchAttaches(): false {
  return false;
}
export function nonInsurerForcedToLegalInsurer(): false {
  return false;
}
export function floridaEvidenceChangesTrustScore(): false {
  return false;
}
export function floridaEvidencePublishesInsurerPages(): false {
  return false;
}
export function naicCompanyStatusIsReceivershipEvent(): false {
  return false;
}

export function crnFamily(): string {
  return EVIDENCE_FAMILY.CIVIL_REMEDY_NOTICE;
}
export function marketExamFamily(): string {
  return EVIDENCE_FAMILY.MARKET_CONDUCT_EXAM;
}
export function financialExamFamily(): string {
  return EVIDENCE_FAMILY.FINANCIAL_EXAM;
}

export function classifyReceivershipFamily(statusRaw: string | null | undefined): {
  family: string;
  disposition: string;
} {
  const s = String(statusRaw || '').toLowerCase();
  if (/\bliquidat/.test(s)) {
    return { family: EVIDENCE_FAMILY.LIQUIDATION, disposition: 'LIQUIDATION' };
  }
  if (/\brehabilit/.test(s)) {
    return { family: EVIDENCE_FAMILY.REHABILITATION, disposition: 'REHABILITATION' };
  }
  return { family: EVIDENCE_FAMILY.RECEIVERSHIP, disposition: 'RECEIVERSHIP' };
}

export function orderIsFinal(input: {
  instrument: 'FINAL_ORDER' | 'CONSENT_ORDER' | 'PENDING' | 'NOTICE' | string;
}): boolean {
  if (input.instrument === 'PENDING' || input.instrument === 'NOTICE') return false;
  if (input.instrument === 'FINAL_ORDER' || input.instrument === 'CONSENT_ORDER') return true;
  return false;
}

export type FlEvidenceIdentityDecision =
  | {
      confidence: 'CONFIRMED';
      respondentKind: 'legal_insurer';
      cocode: string;
      legalInsurerKey: string;
      matchBasis: string;
      attach: true;
    }
  | {
      confidence: 'HIGH_CONFIDENCE';
      respondentKind: null;
      matchBasis: string;
      attach: false;
    }
  | {
      confidence: 'REVIEW_REQUIRED';
      respondentKind: 'legal_insurer' | 'other_regulated_entity' | null;
      matchBasis: string;
      attach: false;
    }
  | {
      confidence: 'UNRESOLVED';
      respondentKind: 'other_regulated_entity' | null;
      matchBasis: string;
      attach: false;
    };

export function decideFloridaEvidenceIdentity(input: {
  naicCoCode?: string | null;
  flCompanyCode?: string | null;
  officialCoCodes: ReadonlySet<string>;
  flCodeToNaic: ReadonlyMap<string, string>;
  nameOnly?: string | null;
  nonInsurer?: boolean;
}): FlEvidenceIdentityDecision {
  if (input.nonInsurer) {
    return {
      confidence: 'UNRESOLVED',
      respondentKind: 'other_regulated_entity',
      matchBasis: 'non_insurer_entity_not_forced_to_legal_insurer',
      attach: false,
    };
  }

  const naic = normalizeNaicCompanyCode(input.naicCoCode);
  const flCode = normalizeFlOirCompanyCode(input.flCompanyCode);

  if (naic && input.officialCoCodes.has(naic)) {
    return {
      confidence: 'CONFIRMED',
      respondentKind: 'legal_insurer',
      cocode: naic,
      legalInsurerKey: legalInsurerProvisionalKey(naic),
      matchBasis: 'exact_naic_cocode_on_official_legal_insurer_spine',
      attach: true,
    };
  }

  if (flCode) {
    const mapped = input.flCodeToNaic.get(flCode) || null;
    if (mapped && input.officialCoCodes.has(mapped)) {
      return {
        confidence: 'CONFIRMED',
        respondentKind: 'legal_insurer',
        cocode: mapped,
        legalInsurerKey: legalInsurerProvisionalKey(mapped),
        matchBasis: 'exact_fl_oir_company_code_already_mapped_to_naic',
        attach: true,
      };
    }
    if (mapped && !input.officialCoCodes.has(mapped)) {
      return {
        confidence: 'REVIEW_REQUIRED',
        respondentKind: 'legal_insurer',
        matchBasis: 'fl_oir_company_code_maps_to_naic_not_on_spine',
        attach: false,
      };
    }
    return {
      confidence: 'UNRESOLVED',
      respondentKind: null,
      matchBasis: 'fl_oir_company_code_not_already_mapped_to_naic',
      attach: false,
    };
  }

  if (naic && !input.officialCoCodes.has(naic)) {
    return {
      confidence: 'UNRESOLVED',
      respondentKind: null,
      matchBasis: 'naic_cocode_not_on_official_legal_insurer_spine',
      attach: false,
    };
  }

  if (input.nameOnly && String(input.nameOnly).trim()) {
    return {
      confidence: 'UNRESOLVED',
      respondentKind: null,
      matchBasis: 'name_only_adverse_identity_rejected',
      attach: false,
    };
  }

  return {
    confidence: 'UNRESOLVED',
    respondentKind: null,
    matchBasis: 'missing_naic_and_fl_oir_company_code',
    attach: false,
  };
}

export function duplicateRecordBlocked(
  existing: ReadonlySet<string>,
  sourceDataset: string,
  recordIdentifier: string
): boolean {
  return existing.has(`${sourceDataset}|${recordIdentifier}`);
}

export function evidenceProvenanceComplete(row: {
  sourceDataset?: string | null;
  recordIdentifier?: string | null;
  sourceUrl?: string | null;
  sourceObservedAt?: string | null;
  family?: string | null;
}): boolean {
  return Boolean(
    row.sourceDataset &&
      row.recordIdentifier &&
      row.sourceUrl &&
      row.sourceObservedAt &&
      row.family
  );
}

export function mayPublishFloridaRegulatoryEvidence(): boolean {
  return PUBLIC_REGULATORY_EVIDENCE_ENABLED;
}

export function reviewRequiredMayAttachFloridaEvidence(): false {
  return false;
}

export function highConfidenceMayAttachFloridaEvidence(): false {
  return false;
}

export type IdentityConfidenceCount = Record<IdentityConfidence, number>;
