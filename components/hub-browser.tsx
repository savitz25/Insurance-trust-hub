import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { INSURANCE_HUBS, getAllStateSlugs, getHubsByState } from '@/lib/hubs/registry';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HubBrowser() {
  const stateSlugs = getAllStateSlugs();

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8">
      <aside className="space-y-4">
        <div className="rounded-xl border bg-secondary/30 p-4">
          <h3 className="font-semibold text-sm mb-2">U.S. Hub Browser</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {INSURANCE_HUBS.length} verified market hubs across {stateSlugs.length} states. Select a
            state to explore MSAs with health insurance specialist listings.
          </p>
          <div className="mt-4 aspect-[4/3] rounded-lg bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center text-xs text-muted-foreground text-center p-4">
            Interactive U.S. map — click a state to filter hubs below. Integrate with us-atlas or
            Mapbox for production.
          </div>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Filter by state">
          {stateSlugs.map((slug) => {
            const count = getHubsByState(slug).length;
            const name = getHubsByState(slug)[0]?.stateName ?? slug;
            return (
              <Link
                key={slug}
                href={`/hubs/${slug}`}
                className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors"
              >
                {name} ({count})
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="grid sm:grid-cols-2 gap-4">
        {INSURANCE_HUBS.slice(0, 24).map((hub) => (
          <Link key={`${hub.stateSlug}-${hub.slug}`} href={`/hubs/${hub.stateSlug}/${hub.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{hub.shortName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{hub.msaName}</p>
                  </div>
                  <Badge
                    variant={hub.healthInsuranceDensity === 'very-high' ? 'success' : 'secondary'}
                    className="text-[10px] shrink-0"
                  >
                    {hub.healthInsuranceDensity === 'very-high' ? 'Health Dense' : 'Health Hub'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{hub.enrollmentHighlight}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                  <MapPin className="h-3 w-3" />
                  View health specialists →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}