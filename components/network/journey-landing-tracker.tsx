'use client';

import { useEffect } from 'react';
import { trackJourneyLanding } from '@/lib/analytics/journey-events';
import {
  hasJourneyContext,
  type JourneyContext,
} from '@/lib/network/journey-context';

export function JourneyLandingTracker({
  context,
  landedOn,
}: {
  context: JourneyContext;
  landedOn: string;
}) {
  useEffect(() => {
    if (!hasJourneyContext(context)) return;
    trackJourneyLanding({
      src: context.src,
      journey: context.journey,
      intent: context.intent,
      state: context.stateCode || context.stateSlug,
      county: context.county,
      landed_on: landedOn,
    });
  }, [context, landedOn]);

  return null;
}
