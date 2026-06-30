import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, AlertCircle } from 'lucide-react';
import {
  getAllDestinationSlugs,
  getDestinationBySlug,
} from '@/lib/destinations/data';
import { searchProviders } from '@/lib/providers/queries';
import { buildMetadata } from '@/lib/seo/metadata';
import { ProviderCard } from '@/components/provider-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StatePageProps {
  params: Promise<{ state: string }>;
}

export function generateStaticParams() {
  return getAllDestinationSlugs().map((state) => ({ state }));
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { state: slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) return { title: 'Destination Not Found' };

  return buildMetadata({
    title: `${dest.name} Insurance Guide — Coverage, Costs & Local Agents`,
    description: dest.description,
    path: `/destinations/${slug}`,
  });
}

export default async function StateDestinationPage({ params }: StatePageProps) {
  const { state: slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  const { providers } = await searchProviders({
    state: dest.code,
    limit: 6,
    verifiedOnly: false,
  });

  return (
    <div>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <p className="text-xs font-semibold tracking-widest text-trust uppercase mb-2">
            Destination guide
          </p>
          <h1 className="section-heading">{dest.name} insurance landscape</h1>
          <p className="mt-2 text-lg text-trust font-medium">{dest.tagline}</p>
          <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">{dest.description}</p>
          <Button asChild className="mt-6">
            <Link href={`/directory?state=${dest.code}`}>
              Find agencies in {dest.name}
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 space-y-14">
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Key insurance considerations
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {dest.insuranceNotes.map((note) => (
              <li
                key={note}
                className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground leading-relaxed"
              >
                {note}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Moving to {dest.name}?</h2>
          <p className="text-muted-foreground leading-relaxed max-w-3xl mb-6">
            Plan coverage before your move-in date. Auto policies typically need updating within
            30–90 days of establishing residency. Homeowners and renters policies should align with
            your closing or lease start. An independent agent licensed in {dest.code} can compare
            carriers and explain state-specific requirements.
          </p>
          <div className="flex flex-wrap gap-2">
            {dest.relatedLinks.map((link) => (
              <Button key={link.href} variant="outline" size="sm" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold">Cities in {dest.name}</h2>
            <Link href="/destinations" className="text-sm text-primary hover:underline">
              All destinations
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dest.cities.map((city) => (
              <Link key={city.slug} href={`/destinations/${dest.slug}/${city.slug}`}>
                <Card className="h-full hover:shadow-trust-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{city.name}</h3>
                    </div>
                    {city.population && (
                      <p className="mt-1 text-xs text-muted-foreground">Pop. {city.population}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {city.highlights.slice(0, 2).map((h) => (
                        <span
                          key={h}
                          className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Local insurance agencies</h2>
          {providers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No agencies listed yet.{' '}
              <Link href="/directory" className="text-primary hover:underline">
                Browse the full directory
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