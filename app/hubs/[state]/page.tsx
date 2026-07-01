import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHubsByState, getAllStateSlugs } from '@/lib/hubs/registry';
import { SITE_URL } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllStateSlugs().map((state) => ({ state }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const hubs = getHubsByState(state);
  if (!hubs.length) return { title: 'Insurance Hubs' };
  const stateName = hubs[0].stateName;
  return {
    title: `Insurance Agents in ${stateName} (2026) | Health Insurance Hubs`,
    description: `Compare ${hubs.length} verified insurance market hubs in ${stateName}. Health insurance specialists for ACA, Medicare, and multi-line coverage.`,
    alternates: { canonical: `${SITE_URL}/hubs/${state}` },
  };
}

export default async function StateHubsPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const hubs = getHubsByState(state);
  if (!hubs.length) notFound();

  const stateName = hubs[0].stateName;

  return (
    <div className="container mx-auto px-4 py-12">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        {' / '}
        <Link href="/hubs" className="hover:text-foreground">Hubs</Link>
        {' / '}
        <span className="text-foreground">{stateName}</span>
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold">Insurance Hubs in {stateName}</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        {hubs.length} verified market{hubs.length !== 1 ? 's' : ''} with health insurance specialist
        listings. 100% data-driven from state DOI records and public reviews.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {hubs.map((hub) => (
          <Link key={hub.slug} href={`/hubs/${state}/${hub.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <h2 className="font-semibold text-lg">{hub.shortName}</h2>
                  <Badge variant={hub.healthInsuranceDensity === 'very-high' ? 'success' : 'outline'}>
                    Health
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{hub.msaName}</p>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{hub.enrollmentHighlight}</p>
                <p className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                  <MapPin className="h-3 w-3" />
                  View specialists →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}