import 'server-only';

import { NEW_YORK_SNAPSHOT, type NewYorkInsuranceSnapshot } from './snapshot';
import { CANONICAL_NY_SNAPSHOT_FINGERPRINT } from './publication';

export function loadNewYorkInsuranceView(): NewYorkInsuranceSnapshot {
  if (NEW_YORK_SNAPSHOT.fingerprint !== CANONICAL_NY_SNAPSHOT_FINGERPRINT) {
    throw new Error('NY-INS-001 snapshot fingerprint mismatch');
  }
  return NEW_YORK_SNAPSHOT;
}

export type { NewYorkInsuranceSnapshot };
