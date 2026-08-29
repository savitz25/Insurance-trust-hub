/**
 * INS-INSURER-001 — legal-insurer public-profile eligibility.
 * Product publication remains closed this task (Wave 1 = 0).
 */
import { mayPublishEntityKind } from './publication';
import {
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  nameAloneIsEvidenceIdentity,
} from './regulatory-evidence';

export const INS_INSURER_001_CONTRACT = 'insurance-legal-insurer-profile-v1' as const;
export const INS_INSURER_001_DECISION = 'ZERO_PUBLICATION' as const;
export const INS_INSURER_001_PUBLISHED_URLS = 0;
export const INS_INSURER_001_WAVE1_SIZE = 0;
export const INS_INSURER_001_ROUTE_CANONICAL = '/insurers' as const;

export type PublicationReadiness =
  | 'PUBLIC_READY'
  | 'REVIEW_REQUIRED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'IDENTITY_COLLISION'
  | 'INTERNAL_ONLY';

export type LegalInsurerEligibilityInput = {
  entityKind: string;
  identityConfidence: string;
  naicCode: string | null;
  duplicateNaic: boolean;
  nameCollision: boolean;
  usefulPublicEvidenceFamilies: readonly string[];
};

export function legalInsurerIsCarrierKind(): false {
  return false;
}
export function legalInsurerIsAgency(): false {
  return false;
}
export function legalInsurerIsProducer(): false {
  return false;
}
export function legalInsurerIsCmsEntity(): false {
  return false;
}
export function legalInsurerIsMarketplaceObservation(): false {
  return false;
}
export function appointerIsLegalInsurerWithoutBridge(): false {
  return false;
}
export function naicGroupIsNaicCompany(): false {
  return false;
}
export function brandIsLegalInsurerIdentity(): false {
  return false;
}
export function nameOnlyRegulatoryJoinAllowed(): false {
  return nameAloneIsEvidenceIdentity();
}
export function nameOnlyMarketplaceJoinAllowed(): false {
  return false;
}
export function missingEvidenceMeansZero(): false {
  return false;
}

export function classifyLegalInsurerReadiness(
  input: LegalInsurerEligibilityInput,
): PublicationReadiness {
  if (input.entityKind !== 'legal_insurer') return 'INTERNAL_ONLY';
  if (input.duplicateNaic || input.nameCollision) return 'IDENTITY_COLLISION';
  if (input.identityConfidence === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (input.identityConfidence === 'UNRESOLVED' || !input.naicCode) return 'INSUFFICIENT_EVIDENCE';
  if (input.usefulPublicEvidenceFamilies.length === 0) return 'INSUFFICIENT_EVIDENCE';
  if (!mayPublishEntityKind('legal_insurer')) return 'INTERNAL_ONLY';
  if (!PUBLIC_REGULATORY_EVIDENCE_ENABLED && input.usefulPublicEvidenceFamilies.every((f) => f === 'regulatory')) {
    return 'INTERNAL_ONLY';
  }
  if (input.identityConfidence === 'CONFIRMED') return 'PUBLIC_READY';
  return 'INTERNAL_ONLY';
}

export function mayPublishLegalInsurerProfile(input: LegalInsurerEligibilityInput): boolean {
  if (INS_INSURER_001_DECISION === 'ZERO_PUBLICATION') return false;
  if (!mayPublishEntityKind('legal_insurer')) return false;
  const readiness = classifyLegalInsurerReadiness(input);
  if (readiness === 'REVIEW_REQUIRED') return false;
  if (readiness === 'IDENTITY_COLLISION') return false;
  if (readiness === 'INSUFFICIENT_EVIDENCE') return false;
  if (readiness === 'INTERNAL_ONLY') return false;
  return readiness === 'PUBLIC_READY';
}

export const FORBIDDEN_INSURER_PROFILE_COPY = [
  'licensed nationwide',
  'writes every line',
  'serves every state',
  'currently sells',
  'recommended insurer',
  'safe insurer',
  'best insurer',
  'complaint-free',
  'regulator-approved',
  'marketplace certified',
  'trust score',
  'top insurer',
] as const;
