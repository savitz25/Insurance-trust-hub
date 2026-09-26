import 'server-only';

import { CANONICAL_MN_SNAPSHOT_FINGERPRINT } from './publication';
import { MINNESOTA_SNAPSHOT, assertMinnesotaInsurance, minnesotaSnapshotFingerprint, type MinnesotaInsuranceSnapshot } from './snapshot';

export function loadMinnesotaInsuranceView(): MinnesotaInsuranceSnapshot {
  if (minnesotaSnapshotFingerprint(MINNESOTA_SNAPSHOT) !== CANONICAL_MN_SNAPSHOT_FINGERPRINT) {
    throw new Error('MN-INS-001 snapshot fingerprint mismatch');
  }
  return assertMinnesotaInsurance(MINNESOTA_SNAPSHOT);
}

export type { MinnesotaInsuranceSnapshot };
