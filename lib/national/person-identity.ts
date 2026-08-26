/**
 * Individual producer identity + privacy rules.
 * NPN is the only CONFIRMED national person key.
 * Name is compatibility evidence, never an identity key.
 * Person contacts default public_eligible=false.
 */

import { compareLegalNames, type NameCompatibility } from './names';
import { isValidNpn, normalizeNpn } from './npn';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPublishEntityKind,
  mayPromoteToPublicProvider,
} from './publication';

export const PERSON_CONTACT_PUBLIC_ELIGIBLE_DEFAULT = false;

const FL_CORE_EXCLUDE =
  /adjuster|customer representative|service representative|\btitle\b|credit|bail|surety|warranty|travel|surplus|preneed|mediator|navigator|neutral|in-transit|rental|legal expense|crop|managing general|\bmga\b|public adj/i;
const FL_CORE_INCLUDE =
  /life|health|general lines|gen lines|personal lines|variable|var ann/i;

export function isFlIndividualCoreProducerTycl(raw: string | null | undefined): boolean {
  const t = String(raw || '').trim();
  if (!t) return false;
  if (FL_CORE_EXCLUDE.test(t)) return false;
  return FL_CORE_INCLUDE.test(t);
}

export function isVtIndividualProducerClass(raw: string | null | undefined): boolean {
  return String(raw || '').trim().toLowerCase() === 'insurance producer';
}

export function personContactPublicEligible(): boolean {
  return PERSON_CONTACT_PUBLIC_ELIGIBLE_DEFAULT;
}

export function personProfilesArePublic(): boolean {
  return PUBLIC_PERSON_PROFILES_ENABLED && mayPublishEntityKind('person');
}

export function personPublicationBlocked(): boolean {
  const pub = mayPromoteToPublicProvider({ entityKind: 'person', entityType: 'individual' });
  return pub.ok === false;
}

/** Never infer WORKS_FOR from shared contact/location. */
export function worksForFromSharedContact(): false {
  return false;
}

export type PersonIdentityDecision =
  | { action: 'create' | 'attach'; confidence: 'CONFIRMED' }
  | { action: 'review_name'; confidence: 'REVIEW_REQUIRED'; reason: 'same_npn_incompatible_names' }
  | { action: 'kind_conflict'; confidence: 'REVIEW_REQUIRED'; reason: 'same_npn_person_agency_conflict' }
  | { action: 'provisional'; confidence: 'UNRESOLVED'; reason: 'missing_or_invalid_npn' };

export function decidePersonIdentity(input: {
  npn: string | null | undefined;
  legalName: string;
  existingPersonName?: string | null;
  agencyOwnsNpn?: boolean;
}): PersonIdentityDecision {
  const npn = normalizeNpn(input.npn ?? null);
  if (!npn || !isValidNpn(npn)) {
    return { action: 'provisional', confidence: 'UNRESOLVED', reason: 'missing_or_invalid_npn' };
  }
  if (input.agencyOwnsNpn) {
    return {
      action: 'kind_conflict',
      confidence: 'REVIEW_REQUIRED',
      reason: 'same_npn_person_agency_conflict',
    };
  }
  if (input.existingPersonName) {
    const cmp: NameCompatibility = compareLegalNames(input.existingPersonName, input.legalName);
    if (cmp === 'conflict') {
      return {
        action: 'review_name',
        confidence: 'REVIEW_REQUIRED',
        reason: 'same_npn_incompatible_names',
      };
    }
    return { action: 'attach', confidence: 'CONFIRMED' };
  }
  return { action: 'create', confidence: 'CONFIRMED' };
}

export function displayNameFromDfsFullName(fullName: string): string {
  const s = String(fullName || '').trim();
  const m = s.match(/^([^,]+),\s*(.+)$/);
  if (m) return `${m[2].trim()} ${m[1].trim()}`.replace(/\s+/g, ' ');
  return s;
}
