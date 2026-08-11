/**
 * Stage A′ journey measurement (Insurance). Soft fail if gtag absent.
 */

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

export function trackJourneyHandoff(params: {
  from_hub: string;
  to_hub: string;
  priority?: string;
  journey?: string;
  intent?: string;
  state?: string;
  county?: string;
}): void {
  if (typeof window === 'undefined') return;
  const w = window as GtagWindow;
  const payload = {
    hub: 'insurance',
    from_hub: params.from_hub,
    to_hub: params.to_hub,
    handoff_priority: params.priority ?? 'primary',
    journey: params.journey ?? '',
    intent: params.intent ?? '',
    state: params.state ?? '',
    county: params.county ?? '',
    source_path: window.location.pathname,
  };
  try {
    w.gtag?.('event', 'journey_handoff_click', payload);
    w.gtag?.('event', 'cross_hub_continuation', {
      hub: 'insurance',
      from_hub: params.from_hub,
      to_hub: params.to_hub,
      landing_style: 'contextual',
    });
  } catch {
    /* non-fatal */
  }
}

export function trackJourneyLanding(params: {
  src?: string;
  journey?: string;
  intent?: string;
  state?: string;
  county?: string;
  landed_on: string;
}): void {
  if (typeof window === 'undefined') return;
  const w = window as GtagWindow;
  try {
    w.gtag?.('event', 'journey_context_landing', {
      hub: 'insurance',
      src_hub: params.src ?? '',
      journey: params.journey ?? '',
      intent: params.intent ?? '',
      state: params.state ?? '',
      county: params.county ?? '',
      landed_on: params.landed_on,
    });
  } catch {
    /* non-fatal */
  }
}
