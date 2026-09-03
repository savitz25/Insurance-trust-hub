import 'server-only';

import { CALIFORNIA_SNAPSHOT, type CaliforniaInsuranceSnapshot } from './snapshot';
import { CANONICAL_CA_SNAPSHOT_FINGERPRINT } from './publication';

export function loadCaliforniaInsuranceView(): CaliforniaInsuranceSnapshot {
  if (CALIFORNIA_SNAPSHOT.fingerprint !== CANONICAL_CA_SNAPSHOT_FINGERPRINT) {
    throw new Error('CA-INS-001 snapshot fingerprint mismatch');
  }
  return CALIFORNIA_SNAPSHOT;
}

export type { CaliforniaInsuranceSnapshot };
