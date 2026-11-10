'use client';

import { useEffect } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

export function ProfileViewedBeacon({ surface, state }: { surface: string; state?: string }) {
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.PROFILE_VIEWED, {
      surface,
      state,
      success: true,
    });
  }, [surface, state]);
  return null;
}
