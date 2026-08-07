import type { Metadata } from 'next';
import { Stethoscope } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { MedicareProviderLookupTool } from '@/components/tools/medicare-provider-lookup';
import { getProviderSearchMeta } from '@/lib/insurance/cms/provider-search';

export const metadata: Metadata = buildMetadata({
  title: 'Medicare Provider Participation Lookup | Does My Doctor Accept Medicare?',
  description:
    'Search by doctor or organization name (or NPI) against CMS Medicare Fee-For-Service enrollment (PPEF) and Opt Out Affidavits. Educational tool — not advice.',
  path: '/tools/medicare-provider-lookup',
});

type Props = { searchParams?: Promise<{ from?: string }> };

export default async function MedicareProviderLookupPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const meta = getProviderSearchMeta();
  const syncedLabel = new Date(meta.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/tools/medicare-provider-lookup"
            from={sp.from}
            currentLabel="Medicare provider lookup"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <Stethoscope className="h-3.5 w-3.5" aria-hidden />
            Interactive CMS tool
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Does my doctor accept Medicare?
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Search by doctor or organization name — you do not need the NPI. We match against CMS
            Public Provider Enrollment (PPEF) and Opt Out Affidavits. Results are Fee-For-Service
            transparency signals — not network guarantees for every Medicare Advantage plan.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Data vintage: <strong className="font-medium text-slate-800">{meta.dataVintage}</strong>
            {' · '}
            Last synced <strong className="font-medium text-slate-800">{syncedLabel}</strong>
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <MedicareProviderLookupTool
          searchableStates={meta.searchableStates}
          dataVintage={meta.dataVintage}
          syncedLabel={syncedLabel}
          optOutCount={meta.optOutCount}
        />
      </div>

      <DisclaimerBanner />
    </>
  );
}
