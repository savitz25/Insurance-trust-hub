import { ArrowUpRight } from 'lucide-react';
import {
  resolveLifeJourney,
  type LifeJourneyContext,
  type LifeJourneyGeography,
} from '@/lib/network/life-journey';
import { TrustMark } from '@/components/network/trust-mark';
import { cn } from '@/lib/utils';

export type NetworkHandoffProps = {
  context: LifeJourneyContext;
  geography?: LifeJourneyGeography;
  variant?: 'card' | 'inline' | 'compact';
  className?: string;
};

/**
 * LifeJourneyNext / NetworkJourneyStrip — contextual only.
 * Max 2 outbound absolute production URLs.
 */
export function NetworkHandoff({
  context,
  geography,
  variant = 'card',
  className,
}: NetworkHandoffProps) {
  const content = resolveLifeJourney(context, geography);
  const links = content.links.slice(0, 2);
  if (links.length === 0) return null;

  if (variant === 'inline' || variant === 'compact') {
    return (
      <aside
        className={cn(
          'rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm',
          className
        )}
        aria-label={content.label}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {content.label}
        </p>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{content.body}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-2 hover:underline"
              rel="noopener noreferrer"
            >
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </a>
          ))}
        </p>
        <div className="mt-2">
          <TrustMark variant="text" />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'rounded-xl border border-border/70 bg-card px-5 py-5 sm:px-6',
        className
      )}
      aria-label={content.label}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {content.label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
        {content.body}
      </p>
      <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-muted/40 sm:w-auto"
              rel="noopener noreferrer"
            >
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <TrustMark />
      </div>
    </aside>
  );
}
