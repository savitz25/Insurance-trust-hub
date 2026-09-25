import 'server-only';

import { TENNESSEE_SNAPSHOT, assertTennesseeInsurance, type TennesseeInsuranceSnapshot } from './snapshot';
import { CANONICAL_TN_SNAPSHOT_FINGERPRINT } from './publication';

export function loadTennesseeInsuranceView(): TennesseeInsuranceSnapshot {
  if (TENNESSEE_SNAPSHOT.fingerprint !== CANONICAL_TN_SNAPSHOT_FINGERPRINT) {
    throw new Error('TN-INS-001 snapshot fingerprint mismatch');
  }
  return assertTennesseeInsurance(TENNESSEE_SNAPSHOT);
}

export type { TennesseeInsuranceSnapshot };
