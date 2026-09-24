import 'server-only';

import { GEORGIA_SNAPSHOT, type GeorgiaInsuranceSnapshot } from './snapshot';
import { CANONICAL_GA_SNAPSHOT_FINGERPRINT } from './publication';

export function loadGeorgiaInsuranceView(): GeorgiaInsuranceSnapshot {
  if (GEORGIA_SNAPSHOT.fingerprint !== CANONICAL_GA_SNAPSHOT_FINGERPRINT) {
    throw new Error('GA-INS-001 snapshot fingerprint mismatch');
  }
  return GEORGIA_SNAPSHOT;
}

export type { GeorgiaInsuranceSnapshot };
