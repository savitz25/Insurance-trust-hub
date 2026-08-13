import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchFilters } from '@/components/search-filters';
import { DirectoryControls } from '@/components/directory-controls';
import { DirectoryPagination } from '@/components/directory-pagination';
import { ProviderCard } from '@/components/provider-card';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { searchProviders } from '@/lib/providers/queries';
import { buildMetadata } from '@/lib/seo/metadata';
import type { Provider } from '@/types/provider';
import type { InsuranceType, Specialty } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { NetworkBelongingLine } from '@/components/network/network-belonging-line';
import {
  EmptyCoveragePanel,
  NAIC_CONSUMER_URL,
  DOI_PATHWAY_HREF,
} from '@/components/research/empty-coverage-panel';
import {
  countVerifiedNewJerseyProviders,
  getLaunchCountyLiveTotals,
  getTxLaunchMarketLiveTotals,
  getNjLaunchRegionLiveTotals,
  getOhLaunchMarketLiveTotals,
  getNcLaunchMarketLiveTotals,
  getNvLaunchMarketLiveTotals,
  getVtLaunchMarketLiveTotals,
} from '@/lib/dfs/providers-by-county';
import { DirectorySpecialtyChips } from '@/components/directory-specialty-chips';
import { getCachedVerifiedLaunchCounts } from '@/lib/directory/live-counts';
import {
  DIRECTORY_PAGE_SIZE,
  parseDirectoryPage,
  directoryTotalPages,
  clampDirectoryPage,
} from '@/lib/directory/params';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Agency Directory — Verified Research Listings (FL · TX · OH)',
  description:
    'Browse verified insurance agency research listings for Florida (DFS), Texas (TDI), and Ohio (ODI). Independent research — re-check state licensing before you enroll.',
  path: '/directory',
});

interface DirectoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const val = params[key];
  return Array.isArray(val) ? val[0] ?? '' : val ?? '';
}

function sortProviders(providers: Provider[], sort: string, query: string): Provider[] {
  const sorted = [...providers];
  switch (sort) {
    case 'reviews':
      return sorted.sort((a, b) => b.review_count - a.review_count);
    case 'relevance':
      if (!query) return sorted;
      const q = query.toLowerCase();
      return sorted.sort((a, b) => {
        const score = (p: Provider) =>
          (p.name.toLowerCase().includes(q) ? 3 : 0) +
          (p.city.toLowerCase().includes(q) ? 2 : 0) +
          (p.specialties.some((s) => s.toLowerCase().includes(q)) ? 1 : 0);
        return score(b) - score(a);
      });
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'name':
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const params = await searchParams;
  const query = getParam(params, 'q');
  const state = getParam(params, 'state');
  const type = getParam(params, 'type') as InsuranceType | '';
  const specialty = getParam(params, 'specialty') as Specialty | '';
  // Phase 11A — public directory is always verified research (legacy verified=false ignored)
  const verifiedOnly = getParam(params, 'verified') !== 'false';
  const hasAppointmentSnapshot = state === 'FL' && getParam(params, 'appointments') === 'true';
  const minRating = getParam(params, 'minRating');
  const sort = getParam(params, 'sort') || 'name';
  const view = getParam(params, 'view') || 'grid';
  const requestedPage = parseDirectoryPage(getParam(params, 'page'));
  const serverSort =
    sort === 'rating' || sort === 'reviews' ? sort : ('name' as const);

  let { providers: rawProviders, total } = await searchProviders({
    query: query || undefined,
    state: state || undefined,
    insuranceType: type || undefined,
    specialty: specialty || undefined,
    verifiedOnly: true,
    hasAppointmentSnapshot,
    minRating: minRating ? Number(minRating) : undefined,
    sort: serverSort,
    limit: DIRECTORY_PAGE_SIZE,
    offset: (requestedPage - 1) * DIRECTORY_PAGE_SIZE,
  });

  const totalPages = directoryTotalPages(total, DIRECTORY_PAGE_SIZE);
  const page = clampDirectoryPage(requestedPage, totalPages);
  if (page !== requestedPage && total > 0) {
    const retry = await searchProviders({
      query: query || undefined,
      state: state || undefined,
      insuranceType: type || undefined,
      specialty: specialty || undefined,
      verifiedOnly: true,
      hasAppointmentSnapshot,
      minRating: minRating ? Number(minRating) : undefined,
      sort: serverSort,
      limit: DIRECTORY_PAGE_SIZE,
      offset: (page - 1) * DIRECTORY_PAGE_SIZE,
    });
    rawProviders = retry.providers;
    total = retry.total;
  }

  const providers = sortProviders(rawProviders, sort, query);
  const isList = view === 'list';
  const { fl: flTotal, tx: txTotal, oh: ohTotal, nc: ncTotal, nv: nvTotal, vt: vtTotal } =
    await getCachedVerifiedLaunchCounts();
  const njTotal = await countVerifiedNewJerseyProviders();
  const [launchRows, txHubRows, ohHubRows, njHubRows, ncHubRows, nvHubRows, vtHubRows] =
    await Promise.all([
      flTotal > 0 ? getLaunchCountyLiveTotals() : Promise.resolve([]),
      txTotal > 0 ? getTxLaunchMarketLiveTotals() : Promise.resolve([]),
      ohTotal > 0 ? getOhLaunchMarketLiveTotals() : Promise.resolve([]),
      njTotal > 0 ? getNjLaunchRegionLiveTotals() : Promise.resolve([]),
      ncTotal > 0 ? getNcLaunchMarketLiveTotals() : Promise.resolve([]),
      nvTotal > 0 ? getNvLaunchMarketLiveTotals() : Promise.resolve([]),
      vtTotal > 0 ? getVtLaunchMarketLiveTotals() : Promise.resolve([]),
    ]);
  const browsingTx = state === 'TX';
  const browsingOh = state === 'OH';
  const browsingNj = state === 'NJ';
  const browsingNc = state === 'NC';
  const browsingNv = state === 'NV';
  const browsingVt = state === 'VT';
  const browsingFl = state === 'FL';
  const browsingAllVerified = !state;

  const filterParams: Record<string, string> = {};
  if (query) filterParams.q = query;
  if (state) filterParams.state = state;
  if (type) filterParams.type = type;
  if (specialty) filterParams.specialty = specialty;
  if (minRating) filterParams.minRating = minRating;
  if (sort && sort !== 'name') filterParams.sort = sort;
  if (view && view !== 'grid') filterParams.view = view;
  if (hasAppointmentSnapshot) filterParams.appointments = 'true';

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-10">
        <h1 className="section-heading">Insurance agency directory</h1>
        <NetworkBelongingLine align="left" className="mt-2" />
        <p className="mt-3 text-muted-foreground leading-relaxed">
          {browsingOh
            ? 'Ohio Department of Insurance (ODI)–verified agency research listings. Agency/business entities only. Empty markets stay empty. Always re-check licenses on the official ODI locator.'
            : browsingTx
              ? 'Texas Department of Insurance (TDI)–verified agency research listings. Always re-check licenses on official TDI tools.'
              : browsingFl
                ? 'Florida DFS–verified agency research listings. Always re-check licenses on official DFS tools.'
                : browsingNc
                  ? 'North Carolina Department of Insurance (NC DOI)–verified agency research listings. Agency/business entities only. Empty markets stay empty. Always re-check licenses on official NC DOI / SBS tools.'
                  : browsingNv
                    ? 'Nevada Division of Insurance (NV DOI)–verified firm research listings. Agency/producer firms with a Nevada address. Empty markets stay empty. Always re-check licenses on official NV DOI / SBS tools.'
                    : browsingVt
                      ? 'Vermont Department of Financial Regulation (VT DFR)–verified agency research listings. Firms only — not a bulk individual producer list. Empty markets stay empty. Always re-check licenses on official VT DFR / SBS tools.'
                      : 'Verified research listings only — Florida DFS, Texas TDI, Ohio ODI, Nevada DOI, and (when promoted) North Carolina DOI and Vermont DFR agency inventory. Empty filters stay empty. Always re-check licensing on official state tools before you enroll.'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/my-insurance" className="font-semibold text-primary underline-offset-2 hover:underline">
            Save agencies to My Insurance
          </Link>{' '}
          to build a research shortlist (guest-saved on this device).
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="navigation" aria-label="Verified state filters">
          {flTotal > 0 ? (
            <Link
              href="/directory?state=FL&verified=true"
              className={
                browsingFl
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Florida (DFS)
              <span className="ml-1.5 tabular-nums opacity-90">
                {flTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          {txTotal > 0 ? (
            <Link
              href="/directory?state=TX&verified=true"
              className={
                browsingTx
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Texas (TDI)
              <span className="ml-1.5 tabular-nums opacity-90">
                {txTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          {ohTotal > 0 ? (
            <Link
              href="/directory?state=OH&verified=true"
              className={
                browsingOh
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Ohio (ODI)
              <span className="ml-1.5 tabular-nums opacity-90">
                {ohTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          {vtTotal > 0 ? (
            <Link
              href="/directory?state=VT&verified=true"
              className={
                browsingVt
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Vermont (VT DFR)
              <span className="ml-1.5 tabular-nums opacity-90">
                {vtTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          {nvTotal > 0 ? (
            <Link
              href="/directory?state=NV&verified=true"
              className={
                browsingNv
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Nevada (NV DOI)
              <span className="ml-1.5 tabular-nums opacity-90">
                {nvTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          {ncTotal > 0 ? (
            <Link
              href="/directory?state=NC&verified=true"
              className={
                browsingNc
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              North Carolina (NC DOI)
              <span className="ml-1.5 tabular-nums opacity-90">
                {ncTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          <Link
            href="/directory?verified=true"
            className={
              browsingAllVerified
                ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                : 'inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40'
            }
          >
            All verified
          </Link>
          {njTotal > 0 ? (
            <Link
              href="/directory?state=NJ&verified=true"
              className={
                browsingNj
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40'
              }
            >
              New Jersey (DOBI)
              <span className="ml-1.5 tabular-nums opacity-90">
                {njTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
        </div>
        {vtTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vermont launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {vtTotal.toLocaleString()} verified VT listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {vtHubRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10"
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/directory?state=VT&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  Browse VT directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/vermont"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  All Vermont hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {nvTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nevada launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {nvTotal.toLocaleString()} verified NV listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {nvHubRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10"
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/directory?state=NV&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  Browse NV directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/nevada"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  All Nevada hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {ncTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              North Carolina launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {ncTotal.toLocaleString()} verified NC listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ncHubRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10"
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/directory?state=NC&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  Browse NC directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/north-carolina"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  All North Carolina hubs
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/north-carolina-aca-marketplace"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  NC ACA guides
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {njTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New Jersey launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {njTotal.toLocaleString()} verified NJ listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {njHubRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10"
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        {txTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Texas launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {txTotal.toLocaleString()} verified TX listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {txHubRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className={
                        row.kind === 'aggregate'
                          ? 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10'
                      }
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/directory?state=TX&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  Browse TX directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/texas"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  All Texas hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {ohTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ohio launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {ohTotal.toLocaleString()} verified OH listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ohHubRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10"
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/directory?state=OH&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  Browse OH directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/ohio"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  All Ohio hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {flTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Florida launch counties
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {flTotal.toLocaleString()} verified FL listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {launchRows
                .filter((row) => row.total > 0)
                .map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.hubHref}
                      className={
                        row.kind === 'aggregate'
                          ? 'inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary'
                          : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust hover:bg-trust/10'
                      }
                    >
                      {row.displayName}
                      <span className="tabular-nums opacity-80">
                        {row.total.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              <li>
                <Link
                  href="/hubs/florida"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  All Florida hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
            <SearchFilters />
          </Suspense>
        </aside>

        <div>
          <DirectorySpecialtyChips
            activeSpecialty={specialty}
            searchParams={filterParams}
            className="mb-6 rounded-xl border bg-card p-4"
          />
          <Suspense fallback={null}>
            <DirectoryControls
              total={total}
              showing={providers.length}
              page={page}
              pageSize={DIRECTORY_PAGE_SIZE}
              className="mb-6"
            />
          </Suspense>

          {providers.length === 0 ? (
            <EmptyCoveragePanel
              variant={query || state || type || specialty || verifiedOnly || minRating ? 'filtered' : 'unmapped'}
              title={
                state || query
                  ? 'No agencies match your filters'
                  : 'No agencies match these criteria yet'
              }
              description={
                state || query || type || specialty
                  ? 'No verified research listings match the current filters. Broaden the search, try another state (Florida, Texas, Ohio), or use research tools. We will not invent listings to fill this view.'
                  : 'No agencies currently meet our public research standard for this view. That does not mean unlicensed agents do not exist — verify on official state DOI / NAIC tools.'
              }
              placeLabel={state || query || undefined}
              primarySources={[
                { href: DOI_PATHWAY_HREF, label: 'License verification guide' },
                {
                  href: NAIC_CONSUMER_URL,
                  label: 'NAIC consumer tools',
                  external: true,
                },
              ]}
              widenLinks={[
                { href: '/directory?verified=true', label: 'Clear directory home' },
                { href: '/tools/coverage-compass', label: 'Coverage Compass' },
                { href: '/calculators', label: 'Educational calculators' },
                { href: '/methodology', label: 'Methodology' },
              ]}
              journeyLink={{
                href: 'https://www.movetrusthub.com/verify-dot',
                label: 'Research movers if you’re relocating',
                external: true,
              }}
            />
          ) : (
            <>
              <div
                id="directory-results"
                className={cn(
                  isList
                    ? 'flex flex-col gap-4'
                    : 'grid sm:grid-cols-2 xl:grid-cols-3 gap-5'
                )}
              >
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
              <DirectoryPagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={DIRECTORY_PAGE_SIZE}
                searchParams={filterParams}
              />
            </>
          )}
        </div>
      </div>

      <DisclaimerBanner className="mt-12 rounded-xl border" compact />
    </div>
  );
}
