'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

export function SearchShellAnalytics() {
  useEffect(() => {
    const forms = document.querySelectorAll<HTMLFormElement>('form[aria-label="Research insurance identities and evidence"]');
    const onSubmit = (event: Event) => {
      const form = event.currentTarget;
      if (form instanceof HTMLFormElement) {
        // SQA-009-RESTORE-001B: native GET serializes untouched Advanced filters as
        // entity=&state=&loa=&evidence=. Empty selects are not chosen filters — disable
        // them so typed Research submits q (and only applied filters). Parser also ignores
        // empty/chrome params; this keeps the consumer URL honest.
        for (const el of Array.from(form.elements)) {
          if (el instanceof HTMLSelectElement && !el.value) el.disabled = true;
        }
      }
      track('specialist_search_submit', { hub: 'insurance' });
    };
    forms.forEach((form) => form.addEventListener('submit', onSubmit));
    return () => forms.forEach((form) => form.removeEventListener('submit', onSubmit));
  }, []);
  return null;
}
