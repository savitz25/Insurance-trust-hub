import 'server-only';

import { TEXAS_SNAPSHOT, type TexasInsuranceSnapshot } from './snapshot';
import { CANONICAL_TX_SNAPSHOT_FINGERPRINT } from './publication';

export function loadTexasInsuranceView(): TexasInsuranceSnapshot {
  if (TEXAS_SNAPSHOT.fingerprint !== CANONICAL_TX_SNAPSHOT_FINGERPRINT) {
    throw new Error('TX-INS-001 snapshot fingerprint mismatch');
  }
  return TEXAS_SNAPSHOT;
}

export type { TexasInsuranceSnapshot };
