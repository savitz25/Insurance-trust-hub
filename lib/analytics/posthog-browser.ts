'use client';

import type { PostHog } from 'posthog-js';
import { analyticsEnvironment, posthogHost, posthogKey, shouldEnablePosthog } from './environment';
import { createPosthogClientGate } from './posthog-gate';
import { maskReplayAttribute, sanitizeCapturedNetworkRequest, sanitizeCaptureResult } from './privacy';
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
    autocapture: {
      // Clicks on links and buttons only. Input values are not autocaptured.
      element_allowlist: ['a', 'button', 'form', 'select', 'label'],
      capture_copied_text: false,
      capture_value_css_selector_allowlist: [],
    },
    before_send: (event) => sanitizeCaptureResult(event),
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
      },
      maskTextSelector: 'input, textarea, [contenteditable], [data-ph-mask], .ph-mask',
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
