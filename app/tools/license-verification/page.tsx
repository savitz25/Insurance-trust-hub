import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { LicenseVerificationTool } from '@/components/tools/license-verification-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Verify an Insurance Agent’s License — Official State Lookup Hub',
  description:
    'Reach official state insurance department license lookups for all 50 states. We help you get to the source — final status comes from the state. No lead selling.',
  path: '/tools/license-verification',
});

type PageProps = { searchParams?: Promise<{ from?: string }> };

export default async function LicenseVerificationPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/tools/license-verification"
            from={sp.from}
            currentLabel="License verification"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            License Verification Hub
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Verify an insurance agent&apos;s license
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Before you buy coverage, confirm the person or agency is licensed where they sell. An
            active license is a baseline trust signal — not a guarantee of quality or product fit.
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-[#0284C7]/30 bg-white/80 px-3 py-2 text-sm text-[#0A2540]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            We help you reach the official source. Final license status comes from the state.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <LicenseVerificationTool />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="container mx-auto max-w-3xl space-y-10 px-4 py-12 md:py-14">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Why license verification matters</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Only licensed producers may sell most insurance products in a given state. Checking
              the state database helps you avoid impersonators, unlicensed solicitations, and
              agencies that let licenses lapse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              What an active license does — and does not — guarantee
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong className="font-medium text-slate-800">Does:</strong> show the state has
                authorized that person or firm for certain lines of authority (when the record is
                active and current).
              </li>
              <li>
                <strong className="font-medium text-slate-800">Does not:</strong> guarantee honest
                advice, best rates, network quality, or that a product fits your household.
              </li>
              <li>
                InsuranceTrustHub does <strong className="font-medium text-slate-800">not</strong>{' '}
                live-verify all 50-state licenses in-house and does not invent license statuses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              State producer license vs Marketplace registration
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A state producer license is issued by the state insurance department. Marketplace
              (ACA) agent/broker registration is a separate federal/state exchange process.
              Medicare marketing has additional rules. Always match the credential to the product
              being sold.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Before you buy</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Verify the license, get plan details in writing, and use independent research tools
              when comparing Medicare or Marketplace options. We do not sell leads from this page.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <li>
                <Link href="/directory" className="font-medium text-[#0284C7] hover:underline">
                  Agent directory
                </Link>
              </li>
              <li>
                <Link href="/tools/cost-estimator" className="font-medium text-[#0284C7] hover:underline">
                  Cost &amp; Coverage Planner
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
              <li>
                <Link href="/tools" className="font-medium text-[#0284C7] hover:underline">
                  All tools
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
