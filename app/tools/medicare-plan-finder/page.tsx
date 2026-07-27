import type { Metadata } from 'next';
import { Compass } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { MedicareResearchRouter } from '@/components/tools/medicare-research-router';

export const metadata: Metadata = buildMetadata({
  title: 'Medicare Research Guide — Situation-Based Next Steps',
  description:
    'Not a plan quoting tool. Choose your Medicare situation and get a clear research path to CMS complaint rates, county dashboards, provider lookup, and verified agents. We do not sell plans.',
  path: '/tools/medicare-plan-finder',
});

type PageProps = { searchParams?: Promise<{ from?: string }> };

export default async function MedicarePlanFinderPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/30">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/tools/medicare-plan-finder"
            from={sp.from}
            currentLabel="Medicare research guide"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Research router · Not a plan finder
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Medicare research guide
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Tell us your situation and we&apos;ll point you to the best free research tools on
            InsuranceTrustHub — CMS complaint rankings, county Medicare dashboards, provider
            participation lookup, and verified agents. We do not sell plans, quote premiums, or take
            lead fees on this page.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <MedicareResearchRouter />
      </div>

      <DisclaimerBanner />
    </>
  );
}
