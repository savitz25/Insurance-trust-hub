import 'server-only';

import { ILLINOIS_SNAPSHOT, type IllinoisInsuranceSnapshot } from './snapshot';
import { CANONICAL_IL_SNAPSHOT_FINGERPRINT } from './publication';

export function loadIllinoisInsuranceView(): IllinoisInsuranceSnapshot {
  if (ILLINOIS_SNAPSHOT.fingerprint !== CANONICAL_IL_SNAPSHOT_FINGERPRINT) {
    throw new Error('IL-INS-001 snapshot fingerprint mismatch');
  }
  return ILLINOIS_SNAPSHOT;
}

export type { IllinoisInsuranceSnapshot };
