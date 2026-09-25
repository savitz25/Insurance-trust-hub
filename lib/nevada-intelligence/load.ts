import 'server-only';

import { NEVADA_SNAPSHOT, assertNevadaInsurance, type NevadaInsuranceSnapshot } from './snapshot';
import { CANONICAL_NV_SNAPSHOT_FINGERPRINT } from './publication';

export function loadNevadaInsuranceView(): NevadaInsuranceSnapshot {
  if (NEVADA_SNAPSHOT.fingerprint !== CANONICAL_NV_SNAPSHOT_FINGERPRINT) {
    throw new Error('NV-INS-001 snapshot fingerprint mismatch');
  }
  return assertNevadaInsurance(NEVADA_SNAPSHOT);
}

export type { NevadaInsuranceSnapshot };
