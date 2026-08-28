/**
 * INS-NAT-FINAL-005 — fail-closed public gate for regulatory evidence.
 * Global flag remains off. Even CONFIRMED TDI complaint indexes stay INTERNAL_ONLY
 * until a later copy/UI task sets publication_readiness.
 */

import {
  EVIDENCE_FAMILY,
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  PUBLICATION_READINESS,
  SAFE_PUBLIC_COPY,
} from './regulatory-evidence';
import type { IdentityConfidence } from './types';

export const TDI_COMPLAINT_COPY = {
  submodule: 'Complaint Data',
  heading: 'Complaint Data',
  explanation:
    'Texas Department of Insurance complaint-index data reports confirmed complaints and policy counts by insurer, year, and line of coverage.',
  notFinding:
    'Complaint data does not by itself establish a regulatory violation or enforcement finding.',
  coverageNote:
    'Research currently includes the official sources listed below as of the source date on each row. Missing data is not evidence of absence.',
} as const;

export const FORBIDDEN_COMPLAINT_RENDER = [
  'disciplinary action',
  'violation',
  'misconduct',
  'final order',
  'finding',
  'Clean record',
  'No complaints ever',
  'No regulatory issues',
] as const;

/** Option A — no legal-insurer consumer pages in this national stage. */
export const LEGAL_INSURER_DISPLAY_DECISION = 'INTERNAL_ONLY' as const;

export type RegulatoryPublishInput = {
  entityId?: string | null;
  identityConfidence?: IdentityConfidence | null;
  publicationReadiness?: string | null;
  family?: string | null;
  sourceDataset?: string | null;
  eventDate?: string | null;
  respondentKind?: string | null;
};

export function mayPublishRegulatoryEvidenceRecord(
  e: RegulatoryPublishInput
): { ok: true } | { ok: false; reason: string } {
  if (!PUBLIC_REGULATORY_EVIDENCE_ENABLED) {
    return { ok: false, reason: 'regulatory_evidence_publication_disabled' };
  }
  if (!e.entityId) return { ok: false, reason: 'unresolved_respondent' };
  if (e.identityConfidence !== 'CONFIRMED') {
    return { ok: false, reason: 'identity_not_confirmed' };
  }
  if (
    e.publicationReadiness !== PUBLICATION_READINESS.READY_FOR_PUBLIC_REVIEW
  ) {
    return { ok: false, reason: 'not_ready_for_public_review' };
  }
  if (!e.family || !e.sourceDataset) return { ok: false, reason: 'missing_source_family' };
  if (!e.eventDate) return { ok: false, reason: 'missing_source_date' };
  if (e.family === EVIDENCE_FAMILY.COMPLAINT) {
    return { ok: false, reason: 'complaint_requires_dedicated_copy_surface' };
  }
  return { ok: true };
}

export function complaintZeroIsCleanRecord(): false {
  return false;
}

export function legalInsurerEvidenceAppearsOnAgencyReport(): false {
  return false;
}

export function agencyEvidenceAppearsOnPersonReport(): false {
  return false;
}

export { SAFE_PUBLIC_COPY };
