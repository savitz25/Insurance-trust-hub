import 'server-only';

import { OREGON_SNAPSHOT, type OregonInsuranceSnapshot } from './snapshot';
import { CANONICAL_OR_SNAPSHOT_FINGERPRINT } from './publication';

export function loadOregonInsuranceView(): OregonInsuranceSnapshot {
  if (OREGON_SNAPSHOT.fingerprint !== CANONICAL_OR_SNAPSHOT_FINGERPRINT) {
    throw new Error('OR-INS-001 snapshot fingerprint mismatch');
  }
  return OREGON_SNAPSHOT;
}

export type { OregonInsuranceSnapshot };
