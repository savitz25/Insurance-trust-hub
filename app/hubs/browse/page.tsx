import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { INSURANCE_HUBS } from '@/lib/hubs/registry';
import { buildMetadata } from '@/lib/seo/metadata';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = buildMetadata({
  title: 'All Insurance Hubs — Complete Directory',
  description: `Browse all ${INSURANCE_HUBS.length} insurance market hubs with health insurance specialist listings.`,
  path: '/hubs/browse',
});

export default function AllHubsPage() {
  const sorted = [...INSURANCE_HUBS].sort((a, b) => a.priority - b.priority);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">All {sorted.length} Insurance Hubs</h1>
      <p className="text-muted-foreground mb-10 max-w-2xl">
        Every hub includes featured health insurance specialists, full agency directory, and local
        market guidance. We analyze public records and real reviews — never sponsored.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((hub) => (
          <Link key={`${hub.stateSlug}-${hub.slug}`} href={`/hubs/${hub.stateSlug}/${hub.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-5">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">#{hub.priority}</span>
                    <h2 className="font-semibold">{hub.shortName}</h2>
                    <p className="text-xs text-muted-foreground">{hub.stateName}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {(hub.population / 1_000_000).toFixed(1)}M pop
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{hub.marketSnapshot}</p>
                <p className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                  <MapPin className="h-3 w-3" />
                  Health specialists →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}