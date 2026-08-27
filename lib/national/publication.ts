/**
 * Product publication gate.
 * Individual (person) graph entities are allowed.
 * Public provider profiles for persons are denied until a later product task.
 * This MUST NOT depend only on a CLI --entity default.
 */

import type { NationalEntityKind } from './types';

/** Flip only in an intentional later task that enables producer profiles. */
export const PUBLIC_PERSON_PROFILES_ENABLED = false;

export const INDIVIDUAL_PUBLICATION_DISABLED_REASON =
  'individual_publication_disabled';

const UNPUBLISHED_KINDS: ReadonlySet<NationalEntityKind> = new Set([
  'carrier',
  'legal_insurer',
  'insurance_group',
  'consumer_brand',
]);

export function mayPublishEntityKind(kind: NationalEntityKind): boolean {
  if (kind === 'person') return PUBLIC_PERSON_PROFILES_ENABLED;
  if (UNPUBLISHED_KINDS.has(kind)) return false;
  return true;
}

export function mayPromoteToPublicProvider(input: {
  entityType?: string | null;
  entityKind?: NationalEntityKind | null;
}): { ok: true } | { ok: false; reason: string } {
  const raw = String(input.entityType || input.entityKind || '')
    .toLowerCase()
    .trim();
  if (raw === 'individual' || raw === 'person') {
    if (!PUBLIC_PERSON_PROFILES_ENABLED) {
      return { ok: false, reason: INDIVIDUAL_PUBLICATION_DISABLED_REASON };
    }
  }
  return { ok: true };
}
