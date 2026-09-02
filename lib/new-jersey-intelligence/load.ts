/**
 * NJ-INS-003 — server loader for /new-jersey.
 * Committed accepted snapshot only. Database is not required for this page.
 */
import 'server-only';

import { NEW_JERSEY_SNAPSHOT, type NewJerseyInsuranceSnapshot } from './snapshot';
import { CANONICAL_NJ_SNAPSHOT_FINGERPRINT } from './publication';

export function loadNewJerseyInsuranceView(): NewJerseyInsuranceSnapshot {
  if (NEW_JERSEY_SNAPSHOT.fingerprint !== CANONICAL_NJ_SNAPSHOT_FINGERPRINT) {
    throw new Error('NJ-INS-003 snapshot fingerprint mismatch');
  }
  return NEW_JERSEY_SNAPSHOT;
}

export type { NewJerseyInsuranceSnapshot };
