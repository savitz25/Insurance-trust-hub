'use client';

import { analyticsEnvironment, shouldEnablePosthog } from './environment';
import { getPosthogBrowser } from './posthog-browser';
import { boundedToken, sanitizeAnalyticsUrl, stateCode, stripForbiddenProperties } from './privacy';
import { TRUSTHUB_HUB, type TrustHubEventName, type TrustHubEventProperties } from './trusthub-events';

export type TrustHubCaptureOptions = {
  /** Use before a navigation that unloads the page. */
  sendBeforeUnload?: boolean;
};

let lastPageviewKey = '';

export function commonTrustHubProperties(
  extra?: Partial<TrustHubEventProperties>,
): Record<string, string | number | boolean> {
  const state = stateCode(extra?.state);
  const capabilityState = boundedToken(extra?.capability_state);
  return stripForbiddenProperties({
    hub: TRUSTHUB_HUB,
    environment: analyticsEnvironment(),
    ...extra,
    state,
    capability_state: capabilityState,
    surface: boundedToken(extra?.surface),
    specialist_hub: boundedToken(extra?.specialist_hub),
  });
}

export function captureTrustEvent(
  event: TrustHubEventName | string,
  properties?: Partial<TrustHubEventProperties>,
  options?: TrustHubCaptureOptions,
): void {
  try {
    if (!shouldEnablePosthog()) return;
    const payload = commonTrustHubProperties(properties);
    void getPosthogBrowser()
      .then((posthog) => {
        if (!posthog) return;
        if (options?.sendBeforeUnload) {
          posthog.capture(event, payload, { send_instantly: true, transport: 'sendBeacon' });
          return;
        }
        posthog.capture(event, payload);
      })
      .catch(() => undefined);
  } catch {
    // Observability must never break product flows.
  }
}

export function captureSanitizedPageview(pathname: string, href?: string): void {
  try {
    const path = (pathname || '/').split('?')[0] || '/';
    const current = sanitizeAnalyticsUrl(href || pathname) || path;
    if (lastPageviewKey === current) return;
    lastPageviewKey = current;
    captureTrustEvent('$pageview', {
      surface: 'app_router',
      $pathname: path,
      $current_url: current,
    });
  } catch {
    // ignore
  }
}

export function resetPageviewDedupeForTests(): void {
  lastPageviewKey = '';
}
