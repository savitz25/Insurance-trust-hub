import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchFilters } from '@/components/search-filters';
import { DirectoryControls } from '@/components/directory-controls';
import { DirectoryPagination } from '@/components/directory-pagination';
import { ProviderCard } from '@/components/provider-card';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { searchProviders } from '@/lib/providers/queries';
import type { ProviderFilters } from '@/types/provider';
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
  LIVE_DIRECTORY_STATES,
  classifyDirectoryEmpty,
  directoryEmptyCopy,
} from '@/lib/research/empty-inventory';
import {
  countVerifiedNewJerseyProviders,
  getLaunchCountyLiveTotals,
  getTxLaunchMarketLiveTotals,
  getNjLaunchRegionLiveTotals,
  getOhLaunchMarketLiveTotals,
  getNcLaunchMarketLiveTotals,
  getNvLaunchMarketLiveTotals,
  getVtLaunchMarketLiveTotals,
  getMaLaunchMarketLiveTotals,
  getMsLaunchMarketLiveTotals,
} from '@/lib/dfs/providers-by-county';
import { DirectorySpecialtyChips } from '@/components/directory-specialty-chips';
import { getCachedVerifiedLaunchCounts } from '@/lib/directory/live-counts';
import {
  getDirectoryStateIntro,
  regulatorHasLoaSpecialtyTags,
} from '@/lib/regulators/labels';
import { parseHubLoaFilter } from '@/components/hub-specialty-filter';
import {
  DIRECTORY_PAGE_SIZE,
  parseDirectoryPage,
  directoryTotalPages,
  clampDirectoryPage,
} from '@/lib/directory/params';
import { looksLikeZip, resolveDirectoryZip } from '@/lib/directory/zip-geo';

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
  const rawQuery = getParam(params, 'q');
  const zipParam = getParam(params, 'zip') || (looksLikeZip(rawQuery) ? rawQuery : '');
  const zipGeo = resolveDirectoryZip(zipParam);
  const query = looksLikeZip(rawQuery) ? '' : rawQuery;
  const state = getParam(params, 'state') || zipGeo?.stateCode || '';
  const typeRaw = getParam(params, 'type');
  const typeTokens = typeRaw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const type = (
    typeTokens.length === 1 && !typeTokens[0]!.includes(',')
      ? typeTokens[0]
      : ''
  ) as InsuranceType | '';
  const loaAlias = parseHubLoaFilter(getParam(params, 'loa'));
  const loaSpecialtyMap: Record<string, Specialty> = {
    health: 'Health',
    life: 'Life',
    pc: 'Property & Casualty',
    personal: 'Personal Lines',
    agency: 'Agency',
    title: 'Title',
    adjuster: 'Public Adjuster',
  };
  const wantHealthLoa =
    typeTokens.includes('health') ||
    typeTokens.includes('medicare') ||
    getParam(params, 'specialty') === 'Health';
  const specialty = (getParam(params, 'specialty') ||
    (loaAlias !== 'all' ? loaSpecialtyMap[loaAlias] ?? '' : '') ||
    (wantHealthLoa && zipGeo ? 'Health' : '')) as Specialty | '';
  // Phase 11A — public directory is always verified research (legacy verified=false ignored)
  const verifiedOnly = getParam(params, 'verified') !== 'false';
  const hasAppointmentSnapshot = state === 'FL' && getParam(params, 'appointments') === 'true';
  const minRating = getParam(params, 'minRating');
  const sort = getParam(params, 'sort') || 'name';
  const view = getParam(params, 'view') || 'grid';
  const requestedPage = parseDirectoryPage(getParam(params, 'page'));
  const serverSort =
    sort === 'rating' || sort === 'reviews' ? sort : ('name' as const);
  const pageSize = zipGeo ? 48 : DIRECTORY_PAGE_SIZE;

  const searchArgs = (specialtyOverride?: Specialty | ''): ProviderFilters => ({
    query: query || undefined,
    state: state || undefined,
    zip: zipGeo?.zip,
    launchCountyId: zipGeo?.launchCounty?.id,
    insuranceType: type || undefined,
    specialty: (specialtyOverride ?? specialty) || undefined,
    verifiedOnly: true,
    hasAppointmentSnapshot,
    minRating: minRating ? Number(minRating) : undefined,
    sort: serverSort,
    limit: pageSize,
    offset: (requestedPage - 1) * pageSize,
  });

  let loaFallback = false;
  let { providers: rawProviders, total } = zipParam && !zipGeo
    ? { providers: [], total: 0 }
    : await searchProviders(searchArgs());

  if (zipGeo && specialty && total === 0) {
    const retryLocal = await searchProviders(searchArgs(''));
    if (retryLocal.total > 0) {
      rawProviders = retryLocal.providers;
      total = retryLocal.total;
      loaFallback = true;
    }
  }

  const totalPages = directoryTotalPages(total, pageSize);
  const page = clampDirectoryPage(requestedPage, totalPages);
  if (page !== requestedPage && total > 0) {
    const retry = await searchProviders({
      ...searchArgs(loaFallback ? '' : specialty),
      offset: (page - 1) * pageSize,
    });
    rawProviders = retry.providers;
    total = retry.total;
  }

  const providers = sortProviders(rawProviders, sort, query);
  const isList = view === 'list';
  const skipLaunchFanout = Boolean(zipGeo || zipParam);
  const {
    fl: flTotal,
    tx: txTotal,
    oh: ohTotal,
    nc: ncTotal,
    nv: nvTotal,
    vt: vtTotal,
    ma: maTotal,
    ms: msTotal,
  } = skipLaunchFanout
    ? { fl: 0, tx: 0, oh: 0, nc: 0, nv: 0, vt: 0, ma: 0, ms: 0 }
    : await getCachedVerifiedLaunchCounts();
  const njTotal = skipLaunchFanout ? 0 : await countVerifiedNewJerseyProviders();
  const [launchRows, txHubRows, ohHubRows, njHubRows, ncHubRows, nvHubRows, vtHubRows, maHubRows, msHubRows] =
    skipLaunchFanout
      ? [[], [], [], [], [], [], [], [], []]
      : await Promise.all([
          flTotal > 0 ? getLaunchCountyLiveTotals() : Promise.resolve([]),
          txTotal > 0 ? getTxLaunchMarketLiveTotals() : Promise.resolve([]),
          ohTotal > 0 ? getOhLaunchMarketLiveTotals() : Promise.resolve([]),
          njTotal > 0 ? getNjLaunchRegionLiveTotals() : Promise.resolve([]),
          ncTotal > 0 ? getNcLaunchMarketLiveTotals() : Promise.resolve([]),
          nvTotal > 0 ? getNvLaunchMarketLiveTotals() : Promise.resolve([]),
          vtTotal > 0 ? getVtLaunchMarketLiveTotals() : Promise.resolve([]),
          maTotal > 0 ? getMaLaunchMarketLiveTotals() : Promise.resolve([]),
          msTotal > 0 ? getMsLaunchMarketLiveTotals() : Promise.resolve([]),
        ]);
  const browsingTx = state === 'TX';
  const browsingOh = state === 'OH';
  const browsingNj = state === 'NJ';
  const browsingNc = state === 'NC';
  const browsingNv = state === 'NV';
  const browsingVt = state === 'VT';
  const browsingMa = state === 'MA';
  const browsingMs = state === 'MS';
  const browsingFl = state === 'FL';
  const browsingAllVerified = !state;

  const filterParams: Record<string, string> = {};
  if (query) filterParams.q = query;
  if (zipGeo?.zip) filterParams.zip = zipGeo.zip;
  if (state) filterParams.state = state;
  if (type) filterParams.type = type;
  if (specialty) filterParams.specialty = specialty;
  if (minRating) filterParams.minRating = minRating;
  if (sort && sort !== 'name') filterParams.sort = sort;
  if (view && view !== 'grid') filterParams.view = view;
  if (hasAppointmentSnapshot) filterParams.appointments = 'true';

  const emptyVariant = classifyDirectoryEmpty({
    zipRaw: zipParam || undefined,
    zipResolved: Boolean(zipGeo),
    launchCounty: Boolean(zipGeo?.launchCounty),
    liveState: Boolean(state && LIVE_DIRECTORY_STATES.has(state.toUpperCase())),
  });
  const emptyCopy = directoryEmptyCopy({
    variant: emptyVariant,
    zipRaw: zipParam || undefined,
    zipLabel: zipGeo?.displayLabel,
    state: state || undefined,
    specialty: specialty || undefined,
    query: query || undefined,
  });

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-10">
        <h1 className="section-heading">Insurance agency directory</h1>
        <NetworkBelongingLine align="left" className="mt-2" />
        <p className="mt-3 text-muted-foreground leading-relaxed">
          {zipGeo
            ? `ZIP ${zipGeo.zip} maps to ${zipGeo.displayLabel}. Showing verified agencies in that geography only — not a nationwide name search.`
            : getDirectoryStateIntro(state)}
        </p>
        {zipGeo?.hubHref ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Prefer the county hub:{' '}
            <Link
              href={zipGeo.hubHref}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {zipGeo.countyName || zipGeo.stateName} verified listings
            </Link>
            .
          </p>
        ) : null}
        {loaFallback ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This extract does not reliably tag Health / Medicare lines of authority for every
            local agency. Showing the verified local list instead of an empty specialty filter.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/my-insurance" className="font-semibold text-primary underline-offset-2 hover:underline">
            Save agencies to My Insurance
          </Link>{' '}
          to build a research shortlist (guest-saved on this device).
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Licensed agency not shown?{' '}
          <Link href="/claim-listing" className="font-semibold text-primary underline-offset-2 hover:underline">
            Request a listing
          </Link>
          . We publish only after an official state license check. Not paid placement.
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
          {maTotal > 0 ? (
            <Link
              href="/directory?state=MA&verified=true"
              className={
                browsingMa
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Massachusetts (MA DOI)
              <span className="ml-1.5 tabular-nums opacity-90">
                {maTotal.toLocaleString()}
              </span>
            </Link>
          ) : null}
          {msTotal > 0 ? (
            <Link
              href="/directory?state=MS&verified=true"
              className={
                browsingMs
                  ? 'inline-flex rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'inline-flex rounded-full border border-trust/30 bg-trust/5 px-3 py-1.5 text-xs font-semibold text-trust hover:bg-trust/10'
              }
            >
              Mississippi (MID)
              <span className="ml-1.5 tabular-nums opacity-90">
                {msTotal.toLocaleString()}
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
        {maTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Massachusetts launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {maTotal.toLocaleString()} verified MA listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {maHubRows
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
                  href="/directory?state=MA&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  Browse MA directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/massachusetts"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  All Massachusetts hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {msTotal > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mississippi launch hubs
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {msTotal.toLocaleString()} verified MS listings
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {msHubRows
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
                  href="/directory?state=MS&verified=true"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  Browse MS directory
                </Link>
              </li>
              <li>
                <Link
                  href="/hubs/mississippi"
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  All Mississippi hubs
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
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
          {regulatorHasLoaSpecialtyTags(state || null) ? (
            <DirectorySpecialtyChips
              activeSpecialty={specialty}
              searchParams={filterParams}
              className="mb-6 rounded-xl border bg-card p-4"
            />
          ) : (
            <p className="mb-6 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              This state&apos;s source file does not include lines of authority. Specialty chips
              are hidden so we do not invent filters.
            </p>
          )}
          <Suspense fallback={null}>
            <DirectoryControls
              total={total}
              showing={providers.length}
              page={page}
              pageSize={pageSize}
              className="mb-6"
            />
          </Suspense>

          {providers.length === 0 ? (
            <EmptyCoveragePanel
              variant={emptyCopy.variant}
              title={emptyCopy.headline}
              description={emptyCopy.body}
              placeLabel={emptyCopy.placeLabel}
              primarySources={[
                { href: DOI_PATHWAY_HREF, label: 'License verification guide' },
                {
                  href: NAIC_CONSUMER_URL,
                  label: 'NAIC consumer tools',
                  external: true,
                },
              ]}
              widenLinks={[
                ...(zipGeo?.hubHref
                  ? [{ href: zipGeo.hubHref, label: `${zipGeo.countyName || zipGeo.stateName} hub` }]
                  : []),
                { href: '/directory?verified=true', label: 'Clear filters / directory home' },
                { href: '/tools', label: 'Research Center' },
                { href: '/claim-listing', label: 'Request a listing' },
                { href: '/tools/coverage-compass', label: 'Coverage Compass' },
                { href: '/guides', label: 'Guides' },
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
                pageSize={pageSize}
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
