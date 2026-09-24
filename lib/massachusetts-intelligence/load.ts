import 'server-only';

import { MASSACHUSETTS_SNAPSHOT, assertMassachusettsInsurance, type MassachusettsInsuranceSnapshot } from './snapshot';
import { CANONICAL_MA_SNAPSHOT_FINGERPRINT } from './publication';

export function loadMassachusettsInsuranceView(): MassachusettsInsuranceSnapshot {
  if (MASSACHUSETTS_SNAPSHOT.fingerprint !== CANONICAL_MA_SNAPSHOT_FINGERPRINT) {
    throw new Error('MA-INS-001 snapshot fingerprint mismatch');
  }
  return assertMassachusettsInsurance(MASSACHUSETTS_SNAPSHOT);
}

export type { MassachusettsInsuranceSnapshot };
