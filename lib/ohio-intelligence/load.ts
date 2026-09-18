import 'server-only';

import { OHIO_SNAPSHOT, type OhioInsuranceSnapshot } from './snapshot';
import { CANONICAL_OH_SNAPSHOT_FINGERPRINT } from './publication';

export function loadOhioInsuranceView(): OhioInsuranceSnapshot {
  if (OHIO_SNAPSHOT.fingerprint !== CANONICAL_OH_SNAPSHOT_FINGERPRINT) {
    throw new Error('OH-INS-001 snapshot fingerprint mismatch');
  }
  return OHIO_SNAPSHOT;
}

export type { OhioInsuranceSnapshot };
