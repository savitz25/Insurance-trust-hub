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
  countVerifiedNevadaProviders,
  getNvLaunchMarketLiveTotals,
  countVerifiedVermontProviders,
  getVtLaunchMarketLiveTotals,
  countVerifiedMassachusettsProviders,
  getMaLaunchMarketLiveTotals,
} from '@/lib/dfs/providers-by-county';
import { FL_DFS_LOOKUP_URL } from '@/lib/dfs/launch-counties';
import { OH_ODI_LOOKUP_URL } from '@/lib/odi/launch-markets';
import { NC_DOI_LOOKUP_URL } from '@/lib/nc/launch-markets';
import { NV_DOI_LOOKUP_URL } from '@/lib/nv/launch-markets';
import { VT_DFR_LOOKUP_URL } from '@/lib/vt/launch-markets';
import { MA_DOI_LOOKUP_URL } from '@/lib/ma/launch-markets';

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

  if (state === 'vermont') {
    return {
      title: 'Vermont Insurance Research Hubs | VT DFR-Verified Launch Markets',
      description:
        'Vermont Department of Financial Regulation (VT DFR)–verified agency research for Burlington, Montpelier, and Rutland. Small, honest firm inventory. Independent research — re-check licenses on official VT DFR / SBS tools.',
      alternates: { canonical: `${SITE_URL}/hubs/vermont` },
    };
  }

  if (state === 'massachusetts') {
    return {
      title: 'Massachusetts Insurance Research Hubs | MA DOI-Verified Launch Markets',
      description:
        'Massachusetts Division of Insurance (MA DOI)–verified agency research for Boston, Worcester, and Springfield. Agencies only — not licensed companies or carriers. Independent research — re-check licenses on official MA DOI / SBS tools.',
      alternates: { canonical: `${SITE_URL}/hubs/massachusetts` },
    };
  }

  if (state === 'nevada') {
    return {
      title: 'Nevada Insurance Research Hubs | NV DOI-Verified Launch Markets',
      description:
        'Nevada Division of Insurance (NV DOI)–verified firm research for Las Vegas, Reno, and Carson City. Live inventory totals when promoted. Independent research — re-check licenses on official NV DOI / SBS tools.',
      alternates: { canonical: `${SITE_URL}/hubs/nevada` },
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
  const isNevada = state === 'nevada';
  const isVermont = state === 'vermont';
  const isMassachusetts = state === 'massachusetts';

  const launchRows = isFlorida ? await getLaunchCountyLiveTotals() : [];
  const ohLaunchRows = isOhio ? await getOhLaunchMarketLiveTotals() : [];
  const ncLaunchRows = isNorthCarolina ? await getNcLaunchMarketLiveTotals() : [];
  const nvLaunchRows = isNevada ? await getNvLaunchMarketLiveTotals() : [];
  const vtLaunchRows = isVermont ? await getVtLaunchMarketLiveTotals() : [];
  const maLaunchRows = isMassachusetts ? await getMaLaunchMarketLiveTotals() : [];
  const flTotal = isFlorida ? await countVerifiedFloridaProviders() : 0;
  const ohTotal = isOhio ? await countVerifiedOhioProviders() : 0;
  const ncTotal = isNorthCarolina ? await countVerifiedNorthCarolinaProviders() : 0;
  const nvTotal = isNevada ? await countVerifiedNevadaProviders() : 0;
  const vtTotal = isVermont ? await countVerifiedVermontProviders() : 0;
  const maTotal = isMassachusetts ? await countVerifiedMassachusettsProviders() : 0;
  const launchHubSlugs = new Set(launchRows.map((r) => r.hubSlug));
  const ohHubSlugs = new Set(ohLaunchRows.map((r) => r.hubSlug));
  const ncHubSlugs = new Set(ncLaunchRows.map((r) => r.hubSlug));
  const nvHubSlugs = new Set(nvLaunchRows.map((r) => r.hubSlug));
  const vtHubSlugs = new Set(vtLaunchRows.map((r) => r.hubSlug));
  const maHubSlugs = new Set(maLaunchRows.map((r) => r.hubSlug));

  // Launch inventory first; other hubs remain research context without inventing rows
  const otherHubs = isFlorida
    ? hubs.filter((h) => !launchHubSlugs.has(h.slug) && h.slug !== 'miami-fort-lauderdale')
    : isOhio
      ? hubs.filter((h) => !ohHubSlugs.has(h.slug))
      : isNorthCarolina
        ? hubs.filter((h) => !ncHubSlugs.has(h.slug))
        : isNevada
          ? hubs.filter((h) => !nvHubSlugs.has(h.slug))
          : isVermont
            ? hubs.filter((h) => !vtHubSlugs.has(h.slug))
            : isMassachusetts
              ? hubs.filter((h) => !maHubSlugs.has(h.slug))
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
              : isNevada
                ? 'Nevada insurance research hubs'
                : isVermont
                  ? 'Vermont insurance research hubs'
                  : isMassachusetts
                    ? 'Massachusetts insurance research hubs'
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
        ) : isNevada ? (
          <>
            Live Nevada Division of Insurance (NV DOI)–verified inventory for Wave-1 launch
            markets. Totals below are exact match counts for public research listings — empty
            markets stay empty. Always re-check licenses on the{' '}
            <a
              href={NV_DOI_LOOKUP_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              NV DOI / SBS licensee lookup
            </a>
            . Nevada-addressed producer/agency firms only. Medicare specialty is never inferred
            from NV DOI firm type alone.
          </>
        ) : isVermont ? (
          <>
            Live Vermont Department of Financial Regulation (VT DFR)–verified inventory for Wave-1
            launch markets. This is a small firm inventory — empty markets stay empty. Always
            re-check licenses on the{' '}
            <a
              href={VT_DFR_LOOKUP_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              VT DFR / SBS licensee lookup
            </a>
            . Agencies/firms only. Medicare specialty is never inferred from VT DFR alone.
          </>
        ) : isMassachusetts ? (
          <>
            Live Massachusetts Division of Insurance (MA DOI)–verified inventory for Wave-1
            launch markets. Agencies and business entities only — licensed companies and
            carriers are not listed as agencies. Empty markets stay empty. Always re-check
            licenses on the{' '}
            <a
              href={MA_DOI_LOOKUP_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              MA DOI / SBS licensee lookup
            </a>
            . Medicare specialty is never inferred from MA DOI alone.
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

      {isNevada && (
        <section className="mt-8 rounded-2xl border border-trust/20 bg-trust/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-trust">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Launch inventory (live)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {nvTotal.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  verified NV research listings
                </span>
              </p>
            </div>
            <Link
              href="/directory?state=NV&verified=true"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Browse NV directory →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nvLaunchRows.map((row) => (
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
            Wave 1: Las Vegas / Clark (includes Henderson), Reno / Washoe, Carson City.
            Nevada-addressed producer and agency firms only — out-of-state headquarters stay in
            staging. We will not invent listings.
          </p>
        </section>
      )}

      {isVermont && (
        <section className="mt-8 rounded-2xl border border-trust/20 bg-trust/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-trust">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Launch inventory (live)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {vtTotal.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  verified VT research listings
                </span>
              </p>
            </div>
            <Link
              href="/directory?state=VT&verified=true"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Browse VT directory →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vtLaunchRows.map((row) => (
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
            Wave 1: Burlington / Chittenden, Montpelier / Washington County, Rutland / southern
            Vermont. Vermont-addressed agencies and firms only — out-of-state headquarters stay
            off city hubs. This is a small inventory. We will not invent listings.
          </p>
        </section>
      )}

      {isMassachusetts && (
        <section className="mt-8 rounded-2xl border border-trust/20 bg-trust/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-trust">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Launch inventory (live)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {maTotal.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  verified MA research listings
                </span>
              </p>
            </div>
            <Link
              href="/directory?state=MA&verified=true"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Browse MA directory →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {maLaunchRows.map((row) => (
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
            Wave 1: Greater Boston / Suffolk, Worcester, Springfield / Hampden. Massachusetts
            agencies and business entities only — licensed companies, carriers, and reinsurers
            are not promoted as agencies. Out-of-state headquarters stay off city hubs. Empty
            markets stay empty until official agency lists are imported. We will not invent
            listings.
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
