import Link from 'next/link';
import { Star, ShieldCheck, ExternalLink, Clock } from 'lucide-react';
import type { HubAgent } from '@/types/agent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: HubAgent;
  rank?: number;
  hubLabel?: string;
  className?: string;
}

export function AgentCard({ agent, rank, hubLabel, className }: AgentCardProps) {
  const locationLine = [agent.city, agent.state, hubLabel ? `Serves ${hubLabel}` : undefined]
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
      aria-label={`${agent.name} — insurance agent${hubLabel ? ` in ${hubLabel}` : ''}`}
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
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-700">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          {agent.rating.toFixed(1)}
          <span className="text-xs font-normal text-muted-foreground">
            ({agent.reviewCount.toLocaleString()} reviews)
          </span>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{agent.shortDescription}</p>

      <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Specialties">
        {healthBadges.map((badge) => (
          <Badge key={badge} variant={badge.includes('Medicare') || badge.includes('ACA') ? 'success' : 'secondary'}>
            {badge}
          </Badge>
        ))}
        {agent.isMedicareFeatured && (
          <Badge variant="success">Featured Medicare/ACA</Badge>
        )}
        {agent.isDiversePopulations && (
          <Badge variant="outline">Diverse Populations</Badge>
        )}
      </div>

      <div className="mb-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="font-medium text-foreground">License:</span> {agent.licenseNumber}
        </div>
        <div>
          <span className="font-medium text-foreground">Trust Score:</span> {agent.trustScore}/100
        </div>
        <div>
          <span className="font-medium text-foreground">Local Market Experience:</span>{' '}
          {agent.localMarketExperience}/100
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span className="font-medium text-foreground">Avg Response:</span> &lt;{agent.avgResponseHours}h
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {agent.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-trust/10 px-2 py-0.5 text-xs font-medium text-trust">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              DOI Verified
            </span>
          )}
          <span className="text-xs text-muted-foreground">NAIC Verified · BBB {agent.bbbRating}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="trust" asChild>
            <Link href={`/providers/${agent.slug}#quote`}>Get Free Health Quote</Link>
          </Button>
          <Link
            href={`/providers/${agent.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View Profile <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}