import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { NeedsAssessmentTool } from '@/components/tools/needs-assessment-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Coverage Compass — Personalized Insurance Research Path',
  description:
    'Answer a few quick questions. We’ll point you to coverage focus areas and InsuranceTrustHub research tools that fit your situation. Educational only — no quotes, no lead selling.',
  path: '/tools/needs-assessment',
});

type PageProps = { searchParams?: Promise<{ from?: string }> };

export default async function NeedsAssessmentPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/40">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/tools/needs-assessment"
            from={sp.from}
            currentLabel="Coverage Compass"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Guided research · ~60–90 seconds
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Coverage Compass
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Answer a few quick questions. We’ll point you to the coverage areas and research tools
            that fit your situation.
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-teal-200/80 bg-white/80 px-3 py-2 text-sm text-teal-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Educational only. No quotes. No lead selling.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" aria-hidden />
              Card-based · mobile-first
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              Routes to live CMS tools
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              Independent positioning
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <NeedsAssessmentTool />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="container mx-auto max-w-3xl space-y-10 px-4 py-12 md:py-14">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How this works</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Coverage Compass is a short, educational guide. Your answers never leave the browser
              for marketing, and we don’t invent premiums or push a carrier. We map your situation
              to coverage focus areas and deep-link into tools already live on InsuranceTrustHub —
              Cost &amp; Coverage Planner, Medicare provider lookup, Plan Complaint Index, county
              dashboards, and verified agent directories.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Related research tools</h2>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <li>
                <Link href="/tools/cost-estimator" className="font-medium text-teal-700 hover:underline">
                  Insurance Cost &amp; Coverage Planner
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/medicare-provider-lookup"
                  className="font-medium text-teal-700 hover:underline"
                >
                  Medicare provider lookup
                </Link>
              </li>
              <li>
                <Link
                  href="/data/plan-complaint-index"
                  className="font-medium text-teal-700 hover:underline"
                >
                  Plan Complaint Index
                </Link>
              </li>
              <li>
                <Link href="/data/counties" className="font-medium text-teal-700 hover:underline">
                  County Medicare dashboards
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/medicare-plan-finder"
                  className="font-medium text-teal-700 hover:underline"
                >
                  Medicare research guide
                </Link>
              </li>
              <li>
                <Link href="/hubs/south-florida" className="font-medium text-teal-700 hover:underline">
                  Verified South Florida agents
                </Link>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Want human help later?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              When you’re ready, browse verified agents — no forced lead form from this experience.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/hubs/aca" className="font-medium text-teal-700 hover:underline">
                ACA specialists
              </Link>
              <Link href="/hubs/medicare" className="font-medium text-teal-700 hover:underline">
                Medicare specialists
              </Link>
              <Link href="/directory" className="font-medium text-teal-700 hover:underline">
                Full directory
              </Link>
            </div>
          </section>
        </div>
      </div>

      <DisclaimerBanner />
    </>
  );
}
