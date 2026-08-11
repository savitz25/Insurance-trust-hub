'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  hasJourneyContext,
  type JourneyContext,
  type JourneySrc,
} from '@/lib/network/journey-context';
import {
  loadResearchSession,
  mergeJourneyContext,
  saveResearchSession,
  sessionToJourneyContext,
} from '@/lib/network/research-session';
import { JourneyOrientationBanner } from '@/components/network/journey-orientation-banner';
import { ContinueTrustJourney } from '@/components/network/continue-trust-journey';
import { trackJourneyLanding } from '@/lib/analytics/journey-events';

type Props = {
  /** Context from URL + page geography (server) */
  urlContext: JourneyContext;
  preferSrc?: JourneySrc;
  currentHub?: JourneySrc;
  showOrientation?: boolean;
  showContinue?: boolean;
  continueTitle?: string;
  silent?: boolean;
  landedOn?: 'county' | 'state' | 'hub' | 'tool' | 'other' | 'destination-state' | 'destination-city';
  className?: string;
};

/**
 * Stage B.1 — bridge URL params ↔ origin-local research session.
 * URL wins; session fills gaps; richer URL/page context updates session.
 */
export function JourneySessionSync({
  urlContext,
  preferSrc = 'insurance',
  currentHub = 'insurance',
  showOrientation = false,
  showContinue = false,
  continueTitle,
  silent = false,
  landedOn,
  className,
}: Props) {
  const [merged, setMerged] = useState<JourneyContext>(urlContext);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sessionCtx = sessionToJourneyContext(loadResearchSession());
    const next = mergeJourneyContext(urlContext, sessionCtx);
    setMerged(next);
    setReady(true);

    if (hasJourneyContext(urlContext)) {
      saveResearchSession(next, { preferSrc: urlContext.src ?? preferSrc });
    }

    if (landedOn && hasJourneyContext(next)) {
      trackJourneyLanding({
        src: next.src,
        journey: next.journey,
        intent: next.intent,
        state: next.stateCode || next.stateSlug,
        county: next.county,
        landed_on: landedOn,
      });
    }
  }, [urlContext, preferSrc, landedOn]);

  const continueCtx = useMemo(
    () => ({
      ...merged,
      src: merged.src ?? preferSrc,
      journey: merged.journey ?? 'coverage',
    }),
    [merged, preferSrc]
  );

  if (silent || (!showOrientation && !showContinue)) return null;
  if (!ready || !hasJourneyContext(merged)) return null;

  return (
    <div className={className}>
      {showOrientation ? <JourneyOrientationBanner context={merged} /> : null}
      {showContinue ? (
        <div className={showOrientation ? 'mt-6' : undefined}>
          <ContinueTrustJourney
            currentHub={currentHub}
            context={continueCtx}
            title={continueTitle}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Soft client redirect on destinations hub when session has state but URL does not.
 */
export function ResearchSessionHubRedirect({
  hasUrlState,
}: {
  hasUrlState: boolean;
}) {
  useEffect(() => {
    if (hasUrlState) return;
    const session = loadResearchSession();
    if (!session?.state) return;
    const st = sessionToJourneyContext(session);
    if (!st.stateSlug) return;
    const base = `/destinations/${st.stateSlug}`;
    const q = new URLSearchParams();
    if (session.src) q.set('src', session.src);
    if (session.journey) q.set('journey', session.journey);
    if (session.state) q.set('state', session.state);
    if (session.county) q.set('county', session.county);
    if (session.intent && session.intent !== 'unknown') q.set('intent', session.intent);
    if (session.housing && session.housing !== 'unknown') q.set('housing', session.housing);
    const qs = q.toString();
    window.location.replace(qs ? `${base}?${qs}` : base);
  }, [hasUrlState]);

  return null;
}
