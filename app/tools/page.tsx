import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  ClipboardCheck,
  Compass,
  HeartPulse,
  MapPin,
  PiggyBank,
  Scale,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { withReturnContext } from '@/lib/navigation/context-nav';
import { ContextNav } from '@/components/context-nav';
import { CMS_COMPLAINT_DATASET_META } from '@/lib/insurance/cms/complaint-rankings';
import { getProviderSearchMeta } from '@/lib/insurance/cms/provider-search';
import { ACA_SAVINGS_META } from '@/lib/tools/aca-subsidy-planner';
import { cn } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Research Center — Cost, Subsidy & Medicare Tools',
  description:
    'What are you trying to figure out? Estimate costs, check ACA subsidies, research Medicare, verify providers and licenses — no paid placements, no lead selling.',
  path: '/tools',
});

function fromTools(href: string) {
  return withReturnContext(href, '/tools');
}

const INTENTS = [
  {
    href: '/calculators/aca-subsidy',
    icon: HeartPulse,
    title: 'I’m shopping for health insurance',
    detail: 'Subsidy eligibility, CSR, and local Marketplace cost context',
    cta: 'Start with ACA Savings Planner',
  },
  {
    href: '/tools/medicare-plan-finder',
    icon: Stethoscope,
    title: 'I’m researching Medicare',
    detail: 'Complaint rates, county markets, and doctor participation',
    cta: 'Open Medicare research path',
  },
  {
    href: '/tools/cost-estimator',
    icon: Scale,
    title: 'I want to understand my costs',
    detail: 'Premium + expected out-of-pocket total annual cost scenarios',
    cta: 'Open Cost & Coverage Planner',
  },
  {
    href: '/tools/medicare-provider-lookup',
    icon: Users,
    title: 'I want to verify a doctor or agent',
    detail: 'CMS provider lookup or official state license verification',
    cta: 'Choose verification path',
    secondaryHref: '/tools/license-verification',
    secondaryLabel: 'Or verify an agent license',
  },
] as const;

const FLAGSHIPS = [
  {
    href: '/tools/cost-estimator',
    icon: Calculator,
    badge: 'Flagship',
    title: 'Insurance Cost & Coverage Planner',
    question: 'What could health coverage really cost me for the year?',
    description:
      'Household, income, and care-use scenarios → total annual cost paths (not premium-only). Educational estimates only.',
  },
  {
    href: '/calculators/aca-subsidy',
    icon: PiggyBank,
    badge: 'Flagship',
    title: 'ACA Coverage & Savings Planner',
    question: 'Will I qualify for a Marketplace subsidy — and what does that mean locally?',
    description:
      'ZIP, ages, and income → premium tax credit ranges, CSR alerts, 400% FPL cliff education, and net-cost paths.',
  },
  {
    href: '/tools/medicare-plan-finder',
    icon: Compass,
    badge: 'Flagship path',
    title: 'Medicare research path',
    question: 'How do I research Medicare Advantage, Medigap, and local quality without sales pressure?',
    description:
      'Situation router into Plan Complaint Index, county dashboards, provider lookup, and verified agents — not a plan quoting tool.',
    links: [
      { href: '/data/plan-complaint-index', label: 'Complaint Index' },
      { href: '/data/counties', label: 'County dashboards' },
      { href: '/tools/medicare-provider-lookup', label: 'Provider lookup' },
    ],
  },
] as const;

const JOURNEY = [
  {
    step: 'Understand',
    detail: 'Clarify your situation',
    href: '/tools/needs-assessment',
    label: 'Coverage Compass',
  },
  {
    step: 'Estimate',
    detail: 'Model costs & assistance',
    href: '/tools/cost-estimator',
    label: 'Cost Planner',
  },
  {
    step: 'Explore',
    detail: 'Local & CMS context',
    href: '/data/plan-complaint-index',
    label: 'Complaint Index',
  },
  {
    step: 'Verify',
    detail: 'Doctors, licenses, standing',
    href: '/tools/medicare-provider-lookup',
    label: 'Provider lookup',
  },
  {
    step: 'Decide',
    detail: 'Licensed human help if needed',
    href: '/hubs/aca',
    label: 'Verified agents',
  },
] as const;

const SUPPORTING = [
  {
    href: '/tools/needs-assessment',
    icon: ClipboardCheck,
    title: 'Coverage Compass',
    description: 'Short guided path when you are not sure where to start.',
  },
  {
    href: '/tools/medicare-provider-lookup',
    icon: Stethoscope,
    title: 'Medicare provider lookup',
    description: 'Search by doctor or organization name against CMS PPEF / Opt Out data.',
  },
  {
    href: '/data/plan-complaint-index',
    icon: BarChart3,
    title: 'Plan Complaint Index',
    description: 'CMS complaint rates for MA / Part D contracts — transparent methodology.',
  },
  {
    href: '/data/counties',
    icon: MapPin,
    title: 'County Medicare dashboards',
    description: 'Enrollment and quality context by county (South Florida live).',
  },
  {
    href: '/tools/license-verification',
    icon: ShieldCheck,
    title: 'License verification hub',
    description: 'Official state DOI lookups with consent before you leave our site.',
  },
  {
    href: '/calculators',
    icon: Calculator,
    title: 'All calculators',
    description: 'Premium ranges, Medicare gap notes, and related educational tools.',
  },
] as const;

export default function ToolsPage() {
  const complaintMeta = CMS_COMPLAINT_DATASET_META;
  const providerMeta = getProviderSearchMeta();
  const complaintSynced = new Date(complaintMeta.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const providerSynced = new Date(providerMeta.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      {/* Hero */}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/40">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <ContextNav pathname="/tools" className="mb-5" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Insurance Research Center
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            What are you trying to figure out?
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Estimate costs, check subsidies, research Medicare, verify providers, and make better
            decisions — with no paid placements and no lead selling.
          </p>
          <p className="mt-4 max-w-2xl rounded-xl border border-teal-200/80 bg-white/80 px-3 py-2 text-sm text-teal-900">
            These tools produce estimates and research guidance — never phone-number quote funnels.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Complaint Index · {complaintMeta.dataVintage} · synced {complaintSynced}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Provider lookup · {providerMeta.dataVintage} · {providerSynced}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              ACA planner · plan year {ACA_SAVINGS_META.planYear}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-16 px-4 py-10 md:py-14">
        {/* Intent cards */}
        <section aria-labelledby="start-here">
          <h2 id="start-here" className="text-xl font-semibold text-slate-900">
            Start here
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick the question that matches you — we will route you to the best tool path.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {INTENTS.map((intent) => (
              <div
                key={intent.title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                  <intent.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{intent.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{intent.detail}</p>
                <Link
                  href={fromTools(intent.href)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline"
                >
                  {intent.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                {'secondaryHref' in intent && intent.secondaryHref ? (
                  <Link
                    href={fromTools(intent.secondaryHref)}
                    className="mt-1 text-xs font-medium text-slate-500 hover:text-teal-800 hover:underline"
                  >
                    {intent.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Journey */}
        <section aria-labelledby="journey">
          <h2 id="journey" className="text-xl font-semibold text-slate-900">
            The research journey
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Understand → Estimate → Explore → Verify → Decide — a system, not isolated widgets.
          </p>
          <ol className="mt-6 grid gap-2 sm:grid-cols-5">
            {JOURNEY.map((j, i) => (
              <li key={j.step} className="relative">
                <Link
                  href={fromTools(j.href)}
                  className={cn(
                    'flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition-colors',
                    'hover:border-teal-300 hover:bg-teal-50/30'
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    {i + 1}. {j.step}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-slate-900">{j.label}</span>
                  <span className="mt-0.5 text-xs text-slate-500">{j.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Flagships */}
        <section aria-labelledby="flagships">
          <h2 id="flagships" className="text-xl font-semibold text-slate-900">
            Flagship tools
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Product-level depth — start here for most serious research sessions.
          </p>
          <div className="mt-6 space-y-4">
            {FLAGSHIPS.map((tool) => (
              <article
                key={tool.href}
                className="rounded-2xl border border-teal-200/70 bg-gradient-to-br from-white via-white to-teal-50/40 p-5 shadow-sm md:p-7"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {tool.badge}
                      </span>
                      <tool.icon className="h-4 w-4 text-teal-800" aria-hidden />
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">{tool.title}</h3>
                    <p className="mt-1 text-sm font-medium text-teal-900/90">{tool.question}</p>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                      {tool.description}
                    </p>
                    {'links' in tool && tool.links ? (
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {tool.links.map((l) => (
                          <li key={l.href}>
                            <Link
                              href={fromTools(l.href)}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <Link
                    href={fromTools(tool.href)}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                  >
                    Open tool
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Supporting */}
        <section aria-labelledby="supporting">
          <h2 id="supporting" className="text-xl font-semibold text-slate-900">
            Supporting &amp; quick tools
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Utilities and deep links that complete the journey. Overlapping ACA subsidy widgets are
            consolidated into the ACA Coverage &amp; Savings Planner.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTING.map((tool) => (
              <Link
                key={tool.href}
                href={fromTools(tool.href)}
                className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/20"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <tool.icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{tool.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-6 text-sm text-slate-600">
          <p>
            <strong className="font-semibold text-slate-800">Canonical ACA assistance tool:</strong>{' '}
            <Link href={fromTools('/calculators/aca-subsidy')} className="font-medium text-teal-700 hover:underline">
              ACA Coverage &amp; Savings Planner
            </Link>
            . Older “eligibility checker” and generic “quote comparison” entry points redirect here
            or to the Cost Planner so you are not asked to choose among three overlapping products.
          </p>
        </section>
      </div>
    </>
  );
}
