import 'server-only';

import { PENNSYLVANIA_SNAPSHOT, type PennsylvaniaInsuranceSnapshot } from './snapshot';
import { CANONICAL_PA_SNAPSHOT_FINGERPRINT } from './publication';

export function loadPennsylvaniaInsuranceView(): PennsylvaniaInsuranceSnapshot {
  if (PENNSYLVANIA_SNAPSHOT.fingerprint !== CANONICAL_PA_SNAPSHOT_FINGERPRINT) {
    throw new Error('PA-INS-001 snapshot fingerprint mismatch');
  }
  return PENNSYLVANIA_SNAPSHOT;
}

export type { PennsylvaniaInsuranceSnapshot };
