/**
 * INTEL-006 / INS-HOME-002A — homepage intelligence events.
 * Additive. Does not rename journey_handoff_click or other Stage A events.
 */

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

export const INSURANCE_INTEL_EVENTS = [
  'insurance_intel_explore',
  'insurance_intel_trace_number',
  'insurance_intel_explain_chart',
  'insurance_intel_state_click',
  'insurance_intel_research_agency',
] as const;

export function trackInsuranceIntelEvent(
  eventName: (typeof INSURANCE_INTEL_EVENTS)[number],
  params: Record<string, string | number | boolean | undefined> = {}
): void {
  if (typeof window === 'undefined') return;
  const w = window as GtagWindow;
  try {
    w.gtag?.('event', eventName, {
      hub: 'insurance',
      page_path: window.location.pathname,
      ...params,
    });
  } catch {
    /* non-fatal */
  }
}
