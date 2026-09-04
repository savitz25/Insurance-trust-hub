import 'server-only';

import { WASHINGTON_SNAPSHOT, type WashingtonInsuranceSnapshot } from './snapshot';
import { CANONICAL_WA_SNAPSHOT_FINGERPRINT } from './publication';

export function loadWashingtonInsuranceView(): WashingtonInsuranceSnapshot {
  if (WASHINGTON_SNAPSHOT.fingerprint !== CANONICAL_WA_SNAPSHOT_FINGERPRINT) {
    throw new Error('WA-INS-001 snapshot fingerprint mismatch');
  }
  return WASHINGTON_SNAPSHOT;
}

export type { WashingtonInsuranceSnapshot };
