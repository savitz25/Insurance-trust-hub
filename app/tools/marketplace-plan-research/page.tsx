import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  Calculator,
  ExternalLink,
  HeartPulse,
  MapPin,
  PiggyBank,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildResearchPageGraph } from '@/lib/seo/research-seo';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { FlagshipPlanResearch } from '@/components/marketplace/flagship-plan-research';
import { isMarketplaceApiConfigured } from '@/lib/marketplace/client';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

const PATH = '/tools/marketplace-plan-research';
const TITLE =
  'Research Marketplace Plans Near You — Local ACA Landscape | Insurance Trust Hub';
const DESCRIPTION =
  'Independent local ACA Marketplace plan research by ZIP: plan counts, issuer landscape, lower-premium vs more protective paths, and assistance context. Educational only — verify and enroll on HealthCare.gov. No lead selling.';

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const FAQ = [
  {
    q: 'Is this HealthCare.gov?',
    a: 'No. Insurance Trust Hub is an independent research site. Official plan availability, prices, subsidies, and enrollment are only determined on HealthCare.gov or your state marketplace.',
  },
  {
    q: 'Where do the plan numbers come from?',
    a: 'When configured, we call the CMS Marketplace API for your ZIP and household inputs and show a local landscape (counts, premium ranges, sample paths). If the API is unavailable, we say so and fall back to educational models on related planners — we do not invent plans.',
  },
  {
    q: 'Can I enroll here?',
    a: 'No. This page does not process applications or sell policies. Use HealthCare.gov (or your state exchange) for official next steps.',
  },
  {
    q: 'Do you sell my information?',
    a: 'No lead selling. Optional Save to My Insurance stores a research summary in your workspace when you choose to save — not a quote funnel.',
  },
] as const;

export default function MarketplacePlanResearchPage() {
  const apiReady = isMarketplaceApiConfigured();
  const jsonLd = buildResearchPageGraph({
    path: PATH,
    name: 'Research Marketplace plans near you',
    description: DESCRIPTION,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Research tools', path: '/tools' },
      { name: 'Marketplace plan research', path: PATH },
    ],
    includeToolSchema: true,
    faqs: FAQ.map((f) => ({ question: f.q, answer: f.a })),
  });

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/40">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname={PATH}
            currentLabel="Marketplace plan research"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Flagship · Plan year {MARKETPLACE_PLAN_YEAR_DEFAULT}
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Research Marketplace plans near you
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            See what the local ACA Marketplace landscape looks like for your ZIP — plan volume,
            issuer context, and lower-premium vs more protective research paths — before you go to
            HealthCare.gov.
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-[#0284C7]/30 bg-white/80 px-3 py-2 text-sm text-[#0A2540]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Independent educational research — not HealthCare.gov, not enrollment, no lead selling.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden />
              No lead selling
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              CMS Marketplace data when available
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              Verify on HealthCare.gov
            </span>
          </div>
          {!apiReady ? (
            <p className="mt-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <strong>Server note:</strong> Marketplace API key is not configured here. The tool
              will show an honest empty or fallback state — we never invent plan premiums.
            </p>
          ) : null}
        </div>
      </div>

      {/* Interactive module */}
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <FlagshipPlanResearch />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="container mx-auto max-w-3xl space-y-12 px-4 py-12 md:py-16">
          {/* How this helps */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How this helps</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <li>
                <strong className="text-slate-800">Local landscape first.</strong> Understand roughly
                how many plans and issuers CMS lists for your ZIP before drowning in a full catalog.
              </li>
              <li>
                <strong className="text-slate-800">Cheap vs protective paths.</strong> See
                educational examples of lower-premium vs more protective metal-style options when
                data is available.
              </li>
              <li>
                <strong className="text-slate-800">Assistance context.</strong> Optional income helps
                frame premium tax credit education — not an official award.
              </li>
              <li>
                <strong className="text-slate-800">Clear handoff.</strong> Official shopping and
                enrollment stay on HealthCare.gov (or your state marketplace).
              </li>
            </ul>
          </section>

          {/* Methodology */}
          <section id="methodology" className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-slate-900">Methodology &amp; provenance</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-800">From the CMS Marketplace API</strong> (when{' '}
                <code className="text-xs">MARKETPLACE_API_KEY</code> is configured server-side):
                county resolution by ZIP, individual-market plan search for your household inputs,
                metal levels, premiums, and deductible/MOOP fields when the API returns them.
              </p>
              <p>
                <strong className="text-slate-800">Still estimated or educational:</strong> premium
                tax credit framing, total-cost scenarios on related planners, and any bands applied
                for display. Path cards pick deterministic examples (lowest Bronze, median Silver,
                lowest Gold when present) — not a ranked recommendation.
              </p>
              <p>
                <strong className="text-slate-800">We never claim:</strong> official eligibility,
                guaranteed plan inventory completeness, network adequacy, or that a listed premium is
                your final price after credits.
              </p>
              <p>
                <strong className="text-slate-800">Final source of truth:</strong> HealthCare.gov or
                your state marketplace for availability, pricing, subsidies, and enrollment. See also{' '}
                <Link href="/methodology" className="font-medium text-[#0284C7] hover:underline">
                  site methodology
                </Link>
                .
              </p>
            </div>
          </section>

          {/* Local guides */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Local Marketplace guides</h2>
            <p className="mt-2 text-sm text-slate-600">
              State and metro research articles that deep-link into this tool.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              <li>
                <Link
                  href="/guides/florida-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Florida
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/miami-dade-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Miami-Dade
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/broward-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Broward
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/palm-beach-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Palm Beach
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/texas-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Texas
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/houston-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Houston
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/dallas-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Dallas
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/georgia-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Georgia
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/atlanta-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Atlanta
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/north-carolina-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  North Carolina
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/charlotte-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Charlotte
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/research-triangle-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Research Triangle
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/pennsylvania-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Pennsylvania
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/philadelphia-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Philadelphia
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/pittsburgh-aca-marketplace"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  Pittsburgh
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700"
                >
                  All guides
                </Link>
              </li>
            </ul>
          </section>

          {/* Related tools */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Related research tools</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <Related
                href="/tools/cost-estimator"
                icon={Calculator}
                title="Cost & Coverage Planner"
                detail="Total annual cost paths with care-use assumptions"
              />
              <Related
                href="/calculators/aca-subsidy"
                icon={PiggyBank}
                title="ACA Coverage & Savings Planner"
                detail="PTC / CSR education and 400% FPL cliff context"
              />
              <Related
                href="/tools/aca-plan-explorer"
                icon={Scale}
                title="Live ACA Plan Explorer"
                detail="Fuller plan list and optional doctor/Rx research signals"
              />
              <Related
                href="/data/plan-complaint-index"
                icon={HeartPulse}
                title="Medicare Plan Complaint Index"
                detail="CMS complaint signals (Medicare — separate from ACA)"
              />
              <Related
                href="/data/counties"
                icon={MapPin}
                title="County Medicare dashboards"
                detail="Enrollment and contract context by county"
              />
              <Related
                href="/tools/license-verification"
                icon={ShieldCheck}
                title="License verification"
                detail="Research state license pathways for agents"
              />
            </ul>
          </section>

          {/* Soft agent path */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Want human help later?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Browse verified local specialists when you are ready — no forced lead form from this
              page. Confirm licenses on your state DOI site.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/hubs/aca" className="font-medium text-[#0284C7] hover:underline">
                ACA specialists
              </Link>
              <Link href="/directory" className="font-medium text-[#0284C7] hover:underline">
                Agency directory
              </Link>
              <a
                href="https://www.healthcare.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
              >
                HealthCare.gov
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900">FAQ</h2>
            <dl className="mt-4 space-y-4">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
                  <dt className="font-semibold text-slate-900">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <DisclaimerBanner />
    </>
  );
}

function Related({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/20"
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0284C7]" aria-hidden />
        <span>
          <span className="font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{detail}</span>
        </span>
      </Link>
    </li>
  );
}
