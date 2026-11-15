'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { setRuntimeAnalyticsEnvironment, shouldEnablePosthog } from '@/lib/analytics/environment';
import { boundedToken, stateCode } from '@/lib/analytics/privacy';
import { getPosthogBrowser } from '@/lib/analytics/posthog-browser';
import { captureSanitizedPageview, captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

const CLICK_EVENTS = new Set<string>([
  TRUSTHUB_EVENTS.SEARCH_SUBMITTED,
  TRUSTHUB_EVENTS.SEARCH_RESULT_OPENED,
  TRUSTHUB_EVENTS.CLAIM_STARTED,
  TRUSTHUB_EVENTS.SPECIALIST_HANDOFF_STARTED,
]);

function PosthogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!shouldEnablePosthog()) return;
    const path = pathname || '/';
    void getPosthogBrowser()
      .then((posthog) => {
        if (!posthog) return;
        captureSanitizedPageview(path, window.location.href);
      })
      .catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}

function PosthogClickEvents() {
  useEffect(() => {
    if (!shouldEnablePosthog()) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-ph-event]') : null;
      const name = target?.dataset.phEvent;
      if (!target || !name || !CLICK_EVENTS.has(name)) return;
      captureTrustEvent(
        name,
        {
          surface: boundedToken(target.dataset.phSurface),
          state: stateCode(target.dataset.phState),
          specialist_hub: boundedToken(target.dataset.phSpecialistHub),
          capability_state: boundedToken(target.dataset.phCapabilityState),
          success: true,
        },
        { sendBeforeUnload: true },
      );
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}

export function PosthogRoot({ environment }: { environment?: string }) {
  setRuntimeAnalyticsEnvironment(environment);
  useEffect(() => {
    setRuntimeAnalyticsEnvironment(environment);
    void getPosthogBrowser().catch(() => undefined);
  }, [environment]);

  return (
    <Suspense fallback={null}>
      <PosthogPageviews />
      <PosthogClickEvents />
    </Suspense>
  );
}
