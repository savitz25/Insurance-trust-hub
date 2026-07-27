import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  COUNTY_SUMMARIES_META,
  formatEnrollment,
  getAllCountySummaries,
} from '@/lib/insurance/cms/county-summaries';
import { DisclaimerBanner } from '@/components/disclaimer-banner';

export const metadata: Metadata = buildMetadata({
  title: 'County Medicare Intelligence Dashboards | CMS Market Snapshots',
  description:
    'County-level Medicare Advantage and Part D market snapshots from CMS enrollment and Star Ratings data. Start with Miami-Dade, Broward, and Palm Beach.',
  path: '/data/counties',
});

export default function CountyMedicareIndexPage() {
  const counties = getAllCountySummaries();
  const synced = new Date(COUNTY_SUMMARIES_META.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/30">
        <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Medicare Intelligence
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            County Medicare dashboards
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
            CMS-derived enrollment and complaint-measure context by county. Phase 2 first slice
            covers South Florida tri-county markets.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Enrollment vintage: {COUNTY_SUMMARIES_META.enrollmentSource.split('—')[1]?.trim() ?? 'CMS'} · Last
            synced {synced}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counties.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/data/counties/${c.slug}`}
                className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  {c.stateName}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{c.displayName}</h2>
                <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                  {formatEnrollment(c.metrics.publishedEnrollment)}
                </p>
                <p className="text-xs text-slate-500">published MA/PD enrollment (lower bound)</p>
                <p className="mt-3 text-sm text-slate-600">
                  {c.metrics.materialConsumerContracts} material contracts ·{' '}
                  {c.metrics.maContractsMaterial} MA
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-sm text-slate-600">
          Related:{' '}
          <Link href="/data/plan-complaint-index" className="font-medium text-teal-700 hover:underline">
            Plan Complaint Index
          </Link>
          {' · '}
          <Link href="/hubs/south-florida" className="font-medium text-teal-700 hover:underline">
            South Florida agents
          </Link>
        </p>
      </div>
      <DisclaimerBanner />
    </>
  );
}
