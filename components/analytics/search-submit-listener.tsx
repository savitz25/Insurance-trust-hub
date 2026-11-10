'use client';

import { useEffect, useRef } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';
import { stateCode } from '@/lib/analytics/privacy';

/** Listens to the parent form. Does not read free-text fields. */
export function SearchSubmitListener({ surface }: { surface: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const onSubmit = () => {
      const selected = form.querySelector('select[name="state"]');
      const value = selected instanceof HTMLSelectElement ? selected.value : '';
      captureTrustEvent(
        TRUSTHUB_EVENTS.SEARCH_SUBMITTED,
        {
          surface,
          success: true,
          state: stateCode(value),
        },
        { sendBeforeUnload: true },
      );
    };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [surface]);

  return <span ref={ref} hidden />;
}
