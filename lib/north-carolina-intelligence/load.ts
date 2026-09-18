import 'server-only';

import { NORTH_CAROLINA_SNAPSHOT, type NorthCarolinaInsuranceSnapshot } from './snapshot';
import { CANONICAL_NC_SNAPSHOT_FINGERPRINT } from './publication';

export function loadNorthCarolinaInsuranceView(): NorthCarolinaInsuranceSnapshot {
  if (NORTH_CAROLINA_SNAPSHOT.fingerprint !== CANONICAL_NC_SNAPSHOT_FINGERPRINT) {
    throw new Error('NC-INS-001 snapshot fingerprint mismatch');
  }
  return NORTH_CAROLINA_SNAPSHOT;
}

export type { NorthCarolinaInsuranceSnapshot };
