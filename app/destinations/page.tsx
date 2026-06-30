import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, ArrowRight } from 'lucide-react';
import { DESTINATION_STATES } from '@/lib/destinations/data';
import { buildMetadata } from '@/lib/seo/metadata';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance by Destination — State & City Guides for Movers',
  description:
    'Explore insurance landscapes, moving guidance, and local agency directories for popular U.S. destinations.',
  path: '/destinations',
});

export default function DestinationsPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-12">
        <h1 className="section-heading">Insurance destinations</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Moving to a new state? Each destination guide covers local insurance risks, average
          premiums, and licensed agencies serving the area. Educational content only — always
          verify rates with licensed agents.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {DESTINATION_STATES.map((state) => (
          <Link key={state.slug} href={`/destinations/${state.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{state.name}</h2>
                      <span className="text-xs font-medium text-muted-foreground">{state.code}</span>
                    </div>
                    <p className="mt-1 text-sm text-trust font-medium">{state.tagline}</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {state.description}
                    </p>
                    <p className="mt-3 text-xs text-primary font-medium">
                      {state.cities.length} city guides available
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/directory">
            Browse all agencies <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}