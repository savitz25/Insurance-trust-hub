import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { HubAgent } from '@/types/agent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InsuranceVerificationBadge } from '@/components/verification-badge';
import { toPublicHubAgentView } from '@/lib/provenance/public-listing';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: HubAgent;
  rank?: number;
  hubLabel?: string;
  className?: string;
}

export function AgentCard({ agent, rank, hubLabel, className }: AgentCardProps) {
  const view = toPublicHubAgentView(agent);
  const locationLine = [agent.city, agent.state, agent.county ? `${agent.county} County` : undefined]
    .filter(Boolean)
    .join(' · ');

  const healthBadges = [
    ...agent.healthFocus.slice(0, 3),
    ...agent.insuranceTypes
      .filter((t) => !['health', 'medicare'].includes(t))
      .slice(0, 2)
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
  ];

  return (
    <article
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-trust transition-colors hover:border-primary/30 sm:p-6',
        className
      )}
      aria-label={`${agent.name} — insurance agency research${hubLabel ? ` in ${hubLabel}` : ''}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {rank != null && (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
              aria-hidden="true"
            >
              {rank}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight text-foreground">
              <Link href={`/providers/${agent.slug}`} className="hover:text-primary transition-colors">
                {agent.name}
              </Link>
              {agent.division && (
                <span className="block text-xs font-medium text-trust mt-0.5">{agent.division}</span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{locationLine}</p>
          </div>
        </div>
        <InsuranceVerificationBadge verification={view.verification} />
      </div>

      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{agent.shortDescription}</p>

      {view.showReviewHighlight && agent.reviewHighlight ? (
        <blockquote className="mb-4 border-l-2 border-trust/40 pl-3 text-xs italic text-muted-foreground leading-relaxed">
          {agent.reviewHighlight}
        </blockquote>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Specialties">
        {healthBadges.map((badge) => (
          <Badge
            key={badge}
            variant={badge.includes('Medicare') || badge.includes('ACA') ? 'secondary' : 'secondary'}
          >
            {badge}
          </Badge>
        ))}
      </div>

      <div className="mb-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="font-medium text-foreground">License:</span>{' '}
          {view.verification.licenseNumber ?? 'Not on file — re-check state DOI'}
        </div>
        {view.showTrustScore && view.trustScore != null ? (
          <div>
            <span className="font-medium text-foreground">Research Score:</span> {view.trustScore}/100
          </div>
        ) : (
          <div>
            <span className="font-medium text-foreground">Research Score:</span> Not published
          </div>
        )}
        {!view.showReviews ? (
          <div className="sm:col-span-2">
            No independently verified review summary available
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground max-w-xs">
          {view.verification.summary}
        </p>
        <div className="flex gap-2">
          {view.phone ? (
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${view.phone.replace(/\D/g, '')}`}>{view.phone}</a>
            </Button>
          ) : null}
          <Button size="sm" variant="trust" asChild>
            <Link href={`/tools/license-verification`}>Verify license</Link>
          </Button>
          <Link
            href={`/providers/${agent.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Research profile <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
