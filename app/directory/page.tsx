import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchFilters } from '@/components/search-filters';
import { DirectoryControls } from '@/components/directory-controls';
import { ProviderCard } from '@/components/provider-card';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { searchProviders } from '@/lib/providers/queries';
import { buildMetadata } from '@/lib/seo/metadata';
import type { Provider } from '@/types/provider';
import type { InsuranceType, Specialty } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Agency Directory — Search Licensed Agents by State',
  description:
    'Search and compare licensed insurance agencies by state, coverage type, rating, and specialty. Read reviews and request free quotes.',
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

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-10">
        <h1 className="section-heading">Insurance agency directory</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Search licensed independent and captive agencies by location, coverage type, and customer
          ratings. Always verify licensing with your state insurance department.
        </p>
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
            <div className="rounded-xl border bg-muted/30 p-12 text-center">
              <p className="font-medium">No agencies match your filters</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try broadening your search or clearing filters.
              </p>
            </div>
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