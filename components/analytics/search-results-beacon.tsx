'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

type SearchResultsBeaconProps = {
  surface: string;
  resultCount?: number;
  success: boolean;
  state?: string;
  capabilityState?: string;
};

function SearchResultsBeaconEffect({ surface, resultCount, success, state, capabilityState }: SearchResultsBeaconProps) {
  // The current search string is only an effect dependency so that a new search
  // with the same result count and state still reports. It is never sent.
  const searchKey = useSearchParams()?.toString() ?? '';
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {
      surface,
      result_count: resultCount,
      success,
      state,
      capability_state: capabilityState,
    });
  }, [surface, resultCount, success, state, capabilityState, searchKey]);
  return null;
}

/** Reports a completed search without receiving or sending the query text. */
export function SearchResultsBeacon(props: SearchResultsBeaconProps) {
  return (
    <Suspense fallback={null}>
      <SearchResultsBeaconEffect {...props} />
    </Suspense>
  );
}
