import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { CoverageCompassTool } from '@/components/tools/coverage-compass-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Coverage Compass — Your insurance research path',
  description:
    'Tell us your situation. Coverage Compass routes you to live ACA, Medicare, cost, and verification tools. Educational only — no quotes, no lead selling.',
  path: '/tools/coverage-compass',
});

type PageProps = { searchParams?: Promise<{ from?: string }> };

export default async function CoverageCompassPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/40">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/tools/coverage-compass"
            from={sp.from}
            currentLabel="Coverage Compass"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Question 1 · What coverage do I need? · ~1 minute
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Coverage Compass
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Pick your situation (optional ZIP). Get an ordered research path across coverage
            understanding, local options, and verification — using tools already live on
            InsuranceTrustHub.
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-[#0284C7]/30 bg-white/80 px-3 py-2 text-sm text-[#0A2540]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Educational only. No quotes. No lead selling. Official enrollment stays official.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden />
              Situation → path · mobile-first
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              Live tools only
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              Phase 4-ready save payload
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <CoverageCompassTool />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12 md:py-14">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How this works</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Coverage Compass is short onboarding for Question 1 on Insurance Trust Hub. Your
              answers stay in the browser unless you choose to save a snapshot to My Insurance. We
              map your situation to Marketplace research, ACA and cost planners, Medicare tools, the
              Plan Complaint Index, and license verification — never a sales funnel.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Related entry points</h2>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <li>
                <Link href="/tools" className="font-medium text-[#0284C7] hover:underline">
                  Research Center
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/marketplace-plan-research"
                  className="font-medium text-[#0284C7] hover:underline"
                >
                  Marketplace plan research
                </Link>
              </li>
              <li>
                <Link
                  href="/calculators/aca-subsidy"
                  className="font-medium text-[#0284C7] hover:underline"
                >
                  ACA Savings Planner
                </Link>
              </li>
              <li>
                <Link
                  href="/data/plan-complaint-index"
                  className="font-medium text-[#0284C7] hover:underline"
                >
                  Plan Complaint Index
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <DisclaimerBanner />
    </>
  );
}
