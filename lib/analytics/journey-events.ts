/**
 * Stage A′ journey measurement (Insurance).
 */
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';
import { stateCode } from '@/lib/analytics/privacy';

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
  try {
    captureTrustEvent(
      TRUSTHUB_EVENTS.SPECIALIST_HANDOFF_STARTED,
      {
        surface: 'network_handoff',
        specialist_hub: params.to_hub,
        state: stateCode(params.state),
        success: true,
      },
      { sendBeforeUnload: true },
    );
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
  void params;
}
