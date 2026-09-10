import 'server-only';

import { VIRGINIA_SNAPSHOT, type VirginiaInsuranceSnapshot } from './snapshot';
import { CANONICAL_VA_SNAPSHOT_FINGERPRINT } from './publication';

export function loadVirginiaInsuranceView(): VirginiaInsuranceSnapshot {
  if (VIRGINIA_SNAPSHOT.fingerprint !== CANONICAL_VA_SNAPSHOT_FINGERPRINT) {
    throw new Error('VA-INS-001 snapshot fingerprint mismatch');
  }
  return VIRGINIA_SNAPSHOT;
}

export type { VirginiaInsuranceSnapshot };
