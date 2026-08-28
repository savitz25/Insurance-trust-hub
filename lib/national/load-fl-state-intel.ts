/**
 * FL-INS-007 — server loader for /florida.
 */
import 'server-only';

import snapshotJson from '@/data/reports/fl-ins-006-state-snapshot.json';
import readinessJson from '@/data/reports/fl-ins-006-profile-readiness.json';
import { buildFloridaStateView, type FloridaStateView } from '@/lib/national/fl-state-display';

export function loadFloridaStateView(): FloridaStateView {
  return buildFloridaStateView(snapshotJson, readinessJson);
}

export type { FloridaStateView };
