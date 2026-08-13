import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHubsByState, getAllStateSlugs } from '@/lib/hubs/registry';
import { SITE_URL } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Shield } from 'lucide-react';
import {
  countVerifiedFloridaProviders,
  countVerifiedOhioProviders,
  countVerifiedNorthCarolinaProviders,
  getLaunchCountyLiveTotals,
  getOhLaunchMarketLiveTotals,
  getNcLaunchMarketLiveTotals,
} from '@/lib/dfs/providers-by-county';
import { FL_DFS_LOOKUP_URL } from '@/lib/dfs/launch-counties';
import { OH_ODI_LOOKUP_URL } from '@/lib/odi/launch-markets';
import { NC_DOI_LOOKUP_URL } from '@/lib/nc/launch-markets';

/** Florida page reads live inventory totals */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  if (state === 'florida') {
    return {
      title: 'Florida Insurance Research Hubs | DFS-Verified Launch Counties',
      description:
        'Florida DFS–verified agency research for Miami-Dade, Broward, Palm Beach, Duval (Jacksonville), and Hillsborough (Tampa). Live inventory totals. Independent research — re-check licenses on official DFS tools.',
      alternates: { canonical: `${SITE_URL}/hubs/florida` },
    };
  }

  if (state === 'ohio') {
    return {
      title: 'Ohio Insurance Research Hubs | ODI-Verified Launch Markets',
      description:
        'Ohio Department of Insurance (ODI)–verified agency research for Columbus, Cleveland, Cincinnati, Toledo, Akron, and Dayton. Live inventory totals. Independent research — re-check licenses on official ODI tools.',
      alternates: { canonical: `${SITE_URL}/hubs/ohio` },
    };
  }

  if (state === 'north-carolina') {
    return {
      title: 'North Carolina Insurance Research Hubs | NC DOI-Verified Launch Markets',
      description:
        'North Carolina Department of Insurance (NC DOI)–verified agency research for Charlotte, the Research Triangle, Greensboro, and Wilmington. Live inventory totals when promoted. Independent research — re-check licenses on official NC DOI / SBS tools.',
      alternates: { canonical: `${SITE_URL}/hubs/north-carolina` },
    };
  }

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
  const isFlorida = state === 'florida';
  const isOhio = state === 'ohio';
  const isNorthCarolina = state === 'north-carolina';

  const launchRows = isFlorida ? await getLaunchCountyLiveTotals() : [];
  const ohLaunchRows = isOhio ? await getOhLaunchMarketLiveTotals() : [];
  const ncLaunchRows = isNorthCarolina ? await getNcLaunchMarketLiveTotals() : [];
  const flTotal = isFlorida ? await countVerifiedFloridaProviders() : 0;
  const ohTotal = isOhio ? await countVerifiedOhioProviders() : 0;
  const ncTotal = isNorthCarolina ? await countVerifiedNorthCarolinaProviders() : 0;
  const launchHubSlugs = new Set(launchRows.map((r) => r.hubSlug));
  const ohHubSlugs = new Set(ohLaunchRows.map((r) => r.hubSlug));
  const ncHubSlugs = new Set(ncLaunchRows.map((r) => r.hubSlug));

  // Launch inventory first; other hubs remain research context without inventing rows
  const otherHubs = isFlorida
    ? hubs.filter((h) => !launchHubSlugs.has(h.slug) && h.slug !== 'miami-fort-lauderdale')
    : isOhio
      ? hubs.filter((h) => !ohHubSlugs.has(h.slug))
      : isNorthCarolina
        ? hubs.filter((h) => !ncHubSlugs.has(h.slug))
        : hubs;

  return (
    <div className="container mx-auto px-4 py-12">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        {' / '}
        <Link href="/hubs" className="hover:text-foreground">
          Hubs
        </Link>
        {' / '}
        <span className="text-foreground">{stateName}</span>
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold">
        {isFlorida
          ? 'Florida insurance research hubs'
          : isOhio
            ? 'Ohio insurance research hubs'
            : isNorthCarolina
              ? 'North Carolina insurance research hubs'
              : `Insurance Hubs in ${stateName}`}
      </h1>
      <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
        {isFlorida ? (
          <>
            Live Florida DFS–verified inventory for launch counties. Totals below are exact match
            counts for public research listings — empty markets stay empty. Always re-check licenses
            on{' '}
            <a
              href={FL_DFS_LOOKUP_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Florida DFS
            </a>
            . Medicare specialty is never inferred from DFS alone.
          </>
        ) : isOhio ? (
          <>
            Live Ohio Department of Insurance (ODI)–verified inventory for Wave-1 launch markets.
            Totals below are exact match counts for public research listings — empty markets stay
            empty. Always re-check licenses on the{' '}
            <a
              href={OH_ODI_LOOKUP_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ohio ODI agent/agency locator
            </a>
            . Agency/business entities only. Medicare specialty is never inferred from ODI alone.
          </>
        ) : isNorthCarolina ? (
          <>
            Live North Carolina Department of Insurance (NC DOI)–verified inventory for Wave-1
            launch markets. Totals below are exact match counts for public research listings —
            empty markets stay empty until an official SBS agency export is promoted. Always
            re-check licenses on the{' '}
            <a
              href={NC_DOI_LOOKUP_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              NC DOI / SBS licensee lookup
            </a>
            . Agency/business entities only. Medicare specialty is never inferred from NC DOI
            alone.
          </>
        ) : (
          <>
            {hubs.length} market{hubs.length !== 1 ? 's' : ''} with research pathways. Verified
            agency listings appear only when they meet our public research standard.
          </>
        )}
      </p>

      {isOhio && (
        <section className="mt-8 rounded-2xl border border-trust/20 bg-trust/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-trust">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Launch inventory (live)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {ohTotal.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  verified OH research listings
                </span>
              </p>
            </div>
            <Link
              href="/directory?state=OH&verified=true"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Browse OH directory →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ohLaunchRows.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.hubHref}
                  className="flex h-full flex-col rounded-xl border bg-background p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{row.displayName}</h2>
                    <Badge variant="success">Market</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    {row.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">verified research listings</p>
                  <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Open hub →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Wave 1: Columbus / Franklin, Cleveland / Cuyahoga, Cincinnati / Hamilton, Toledo /
            Lucas, Akron / Summit, Dayton / Montgomery. Other Ohio counties stay empty until
            promote — we will not invent listings.
          </p>
        </section>
      )}

      {isNorthCarolina && (
        <section className="mt-8 rounded-2xl border border-trust/20 bg-trust/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-trust">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Launch inventory (live)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {ncTotal.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  verified NC research listings
                </span>
              </p>
            </div>
            <Link
              href="/directory?state=NC&verified=true"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Browse NC directory →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ncLaunchRows.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.hubHref}
                  className="flex h-full flex-col rounded-xl border bg-background p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{row.displayName}</h2>
                    <Badge variant="success">Market</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    {row.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">verified research listings</p>
                  <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Open hub →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Wave 1: Charlotte / Mecklenburg, Research Triangle (Wake, Durham, Orange), Greensboro /
            Guilford, Wilmington / New Hanover. Other North Carolina counties stay empty until
            promote — we will not invent listings. Soft research:{' '}
            <Link
              href="/guides/north-carolina-aca-marketplace"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              NC ACA guides
            </Link>
            .
          </p>
        </section>
      )}

      {isFlorida && (
        <section className="mt-8 rounded-2xl border border-trust/20 bg-trust/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-trust">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Launch inventory (live)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {flTotal.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  verified FL research listings
                </span>
              </p>
            </div>
            <Link
              href="/directory?state=FL"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Browse FL directory →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {launchRows.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.hubHref}
                  className="flex h-full flex-col rounded-xl border bg-background p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{row.displayName}</h2>
                    <Badge variant={row.kind === 'aggregate' ? 'outline' : 'success'}>
                      {row.kind === 'aggregate' ? 'Aggregate' : 'County'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    {row.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">verified research listings</p>
                  <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Open hub →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Wave 1: Miami-Dade, Broward, Palm Beach, Duval, Hillsborough. Wave 2: Orange, Osceola,
            Seminole (Orlando), Pinellas, Pasco (Tampa Bay). Other FL counties stay empty until
            promote — we will not invent listings.
          </p>
        </section>
      )}

      {!(isOhio && otherHubs.length === 0) ? (
      <>
      <div className="mt-10">
        <h2 className="text-lg font-semibold">
          {isFlorida
            ? 'Other Florida market hubs'
            : isOhio
              ? 'Other Ohio market hubs'
              : `All ${stateName} hubs`}
        </h2>
        {isFlorida ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Research context hubs. Verified agency cards appear only where DFS launch inventory
            exists.
          </p>
        ) : isOhio && otherHubs.length > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Research context hubs. Verified agency cards appear only where ODI launch inventory
            exists.
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(isFlorida || isOhio ? otherHubs : hubs).map((hub) => (
          <Link key={hub.slug} href={`/hubs/${state}/${hub.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <h2 className="font-semibold text-lg">{hub.shortName}</h2>
                  <Badge
                    variant={
                      hub.healthInsuranceDensity === 'very-high' ? 'success' : 'outline'
                    }
                  >
                    Health
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{hub.msaName}</p>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {hub.enrollmentHighlight}
                </p>
                <p className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                  <MapPin className="h-3 w-3" />
                  View market →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      </>
      ) : null}
    </div>
  );
}
