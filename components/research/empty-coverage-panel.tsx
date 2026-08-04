import type { ReactNode } from 'react';
import Link from 'next/link';
import { MapPin, ExternalLink } from 'lucide-react';
import { TrustMark } from '@/components/network/trust-mark';
import { cn } from '@/lib/utils';

export type EmptyCoverageLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type EmptyCoveragePanelProps = {
  variant: 'unmapped' | 'filtered';
  title: string;
  description: string;
  placeLabel?: string;
  primarySources: EmptyCoverageLink[];
  widenLinks: EmptyCoverageLink[];
  journeyLink?: EmptyCoverageLink;
  className?: string;
  children?: ReactNode;
};

export function EmptyCoveragePanel({
  variant,
  title,
  description,
  placeLabel,
  primarySources,
  widenLinks,
  journeyLink,
  className,
  children,
}: EmptyCoveragePanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center sm:px-8 sm:py-10',
        className
      )}
      role="status"
    >
      <MapPin className="mx-auto h-9 w-9 text-muted-foreground/70" aria-hidden />
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {placeLabel ? (
        <p className="mt-1 text-sm font-medium text-foreground/80">{placeLabel}</p>
      ) : null}
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {variant === 'unmapped' ? (
        <p className="mx-auto mt-2 max-w-lg text-xs text-muted-foreground">
          Coverage is expanding. We do not invent agencies to fill empty markets.
        </p>
      ) : null}

      {primarySources.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Verify on primary sources
          </p>
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {primarySources.map((link) => (
              <li key={link.href + link.label}>
                <a
                  href={link.href}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-semibold hover:bg-muted/40"
                  {...(link.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {link.label}
                  {link.external ? (
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {widenLinks.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Research tools &amp; widen search
          </p>
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            {widenLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {journeyLink ? (
        <p className="mt-5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Next in your journey: </span>
          <a
            href={journeyLink.href}
            className="font-semibold text-primary underline-offset-2 hover:underline"
            {...(journeyLink.external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {journeyLink.label}
          </a>
        </p>
      ) : null}

      {children}

      <p className="mt-6 text-xs text-muted-foreground">
        Research only · Not an endorsement · Part of the Ask Trust Hub network
      </p>
      <div className="mt-2 flex justify-center">
        <TrustMark />
      </div>
    </div>
  );
}

export const NAIC_CONSUMER_URL = 'https://content.naic.org/consumer';
/** Hub methodology documents DOI pathways; tools/license-verification is in-product. */
export const DOI_PATHWAY_HREF = '/tools/license-verification';
