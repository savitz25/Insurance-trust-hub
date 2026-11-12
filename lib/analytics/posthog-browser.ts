'use client';

import type { PostHog } from 'posthog-js';
import { analyticsEnvironment, posthogHost, posthogKey, shouldEnablePosthog } from './environment';
import { createPosthogClientGate } from './posthog-gate';
import { isReplayEvent, maskReplayAttribute, sanitizeCapturedNetworkRequest, sanitizeCaptureResult } from './privacy';
import { TRUSTHUB_HUB } from './trusthub-events';

async function loadPosthog(): Promise<PostHog | null> {
  const key = posthogKey();
  if (!key) return null;
  const posthog = (await import('posthog-js')).default;
  posthog.init(key, {
    api_host: posthogHost(),
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    // Privacy: replay DOM snapshots and the document title can carry raw Ask
    // queries, so session replay is off for this hub regardless of the shared
    // project setting. Heatmaps and dead-click capture are off for the same reason.
    disable_session_recording: true,
    enable_heatmaps: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    // Autocapture never collects element text (labels and options can echo a query).
    mask_all_text: true,
    autocapture: {
      // Clicks on links and buttons only. Input values are not autocaptured.
      element_allowlist: ['a', 'button', 'form', 'select', 'label'],
      capture_copied_text: false,
      capture_value_css_selector_allowlist: [],
    },
    before_send: (event) => {
      // Replay is disabled; drop any replay payload outright as defense in depth.
      if (event && isReplayEvent(event.event)) return null;
      return sanitizeCaptureResult(event);
    },
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
        text: true,
        search: true,
        tel: true,
        url: true,
        textarea: true,
        select: true,
        number: true,
      },
      // Only relevant if replay is ever re-enabled in code: mask every text node.
      maskTextSelector: '*',
      maskAttributeFn: (name, value) => maskReplayAttribute(name, value),
      maskCapturedNetworkRequestFn: (request) => sanitizeCapturedNetworkRequest(request),
    },
    loaded: (instance) => {
      instance.register({
        hub: TRUSTHUB_HUB,
        environment: analyticsEnvironment(),
      });
    },
  });
  return posthog;
}

const gate = createPosthogClientGate<PostHog>(loadPosthog);

export async function getPosthogBrowser(): Promise<PostHog | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (!shouldEnablePosthog()) return null;
    return await gate.get();
  } catch {
    return null;
  }
}
