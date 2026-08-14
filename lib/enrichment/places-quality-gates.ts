/**
 * Phase 25 — Places loop quality gates (fail closed after each batch).
 * Used by the auto-loop and offline checks. Never ranks by rating.
 */

export type PlacesGateStats = {
  processed: number;
  authFailures: number;
};

export type PlacesGateRates = {
  matchRate: number;
  errorRate: number;
  ambiguousRate: number;
  stats: PlacesGateStats;
};

export type PlacesGateThresholds = {
  minMatchRate: number;
  maxErrorRate: number;
  maxAmbiguousRate: number;
  failOnEmpty?: boolean;
};

export const DEFAULT_PLACES_GATES: Required<Omit<PlacesGateThresholds, 'failOnEmpty'>> = {
  minMatchRate: 0.18,
  maxErrorRate: 0.05,
  maxAmbiguousRate: 0.1,
};

export function evaluatePlacesBatchGates(
  batch: PlacesGateRates,
  gates: PlacesGateThresholds
): { ok: boolean; reason?: string } {
  if (batch.stats.authFailures > 0) {
    return {
      ok: false,
      reason: `auth_failure: ${batch.stats.authFailures} Places auth/key failures in batch`,
    };
  }
  if (gates.failOnEmpty && batch.stats.processed === 0) {
    return { ok: false, reason: 'empty_batch: processed=0 while gate fail-on-empty-batch set' };
  }
  if (batch.stats.processed === 0) {
    return { ok: true }; // natural end of pool
  }
  if (batch.matchRate < gates.minMatchRate) {
    return {
      ok: false,
      reason: `match_rate_breach: ${(batch.matchRate * 100).toFixed(1)}% < min ${(gates.minMatchRate * 100).toFixed(1)}%`,
    };
  }
  if (batch.errorRate > gates.maxErrorRate) {
    return {
      ok: false,
      reason: `error_rate_breach: ${(batch.errorRate * 100).toFixed(1)}% > max ${(gates.maxErrorRate * 100).toFixed(1)}%`,
    };
  }
  if (batch.ambiguousRate > gates.maxAmbiguousRate) {
    return {
      ok: false,
      reason: `ambiguous_rate_breach: ${(batch.ambiguousRate * 100).toFixed(1)}% > max ${(gates.maxAmbiguousRate * 100).toFixed(1)}%`,
    };
  }
  return { ok: true };
}
