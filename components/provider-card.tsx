import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Provider } from '@/types/provider';
import { INSURANCE_TYPES } from '@/lib/constants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/star-rating';
import { SaveProviderButton } from '@/components/my-insurance/save-provider-button';
import { InsuranceVerificationBadge } from '@/components/verification-badge';
import { toPublicProviderView } from '@/lib/provenance/public-listing';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { cn } from '@/lib/utils';

interface ProviderCardProps {
  provider: Provider;
  className?: string;
}

export function ProviderCard({ provider, className }: ProviderCardProps) {
  // Phase 1: only verified TrustState may render on consumer surfaces
  if (!canShowAsVerified(resolveProviderTrustState(provider))) {
    return null;
  }
  const view = toPublicProviderView(provider);
  const typeLabels = provider.insurance_types
    .slice(0, 3)
    .map((t) => INSURANCE_TYPES.find((it) => it.value === t)?.label ?? t);

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
            <p className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {provider.city}, {provider.state}
            </p>
          </div>
          <InsuranceVerificationBadge verification={view.verification} className="shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {provider.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {provider.short_description}
          </p>
        )}

        {view.showReviews && view.rating != null ? (
          <>
            <StarRating rating={view.rating} size="sm" />
            <p className="text-xs text-muted-foreground">
              {view.reviewCount} review{view.reviewCount !== 1 ? 's' : ''}
              {view.yearsInBusiness
                ? ` · ${view.yearsInBusiness} years in business`
                : ''}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            No independently verified review summary available
            {view.yearsInBusiness ? ` · ${view.yearsInBusiness} years in business` : ''}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {typeLabels.map((label) => (
            <Badge key={label} variant="secondary" className="text-[11px] font-medium">
              {label}
            </Badge>
          ))}
        </div>

        {provider.specialties.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {provider.specialties.slice(0, 2).join(' · ')}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <SaveProviderButton
          providerSlug={provider.slug}
          providerName={provider.name}
          className="text-xs"
        />
        <Link
          href={`/providers/${provider.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Research →
        </Link>
      </CardFooter>
    </Card>
  );
}
