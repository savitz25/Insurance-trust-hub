'use client';

import { useEffect } from 'react';
import { trackInsuranceIntelEvent } from '@/lib/analytics/intel-events';

/** Click-only homepage intelligence events. No hover noise. */
export function HomeIntelEvents() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const el =
        event.target instanceof Element ? event.target.closest('[data-intel-event]') : null;
      if (!(el instanceof HTMLElement)) return;
      const name = el.dataset.intelEvent;
      if (!name) return;
      if (
        name === 'insurance_intel_explore' ||
        name === 'insurance_intel_trace_number' ||
        name === 'insurance_intel_explain_chart' ||
        name === 'insurance_intel_state_click' ||
        name === 'insurance_intel_research_agency'
      ) {
        trackInsuranceIntelEvent(name, { href: el.getAttribute('href') ?? undefined });
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
