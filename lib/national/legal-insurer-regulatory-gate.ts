/**
 * INS-INSURER-002 — source-family allowlist + public-safe observation gate.
 * Does not flip PUBLIC_REGULATORY_EVIDENCE_ENABLED globally.
 * COMPLAINT / TDI complaint-index rows stay INTERNAL_ONLY this task.
 */
import { EVIDENCE_FAMILY } from './regulatory-evidence';
import { mayPublishRegulatoryEvidenceRecord } from './regulatory-display';
import { nameOnlyRegulatoryJoinAllowed } from './legal-insurer-publication';

export const INS_INSURER_002_DECISION = 'ZERO_PUBLICATION' as const;
export const INS_INSURER_002_WAVE1_SIZE = 0;
export const INS_INSURER_002_PUBLISHED_URLS = 0;
export const INS_INSURER_002_IDENTITY_ONLY_PAGES = false;
export const INS_INSURER_002_ROUTE_CANONICAL = '/insurers' as const;

/** Empty allowlist: no source family is public-safe for legal-insurer pages in this task. */
export const INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST: readonly string[] = [];

export const TDI_COMPLAINT_INDEX_DATASET = 'tdi_complaint_indexes' as const;

export const FL_RECEIVER_DATASET = 'florida_dfs_receiver_companies' as const;

export const HELD_SOURCE_FAMILY = {
  dataset: TDI_COMPLAINT_INDEX_DATASET,
  regulator: 'Texas Department of Insurance',
  observationType: 'CONFIRMED_COMPLAINT_INDEX',
  family: EVIDENCE_FAMILY.COMPLAINT,
  grain: 'legal_insurer × calendar year × line of coverage (complaint-index statistic)',
  identifier: 'TDI NAIC ID exact-matched to official NAIC CoCode',
  attachmentMethod: 'exact_tdi_naic_id_equals_official_loc_cocode',
  publicSourceUrl: 'https://data.texas.gov/dataset/Complaint-indexes-and-policy-counts-for-insurance-/pa9u-9s9w',
  nativeLabel: 'Complaint-index statistic',
  publicationEligible: false,
  holdReason:
    'Source-native object is a Texas complaint-index statistic (confirmed complaints, policy counts, and an index by year and line), not a consent order, examination, or enforcement action. Existing mayPublishRegulatoryEvidenceRecord rejects COMPLAINT for the generic enforcement renderer. Publishing the index as Regulatory & Enforcement History would read as a complaint score and as violations.',
} as const;

export const REGULATORY_HISTORY_HEADING = 'Regulatory & Enforcement History' as const;
export const COMPLAINT_DATA_HEADING = 'Complaint Data' as const;
export const ABSENCE_NOT_CLEAN_RECORD =
  'No attached regulatory observation in currently ingested sources is not a clean record. It can mean the source is not ingested, not covered, not bridgeable, not published equivalently by the regulator, or covers a different time range.';
export const OBSERVATION_NOT_VIOLATION =
  'A regulatory observation is not automatically a violation, enforcement finding, or quality score.';
export const COUNT_NOT_VIOLATIONS =
  'A count of regulatory records is a count of ingested source rows in the families and date ranges listed — not a count of violations.';

export const FORBIDDEN_REGULATORY_SCORES = [
  'enforcement score',
  'risk score',
  'complaint score',
  'trust score',
  'regulatory grade',
  'clean badge',
  'safe badge',
] as const;

export type PublicSafetyClass = 'PUBLIC_SAFE' | 'INTERNAL_ONLY' | 'REVIEW_REQUIRED';

export type RegulatoryObservationRow = {
  id: string;
  entityId: string | null;
  respondentKind: string | null;
  sourceDataset: string | null;
  family: string | null;
  subtype: string | null;
  publicationReadiness: string | null;
  attributionConfidence: string | null;
  eventDate: string | null;
  sourceObservedAt: string | null;
  recordIdentifier: string | null;
  matchBasis: string | null;
};

export function tdiComplaintIndexEventGroupKey(recordIdentifier: string | null): string | null {
  if (!recordIdentifier) return null;
  return `${TDI_COMPLAINT_INDEX_DATASET}|${recordIdentifier}`;
}

/** Duplicate grouping only when the source identifier proves the same year×line slice. No fuzzy name/text merge. */
export function regulatoryEventGroupKey(row: {
  sourceDataset: string | null;
  recordIdentifier: string | null;
}): string | null {
  if (!row.sourceDataset || !row.recordIdentifier) return null;
  return `${row.sourceDataset}|${row.recordIdentifier}`;
}

export function classifyObservationPublicSafety(row: RegulatoryObservationRow): PublicSafetyClass {
  if (nameOnlyRegulatoryJoinAllowed()) return 'REVIEW_REQUIRED';
  if (!row.entityId) return 'REVIEW_REQUIRED';
  if (row.respondentKind && row.respondentKind !== 'legal_insurer') return 'INTERNAL_ONLY';
  if (row.attributionConfidence === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (row.attributionConfidence !== 'CONFIRMED') return 'INTERNAL_ONLY';
  if (!row.sourceDataset || !row.family || !row.eventDate && !row.sourceObservedAt) return 'REVIEW_REQUIRED';
  if (row.matchBasis && /name.?only|name_alone|fuzzy/i.test(row.matchBasis)) return 'REVIEW_REQUIRED';
  const allowlisted = INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST.includes(row.sourceDataset);
  if (!allowlisted) return 'INTERNAL_ONLY';
  const gate = mayPublishRegulatoryEvidenceRecord({
    entityId: row.entityId,
    identityConfidence: row.attributionConfidence as 'CONFIRMED',
    publicationReadiness: row.publicationReadiness,
    family: row.family,
    sourceDataset: row.sourceDataset,
    eventDate: row.eventDate,
    respondentKind: row.respondentKind,
  });
  if (!gate.ok) return 'INTERNAL_ONLY';
  return 'PUBLIC_SAFE';
}

export function identityOnlyPagesAllowed(): false {
  return INS_INSURER_002_IDENTITY_ONLY_PAGES;
}

export function marketplaceOnLegalInsurerProfileAllowed(): false {
  return false;
}
export function medicareOnLegalInsurerProfileAllowed(): false {
  return false;
}
export function appointmentsOnLegalInsurerProfileAllowed(): false {
  return false;
}
export function inferredInsurerCredentialsAllowed(): false {
  return false;
}
export function complaintIndexIsEnforcementAction(): false {
  return false;
}
export function attachedObservationCountIsViolationCount(): false {
  return false;
}

export type RegulatoryDenominators = {
  R1: number;
  R2: number;
  R3: number;
  R4: number;
  R5: number;
  R6: number;
  R7: number;
  R8: number;
};

export function assertRegulatoryEquations(d: RegulatoryDenominators): string[] {
  const errors: string[] = [];
  if (d.R2 + d.R3 !== d.R1) errors.push(`R2+R3=${d.R2 + d.R3} ≠ R1=${d.R1}`);
  if (d.R5 + d.R6 + d.R7 !== d.R4) errors.push(`R5+R6+R7=${d.R5 + d.R6 + d.R7} ≠ R4=${d.R4}`);
  return errors;
}

export type EligibilityV2Input = {
  entityKind: string;
  identityConfidence: string;
  naicCode: string | null;
  duplicateNaic: boolean;
  publicSafeObservationCount: number;
  internalOnlyAttachedObservationCount: number;
  reviewRequiredObservationCount: number;
};

/** V2: attached INTERNAL_ONLY complaint indexes are INTERNAL_ONLY, not empty-shell PUBLIC_READY. */
export function classifyLegalInsurerReadinessV2(
  input: EligibilityV2Input,
): import('./legal-insurer-publication').PublicationReadiness {
  if (input.entityKind !== 'legal_insurer') return 'INTERNAL_ONLY';
  if (input.duplicateNaic) return 'IDENTITY_COLLISION';
  if (input.identityConfidence === 'REVIEW_REQUIRED' || input.reviewRequiredObservationCount > 0) {
    return 'REVIEW_REQUIRED';
  }
  if (!input.naicCode || input.identityConfidence === 'UNRESOLVED') return 'INSUFFICIENT_EVIDENCE';
  if (input.publicSafeObservationCount > 0) return 'PUBLIC_READY';
  if (input.internalOnlyAttachedObservationCount > 0) return 'INTERNAL_ONLY';
  return 'INSUFFICIENT_EVIDENCE';
}
