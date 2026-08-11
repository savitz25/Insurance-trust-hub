import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { PlanComplaintIndexClient } from '@/components/insurance/cms/plan-complaint-index-client';
import { CMS_COMPLAINT_DATASET_META } from '@/lib/insurance/cms/complaint-rankings';

export const metadata: Metadata = buildMetadata({
  title: 'Medicare Plan Complaint Index — CMS Complaint Rates Ranked',
  description:
    'Editorial transparency index ranking Medicare Advantage and Part D contracts by CMS complaints per 1,000 enrollees. National and Florida focus, with clear methodology and data provenance.',
  path: '/data/plan-complaint-index',
});

type Props = { searchParams?: Promise<{ from?: string }> };

export default async function PlanComplaintIndexPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const meta = CMS_COMPLAINT_DATASET_META;
  const syncedLabel = new Date(meta.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
        <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/data/plan-complaint-index"
            from={sp.from}
            currentLabel="Plan Complaint Index"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Insurance Trust Hub · Original data
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Medicare Plan Complaint Index
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            A transparent ranking of Medicare Advantage and Part D contracts by CMS complaint rates
            (complaints per 1,000 enrollees). Built for shoppers, caregivers, and agents who want
            government-sourced context — not marketing spin.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Complaint data: <strong className="font-semibold text-slate-800">{meta.dataVintage}</strong>
            {' · '}
            Last synced <strong className="font-semibold text-slate-800">{syncedLabel}</strong>
          </p>
          <p className="mt-4 text-sm text-slate-500">
            <Link href="/data/counties" className="font-medium text-[#0284C7] hover:underline">
              County Medicare dashboards
            </Link>
            {' · '}
            <Link href="/data/counties/miami-dade-fl" className="font-medium text-[#0284C7] hover:underline">
              Miami-Dade
            </Link>
            {' · '}
            <Link href="/data/counties/broward-fl" className="font-medium text-[#0284C7] hover:underline">
              Broward
            </Link>
            {' · '}
            <Link href="/data/counties/palm-beach-fl" className="font-medium text-[#0284C7] hover:underline">
              Palm Beach
            </Link>
            {' · '}
            <Link href="/tools" className="font-medium text-[#0284C7] hover:underline">
              Tools
            </Link>
            {' · '}
            <Link href="/hubs/medicare" className="font-medium text-[#0284C7] hover:underline">
              Medicare hubs
            </Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl space-y-12 px-4 py-10 md:py-14">
        <PlanComplaintIndexClient meta={meta} />

        <section
          aria-labelledby="methodology-heading"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h2
            id="methodology-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            Methodology &amp; data provenance
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Source: <strong className="font-medium text-slate-800">{meta.sourceLabel}</strong>
            {'. '}
            Dataset: {meta.sourceDataset}. Vintage{' '}
            <strong className="font-medium text-slate-800">{meta.dataVintage}</strong>, last
            successful sync {syncedLabel}.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            {meta.methodologyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            <p className="font-semibold text-slate-900">CMS columns used in this build</p>
            <p className="mt-1 text-slate-600">
              CONTRACT_ID · Organization Marketing Name · <strong>C28 Complaints about the Health
              Plan</strong> (primary rate) · <strong>D02 Complaints about the Drug Plan</strong>{' '}
              (fallback) · C28/D02 measure stars · 2025→2026 rate delta for trend · July 2026 CPSC
              enrollment for Florida/Texas material-enrollment filters. Refresh via{' '}
              <code className="text-xs">scripts/import-cms-complaint-rankings.mjs</code>.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="disclaimer-heading"
          className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 text-sm leading-relaxed text-amber-950"
        >
          <h2 id="disclaimer-heading" className="font-semibold">
            Editorial disclaimer
          </h2>
          <p className="mt-2">
            This index is educational transparency content only. It is not medical, legal, or
            insurance advice; not an endorsement of any carrier or contract; and not affiliated with
            CMS, HHS, or any plan sponsor. Complaint rates are one of many factors — always verify
            current plan details, formularies, networks, and your own needs with official CMS tools
            (Medicare.gov), licensed agents, and the plan materials. Insurance Trust Hub does not
            sell insurance.
          </p>
        </section>
      </div>

      <DisclaimerBanner />
    </>
  );
}
