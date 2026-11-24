'use client';

import { useEffect } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';
import { type InsuranceSearchAnalytics } from '@/lib/specialist-search/analytics';

export function SearchAnalytics({ dimensions, resultCount }: { dimensions: InsuranceSearchAnalytics; resultCount: number }) {
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {
      surface: 'ask',
      result_count: resultCount,
      success: true,
      state: dimensions.state,
      capability_state: dimensions.coverageState,
    });
    const root = document.querySelector('[data-specialist-results]');
    const click = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-specialist-event]') : null;
      const action = target?.dataset.specialistEvent;
      if (action === 'profile_open') {
        captureTrustEvent(
          TRUSTHUB_EVENTS.SEARCH_RESULT_OPENED,
          {
            surface: 'ask',
            success: true,
            state: dimensions.state,
            capability_state: dimensions.coverageState,
          },
          { sendBeforeUnload: true },
        );
      }
    };
    root?.addEventListener('click', click);
    return () => { root?.removeEventListener('click', click); };
  }, [dimensions, resultCount]);
  return null;
}
