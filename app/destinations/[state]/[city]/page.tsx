import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, TrendingUp } from 'lucide-react';
import {
  DESTINATION_STATES,
  getDestinationCity,
} from '@/lib/destinations/data';
import { searchProviders } from '@/lib/providers/queries';
import { buildMetadata } from '@/lib/seo/metadata';
import { ProviderCard } from '@/components/provider-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CityPageProps {
  params: Promise<{ state: string; city: string }>;
}

export function generateStaticParams() {
  return DESTINATION_STATES.flatMap((state) =>
    state.cities.map((city) => ({
      state: state.slug,
      city: city.slug,
    }))
  );
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const data = getDestinationCity(stateSlug, citySlug);
  if (!data) return { title: 'City Not Found' };

  return buildMetadata({
    title: `${data.city.name}, ${data.state.code} Insurance — Local Agents & Premium Guide`,
    description: `Insurance guidance for ${data.city.name}, ${data.state.name}. Compare local agencies, average premiums, and coverage considerations.`,
    path: `/destinations/${stateSlug}/${citySlug}`,
  });
}

export default async function CityDestinationPage({ params }: CityPageProps) {
  const { state: stateSlug, city: citySlug } = await params;
  const data = getDestinationCity(stateSlug, citySlug);
  if (!data) notFound();

  const { state, city } = data;
  const { providers } = await searchProviders({
    state: state.code,
    city: city.name,
    limit: 9,
  });

  return (
    <div>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link href="/destinations" className="hover:text-foreground">Destinations</Link>
            {' / '}
            <Link href={`/destinations/${state.slug}`} className="hover:text-foreground">
              {state.name}
            </Link>
            {' / '}
            <span className="text-foreground">{city.name}</span>
          </nav>
          <h1 className="section-heading">
            {city.name}, {state.code} insurance guide
          </h1>
          {city.population && (
            <p className="mt-2 text-muted-foreground">Population: {city.population}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 space-y-12">
        <section className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" /> Local highlights
              </h2>
              <ul className="space-y-2">
                {city.highlights.map((h) => (
                  <li key={h} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-trust mt-1">•</span> {h}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {(city.avgAutoPremium || city.avgHomePremium) && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" /> Typical premium ranges
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Estimates only — actual rates vary by profile and carrier.
                </p>
                {city.avgAutoPremium && (
                  <p className="text-sm">
                    <span className="font-medium">Auto:</span> {city.avgAutoPremium}
                  </p>
                )}
                {city.avgHomePremium && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Homeowners:</span> {city.avgHomePremium}
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/tools/cost-estimator">Use cost estimator</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">State context</h2>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">{state.description}</p>
          <Button asChild variant="link" className="mt-2 px-0">
            <Link href={`/destinations/${state.slug}`}>Full {state.name} guide →</Link>
          </Button>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold">Agencies in {city.name}</h2>
            <Button asChild size="sm">
              <Link
                href={`/directory?state=${state.code}&q=${encodeURIComponent(city.name)}`}
              >
                View all
              </Link>
            </Button>
          </div>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agencies found for this city. Try the{' '}
              <Link href={`/directory?state=${state.code}`} className="text-primary hover:underline">
                {state.name} directory
              </Link>
              .
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}