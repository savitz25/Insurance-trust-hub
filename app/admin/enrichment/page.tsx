import type { Metadata } from 'next';
import Link from 'next/link';
import { listEnrichmentEligible } from '@/lib/enrichment/pipeline';
import { isGooglePlacesConfigured } from '@/lib/enrichment/google-places';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { EnrichmentForm } from '@/components/admin/enrichment-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Secondary enrichment ops',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EnrichmentAdminPage() {
  const configured = isSupabaseAdminConfigured();
  const places = isGooglePlacesConfigured();
  let eligible: Awaited<ReturnType<typeof listEnrichmentEligible>> = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      eligible = await listEnrichmentEligible(60);
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load eligible profiles';
    }
  }

  const withGoogle = eligible.filter((p) => p.enrichment?.google?.matchConfidence === 'high').length;
  const withBbb = eligible.filter((p) => p.enrichment?.bbb).length;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Google + BBB enrichment</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Phase 6B2 — enrich only <strong>indexable_research</strong> agencies. Google/BBB are
          secondary snapshots and never grant a state license verified badge. Weak or ambiguous
          matches are skipped.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eligible (indexable)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{eligible.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Google snap
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{withGoogle}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With BBB snap</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{withBbb}</CardContent>
        </Card>
      </div>

      <div className="rounded-lg border px-4 py-3 text-sm space-y-1">
        <p>
          Supabase admin:{' '}
          <Badge variant={configured ? 'success' : 'outline'}>
            {configured ? 'configured' : 'offline'}
          </Badge>
        </p>
        <p>
          Google Places API:{' '}
          <Badge variant={places ? 'success' : 'outline'}>
            {places ? 'GOOGLE_PLACES_API_KEY set' : 'not set — Google fetch skipped'}
          </Badge>
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Eligible queue</h2>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No indexable_research profiles found. Complete Phase 6B1 license promotions first.
          </p>
        ) : (
          <ul className="space-y-6">
            {eligible.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold">
                      <Link
                        href={`/admin/providers/${p.id}/edit`}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.city}, {p.state} · license {p.license_number} ·{' '}
                      <Link href={`/providers/${p.slug}`} className="underline">
                        public
                      </Link>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {p.enrichment?.google ? (
                      <Badge variant="secondary">Google</Badge>
                    ) : (
                      <Badge variant="outline">No Google</Badge>
                    )}
                    {p.enrichment?.bbb ? (
                      <Badge variant="secondary">BBB</Badge>
                    ) : (
                      <Badge variant="outline">No BBB</Badge>
                    )}
                  </div>
                </div>
                <EnrichmentForm providerId={p.id} providerName={p.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
