import { ExternalLink } from 'lucide-react';
import type { PublicSecondarySignals } from '@/lib/enrichment/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Phase 6B2 — secondary consumer signals only (Google/BBB snapshots).
 * Never presented as ITH first-party reviews or DOI verification.
 */
export function ProviderSecondarySignals({
  signals,
}: {
  signals: PublicSecondarySignals;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Secondary consumer signals</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-muted-foreground">
            Research context only
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {signals.google ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-3">
              <p className="font-medium text-foreground">
                Google rating snapshot
                {signals.google.checkedAtLabel
                  ? ` as of ${signals.google.checkedAtLabel}`
                  : ''}
              </p>
              <p className="mt-1 text-muted-foreground">
                {signals.google.rating != null
                  ? `${signals.google.rating.toFixed(1)} · ${signals.google.reviewCount ?? 0} Google reviews`
                  : 'Rating not available'}
                {signals.google.businessStatus
                  ? ` · Status: ${signals.google.businessStatus}`
                  : ''}
              </p>
              {signals.google.mapsUrl ? (
                <a
                  href={signals.google.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View on Google Maps
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}

          {signals.bbb ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-3">
              <p className="font-medium text-foreground">
                BBB profile signal
                {signals.bbb.checkedAtLabel ? ` as of ${signals.bbb.checkedAtLabel}` : ''}
              </p>
              <p className="mt-1 text-muted-foreground">
                {signals.bbb.rating ? `Grade ${signals.bbb.rating}` : 'Grade not listed'}
                {signals.bbb.accredited ? ' · Accredited' : ''}
              </p>
              {signals.bbb.profileUrl ? (
                <a
                  href={signals.bbb.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open BBB profile
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3">
            {signals.disclaimer}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
