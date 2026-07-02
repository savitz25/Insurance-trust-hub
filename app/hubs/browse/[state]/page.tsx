import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { getHubsByState, getAllStateSlugs } from '@/lib/hubs/registry';
import { SITE_URL } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  if (!hubs.length) return { title: 'Browse Hubs' };
  const stateName = hubs[0].stateName;
  return {
    title: `Browse ${stateName} Insurance Hubs (2026)`,
    description: `Browse ${hubs.length} verified insurance market hubs in ${stateName}. Health insurance specialists for ACA, Medicare, and multi-line coverage.`,
    alternates: { canonical: `${SITE_URL}/hubs/browse/${state}` },
  };
}

export default async function BrowseStateHubsPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const hubs = getHubsByState(state);
  if (!hubs.length) notFound();
  const stateName = hubs[0].stateName;
  const sorted = [...hubs].sort((a, b) => a.priority - b.priority);

  return (
    <div className="container mx-auto px-4 py-12">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        {' / '}
        <Link href="/hubs/browse" className="hover:text-foreground">Browse Hubs</Link>
        {' / '}
        <span className="text-foreground">{stateName}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">{stateName} Insurance Hubs</h1>
      <p className="text-muted-foreground mb-10 max-w-2xl">
        {sorted.length} verified market{sorted.length !== 1 ? 's' : ''} in {stateName} with health
        insurance specialist listings. DOI verified — never sponsored.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((hub) => (
          <Link key={hub.slug} href={`/hubs/${state}/${hub.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-5">
                <div className="flex justify-between items-start gap-2">
                  <h2 className="font-semibold">{hub.shortName}</h2>
                  <Badge variant="outline" className="text-[10px]">Health</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{hub.msaName}</p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{hub.marketSnapshot}</p>
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