import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchFilters } from '@/components/search-filters';
import { DirectoryControls } from '@/components/directory-controls';
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
  countVerifiedFloridaProviders,
  getLaunchCountyLiveTotals,
} from '@/lib/dfs/providers-by-county';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Agency Directory — Search Licensed Agents by State',
  description:
    'Search Florida DFS–verified research listings and other verified agencies by state, coverage type, and specialty. Independent research directory — re-check DOI licensing before you enroll.',
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
    default:
      return sorted.sort((a, b) => b.rating - a.rating);
  }
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const params = await searchParams;
  const query = getParam(params, 'q');
  const state = getParam(params, 'state');
  const type = getParam(params, 'type') as InsuranceType | '';
  const specialty = getParam(params, 'specialty') as Specialty | '';
  const verifiedOnly = getParam(params, 'verified') === 'true';
  const minRating = getParam(params, 'minRating');
  const sort = getParam(params, 'sort') || 'rating';
  const view = getParam(params, 'view') || 'grid';

  const { providers: rawProviders, total } = await searchProviders({
    query: query || undefined,
    state: state || undefined,
    insuranceType: type || undefined,
    specialty: specialty || undefined,
    verifiedOnly,
    minRating: minRating ? Number(minRating) : undefined,
    limit: 48,
  });

  const providers = sortProviders(rawProviders, sort, query);
  const isList = view === 'list';
  const launchRows = await getLaunchCountyLiveTotals();
  const flTotal = await countVerifiedFloridaProviders();

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-10">
        <h1 className="section-heading">Insurance agency directory</h1>
        <NetworkBelongingLine align="left" className="mt-2" />
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Search agencies that meet our public research standard. Empty markets stay empty — we do
          not invent inventory. Always re-check licensing with your state insurance department.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/my-insurance" className="font-semibold text-primary underline-offset-2 hover:underline">
            Save agencies to My Insurance
          </Link>{' '}
          to build a research shortlist (guest-saved on this device).
        </p>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Florida launch counties
            {flTotal > 0 ? (
              <span className="ml-2 font-normal normal-case tracking-normal">
                · {flTotal.toLocaleString()} verified FL listings
              </span>
            ) : null}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {launchRows.map((row) => (
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
                href="/hubs/florida"
                className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                All Florida hubs
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
            <SearchFilters />
          </Suspense>
        </aside>

        <div>
          <Suspense fallback={null}>
            <DirectoryControls total={total} className="mb-6" />
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
                  ? 'No verified research listings match the current filters. Broaden the search or clear filters — we will not backfill with seed agencies.'
                  : 'We’re still verifying markets for the public directory. Empty here does not mean unlicensed agents do not exist — verify on state DOI / NAIC tools.'
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
                { href: '/directory', label: 'Clear directory home' },
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
            <div
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
          )}
        </div>
      </div>

      <DisclaimerBanner className="mt-12 rounded-xl border" compact />
    </div>
  );
}