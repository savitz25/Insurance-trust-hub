'use client';

import { useEffect } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

/** Reports a completed search without receiving the query text. */
export function SearchResultsBeacon({
  surface,
  resultCount,
  success,
  state,
  capabilityState,
}: {
  surface: string;
  resultCount?: number;
  success: boolean;
  state?: string;
  capabilityState?: string;
}) {
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {
      surface,
      result_count: resultCount,
      success,
      state,
      capability_state: capabilityState,
    });
  }, [surface, resultCount, success, state, capabilityState]);
  return null;
}
