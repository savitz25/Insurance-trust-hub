import Link from 'next/link';
import { MapPin, Phone, FileBadge, Globe, Building2 } from 'lucide-react';
import type { Provider } from '@/types/provider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/star-rating';
import { SaveProviderButtonLazy } from '@/components/my-insurance/save-provider-button-lazy';
import { InsuranceVerificationBadge } from '@/components/verification-badge';
import { toPublicProviderView } from '@/lib/provenance/public-listing';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { loaSpecialtyTags } from '@/lib/dfs/loa';
import { extractDbaFromName } from '@/lib/dfs/agency-display';
import { cn } from '@/lib/utils';

interface ProviderCardProps {
  provider: Provider;
  className?: string;
}

/**
 * Phase 5/7 agency research card — name, license, LOA tags, city/county,
 * phone if present, verified badge. Website/rating secondary only.
 * Never feature email. Never rank by Google rating or appointments.
 */
export function ProviderCard({ provider, className }: ProviderCardProps) {
  if (!canShowAsVerified(resolveProviderTrustState(provider))) {
    return null;
  }
  const view = toPublicProviderView(provider);
  const loaTags = loaSpecialtyTags(provider.specialties);
  const { dba } = extractDbaFromName(provider.name);
  const locationLine = [
    provider.city,
    provider.county ? `${provider.county} County` : null,
    provider.state,
  ]
    .filter(Boolean)
    .join(', ');
  const hasAppts =
    Boolean(provider.appointment_snapshot?.totalCount) &&
    (provider.appointment_snapshot?.totalCount ?? 0) > 0;

  return (
    <Card className={cn('provider-card flex flex-col h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg leading-snug">
              <Link
                href={`/providers/${provider.slug}`}
                className="hover:text-primary transition-colors"
              >
                {provider.name}
              </Link>
            </CardTitle>
            {dba ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Also known as / DBA:{' '}
                <span className="font-medium text-foreground/90">{dba}</span>
              </p>
            ) : null}
            <p className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {locationLine}
            </p>
          </div>
          <InsuranceVerificationBadge verification={view.verification} className="shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Research listing
        </p>
        {view.verification.licenseNumber ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileBadge className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              License{' '}
              <span className="font-medium text-foreground tabular-nums">
                {view.verification.licenseNumber}
              </span>
              {view.verification.licenseState
                ? ` · ${view.verification.licenseState}`
                : ''}
            </span>
          </p>
        ) : null}

        {view.verification.sourceLabel || view.verification.lastCheckedLabel ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {view.verification.sourceLabel ?? 'State regulator'}
            {view.verification.lastCheckedLabel
              ? ` · checked ${view.verification.lastCheckedLabel}`
              : ''}
          </p>
        ) : null}

        {loaTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {loaTags.map((label) => (
              <Badge key={label} variant="secondary" className="text-[11px] font-medium">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}

        {hasAppts ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            DFS appointment snapshot on profile
            <span className="opacity-70">(regulatory, not a rank)</span>
          </p>
        ) : null}

        {view.phone ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <a
              href={`tel:${view.phone.replace(/\D/g, '')}`}
              className="hover:text-primary hover:underline"
            >
              {view.phone}
            </a>
          </p>
        ) : null}

        {provider.website?.trim() ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline truncate"
            >
              Website on file
            </a>
            <span className="opacity-70">· secondary signal</span>
          </p>
        ) : null}

        {view.showReviews && view.rating != null ? (
          <div className="pt-0.5 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Third-party public rating
            </p>
            <StarRating rating={view.rating} size="sm" />
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {view.reviewCount} review{view.reviewCount !== 1 ? 's' : ''} · not an ITH ranking
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Research listing — re-check license status on official tools before you enroll.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <SaveProviderButtonLazy
          providerSlug={provider.slug}
          providerName={provider.name}
          city={provider.city}
          state={provider.state}
          licenseSummary={
            view.verification.licenseNumber
              ? `License ${view.verification.licenseNumber}`
              : undefined
          }
          lines={loaTags}
          defaultStatus="researching"
          compact
          className="min-h-11"
        />
        <Link
          href={`/providers/${provider.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Research profile →
        </Link>
      </CardFooter>
    </Card>
  );
}
