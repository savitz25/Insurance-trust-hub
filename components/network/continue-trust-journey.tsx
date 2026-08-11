'use client';

import { ArrowUpRight } from 'lucide-react';
import {
  resolveSituationSteps,
  type JourneyContext,
  type JourneySrc,
} from '@/lib/network/journey-context';
import { trackJourneyHandoff } from '@/lib/analytics/journey-events';
import { cn } from '@/lib/utils';

type Props = {
  currentHub: JourneySrc;
  context: JourneyContext;
  className?: string;
  title?: string;
};

export function ContinueTrustJourney({
  currentHub,
  context,
  className,
  title = 'Continue your Trust journey',
}: Props) {
  const steps = resolveSituationSteps(context, currentHub);
  if (steps.length === 0) return null;

  return (
    <aside
      className={cn(
        'rounded-2xl border bg-gradient-to-br from-slate-50 via-background to-sky-50/40 p-5 shadow-sm sm:p-6',
        className
      )}
      aria-labelledby="continue-journey-heading"
      data-journey-handoff="continue"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ask Trust Hub network
      </p>
      <h2 id="continue-journey-heading" className="mt-1 text-lg font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Specialist research on another Trust Hub — context is preserved. No account required.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.href + step.cta}>
            <a
              href={step.href}
              className={cn(
                'group flex h-full flex-col rounded-xl border px-4 py-3.5 transition-colors',
                step.priority === 'primary'
                  ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                  : 'border-border bg-card hover:border-primary/30'
              )}
              rel="noopener noreferrer"
              data-journey-hub={step.hub}
              data-journey-priority={step.priority}
              onClick={() =>
                trackJourneyHandoff({
                  from_hub: currentHub,
                  to_hub: step.hub,
                  priority: step.priority,
                  journey: context.journey,
                  intent: context.intent,
                  state: context.stateCode || context.stateSlug,
                  county: context.county,
                })
              }
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {step.priority === 'primary' ? 'Next step' : 'Also useful'}
              </span>
              <span className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary">
                {step.title}
              </span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {step.cta}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
