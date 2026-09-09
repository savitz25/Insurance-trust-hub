import 'server-only';

import { COLORADO_SNAPSHOT, type ColoradoInsuranceSnapshot } from './snapshot';
import { CANONICAL_CO_SNAPSHOT_FINGERPRINT } from './publication';

export function loadColoradoInsuranceView(): ColoradoInsuranceSnapshot {
  if (COLORADO_SNAPSHOT.fingerprint !== CANONICAL_CO_SNAPSHOT_FINGERPRINT) {
    throw new Error('CO-INS-001 snapshot fingerprint mismatch');
  }
  return COLORADO_SNAPSHOT;
}

export type { ColoradoInsuranceSnapshot };
