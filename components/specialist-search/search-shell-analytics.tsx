'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

export function SearchShellAnalytics() {
  useEffect(() => {
    const forms = document.querySelectorAll<HTMLFormElement>('form[aria-label="Research insurance identities and evidence"]');
    const onSubmit = () => track('specialist_search_submit', { hub: 'insurance' });
    forms.forEach((form) => form.addEventListener('submit', onSubmit));
    return () => forms.forEach((form) => form.removeEventListener('submit', onSubmit));
  }, []);
  return null;
}
