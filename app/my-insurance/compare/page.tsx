import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { getProviderBySlug } from '@/lib/providers/queries';
import { CompareSession } from '@/components/my-insurance/compare-session';
import { MAX_COMPARE_PROVIDERS } from '@/lib/my-insurance/constants';
import type { Provider } from '@/types/provider';

export const metadata: Metadata = buildMetadata({
  title: 'Compare agencies - My Insurance',
  description:
    'Side-by-side research comparison of insurance agencies. Independent directory - no paid placements.',
  path: '/my-insurance/compare',
});

type PageProps = {
  searchParams?: Promise<{ add?: string | string[]; id?: string }>;
};

export default async function MyInsuranceComparePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const rawAdds = sp.add;
  const urlSlugs = (
    Array.isArray(rawAdds) ? rawAdds : rawAdds ? [rawAdds] : []
  )
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE_PROVIDERS);

  const providers: Provider[] = [];
  for (const slug of urlSlugs) {
    const p = await getProviderBySlug(slug);
    if (p) providers.push(p);
  }

  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/30">
      <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          My Insurance · Compare
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Side-by-side agency comparison
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          Research-only comparison of public listing signals. Not a ranking, quote, or endorsement.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          <Link href="/my-insurance" className="font-medium text-teal-700 hover:underline">
            Back to Insurance HQ
          </Link>
          {' · '}
          <Link href="/directory" className="font-medium text-teal-700 hover:underline">
            Directory
          </Link>
        </p>

        <div className="mt-8">
          <CompareSession
            providers={providers}
            comparisonId={sp.id ?? null}
            hasUrlSlugs={urlSlugs.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
