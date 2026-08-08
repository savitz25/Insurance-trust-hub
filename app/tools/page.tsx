import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Calculator,
  ClipboardCheck,
  Compass,
  HeartPulse,
  Home,
  MapPin,
  PiggyBank,
  Scale,
  ShieldCheck,
  Stethoscope,
  Truck,
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
    'Insurance Research Center: estimate costs, check ACA subsidies, research Medicare, verify providers and licenses — no paid placements, no lead selling.',
  path: '/tools',
});

function fromTools(href: string) {
  return withReturnContext(href, '/tools');
}

const INTENTS = [
  {
    href: '/calculators/aca-subsidy',
    icon: HeartPulse,
    title: 'Shopping for health insurance',
    detail: 'Will I qualify for help — and what might coverage cost locally?',
    cta: 'ACA Coverage & Savings Planner',
  },
  {
    href: '/tools/medicare-plan-finder',
    icon: Stethoscope,
    title: 'Researching Medicare',
    detail: 'Complaints, county markets, and whether doctors show FFS participation',
    cta: 'Medicare research path',
  },
  {
    href: '/tools/cost-estimator',
    icon: Scale,
    title: 'Understanding costs & subsidies',
    detail: 'Premium + expected out-of-pocket total annual cost scenarios',
    cta: 'Cost & Coverage Planner',
  },
  {
    href: '/tools/medicare-provider-lookup',
    icon: Users,
    title: 'Verifying a doctor or agent',
    detail: 'CMS provider signals or official state license lookup',
    cta: 'Provider lookup',
    secondaryHref: '/tools/license-verification',
    secondaryLabel: 'Agent license verification',
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
      'Household, income, and care-use scenarios → total annual cost paths (not premium-only). Educational estimates — never a sales funnel.',
    time: '~3–5 min',
  },
  {
    href: '/tools/aca-plan-explorer',
    icon: Compass,
    badge: 'P1 · Live Coverage Intelligence',
    title: 'Live ACA Plan Explorer',
    question:
      'Which Marketplace plans are available — and what might they cost me for the year?',
    description:
      'Research CMS Marketplace plans by ZIP and ages, compare estimated yearly cost, check doctor/Rx match, then open Plan X-Ray or county intelligence. Research only; no lead form.',
    time: '~3–8 min',
  },
  {
    href: '/calculators/aca-subsidy',
    icon: PiggyBank,
    badge: 'Flagship · PTC / CSR education',
    title: 'ACA Coverage & Savings Planner',
    question: 'Will I qualify for a Marketplace subsidy — and what does that mean where I live?',
    description:
      'ZIP, ages, and income → premium tax credit ranges, CSR alerts, 400% FPL cliff education, and local net-cost paths. Educational assistance path.',
    time: '~2–4 min',
  },
  {
    href: '/tools/medicare-plan-finder',
    icon: Compass,
    badge: 'Flagship path · Medicare Research',
    title: 'Medicare Research Center path',
    question: 'How do I research Medicare without plan-selling pressure?',
    description:
      'Situation router into Plan Complaint Index, county dashboards, provider lookup, and verified agents — not a quoting tool.',
    time: '~1–3 min to orient',
    links: [
      { href: '/data/plan-complaint-index', label: 'Complaint Index' },
      { href: '/data/counties', label: 'County dashboards' },
      { href: '/tools/medicare-provider-lookup', label: 'Provider lookup' },
    ],
  },
] as const;

const QUICK_TOOLS = [
  {
    href: '/marketplace',
    icon: Compass,
    title: 'County ACA intelligence',
    purpose:
      'Curated county Marketplace snapshots (issuers, metal mix, premium ranges) from CMS plan data.',
    bestFor: 'Local market research before Explorer',
    time: '~2–4 min',
  },
  {
    href: '/tools/aca-plan-explorer#doctors',
    icon: Stethoscope,
    title: 'Doctor network checker (ACA)',
    purpose:
      'Add doctors inside Plan Explorer — CMS-reported in-network signals on candidate plans.',
    bestFor: 'Marketplace plan research with your providers',
    time: '~3–5 min',
  },
  {
    href: '/tools/aca-plan-explorer#prescriptions',
    icon: HeartPulse,
    title: 'Prescription coverage checker (ACA)',
    purpose:
      'Add medications inside Plan Explorer — CMS formulary reported-covered / unknown states.',
    bestFor: 'Comparing drug signals across Marketplace plans',
    time: '~3–5 min',
  },
  {
    href: '/tools/medicare-provider-lookup',
    icon: Users,
    title: 'Does my doctor accept Medicare?',
    purpose: 'Name or NPI search against CMS PPEF and Opt Out records.',
    bestFor: 'Checking FFS participation signals',
    time: '~1 min',
  },
  {
    href: '/tools/license-verification',
    icon: ShieldCheck,
    title: 'Verify an agent’s license',
    purpose: 'Reach official state DOI lookups with consent before you leave.',
    bestFor: 'Confirming state producer license',
    time: '~2 min',
  },
  {
    href: '/data/plan-complaint-index',
    icon: BarChart3,
    title: 'Plan Complaint Index',
    purpose: 'CMS complaint rates for MA / Part D contracts — transparent methodology.',
    bestFor: 'Comparing government complaint signals',
    time: '~5–10 min',
  },
  {
    href: '/data/counties',
    icon: MapPin,
    title: 'County Medicare dashboards',
    purpose: 'Enrollment and quality context by county (South Florida live).',
    bestFor: 'Local market snapshots',
    time: '~3–5 min',
  },
  {
    href: '/tools/needs-assessment',
    icon: ClipboardCheck,
    title: 'Coverage Compass',
    purpose: 'Short guided pathfinder when you are not sure where to start.',
    bestFor: 'Pathfinding / first session',
    time: '~60–90 sec',
  },
  {
    href: '/calculators',
    icon: Calculator,
    title: 'All calculators',
    purpose: 'Educational premium ranges and related helpers.',
    bestFor: 'Quick ballpark references',
    time: 'Varies',
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
    detail: 'Doctors & licenses',
    href: '/tools/medicare-provider-lookup',
    label: 'Provider lookup',
  },
  {
    step: 'Decide',
    detail: 'Human help if needed',
    href: '/hubs/aca',
    label: 'Verified agents',
  },
] as const;

const SITUATIONS = [
  {
    icon: HeartPulse,
    title: 'Turning 65 / new to Medicare',
    routes: [
      { href: '/tools/medicare-plan-finder', label: 'Medicare research guide' },
      { href: '/tools/medicare-provider-lookup', label: 'Provider lookup' },
    ],
  },
  {
    icon: Briefcase,
    title: 'Lost employer coverage',
    routes: [
      { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
      { href: '/tools/cost-estimator', label: 'Cost Planner' },
    ],
  },
  {
    icon: Home,
    title: 'Self-employed / no employer plan',
    routes: [
      { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
      { href: '/hubs/aca', label: 'ACA specialists' },
    ],
  },
  {
    icon: Truck,
    title: 'Moving or new state',
    routes: [
      { href: '/tools/cost-estimator', label: 'Cost Planner' },
      { href: '/data/counties', label: 'County dashboards' },
    ],
  },
  {
    icon: Compass,
    title: 'Just researching',
    routes: [
      { href: '/tools/needs-assessment', label: 'Coverage Compass' },
      { href: '/data/plan-complaint-index', label: 'Complaint Index' },
    ],
  },
  {
    icon: Scale,
    title: 'Reviewing costs or subsidies',
    routes: [
      { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
      { href: '/tools/cost-estimator', label: 'Cost Planner' },
    ],
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
      {/* HERO */}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/40">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <ContextNav pathname="/tools" className="mb-5" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            Central research hub
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Insurance Research Center
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-700 md:text-xl">
            What are you trying to figure out?
          </p>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600">
            Estimate costs, understand subsidies, research Medicare, and verify providers or agents —
            with public data and independent tools. No paid placements. No lead-selling phone funnels.
          </p>
          <p className="mt-4 max-w-2xl rounded-xl border border-[#0284C7]/30 bg-white/90 px-3 py-2 text-sm text-[#0A2540]">
            These tools produce estimates and research guidance — never invented license statuses or
            guaranteed plan awards.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Recently updated · Complaint Index {complaintMeta.dataVintage} · {complaintSynced}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Provider PPEF · {providerMeta.dataVintage} · {providerSynced}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              ACA · plan year {ACA_SAVINGS_META.planYear}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-16 px-4 py-10 md:py-14">
        {/* START HERE */}
        <section aria-labelledby="start-here">
          <h2 id="start-here" className="text-xl font-semibold text-slate-900">
            Start here
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Intent first — not a menu of equal product names.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {INTENTS.map((intent) => (
              <div
                key={intent.title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
                  <intent.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{intent.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{intent.detail}</p>
                <Link
                  href={fromTools(intent.href)}
                  className="mt-4 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold text-[#0284C7] hover:underline"
                >
                  {intent.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                {'secondaryHref' in intent && intent.secondaryHref ? (
                  <Link
                    href={fromTools(intent.secondaryHref)}
                    className="mt-1 text-xs font-medium text-slate-500 hover:text-[#0284C7] hover:underline"
                  >
                    {intent.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* FEATURED TOOLS */}
        <section aria-labelledby="featured">
          <h2 id="featured" className="text-xl font-semibold text-slate-900">
            Featured tools
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Product-level depth. One clear primary ACA savings path — not three competing widgets.
          </p>
          <div className="mt-6 space-y-4">
            {FLAGSHIPS.map((tool) => (
              <article
                key={tool.href}
                className="rounded-2xl border border-[#0284C7]/30 bg-gradient-to-br from-white via-white to-[#E0F2FE]/40 p-5 shadow-sm md:p-7"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#0284C7] px-2.5 py-0.5 text-xs font-semibold text-white">
                        {tool.badge}
                      </span>
                      <span className="text-xs text-slate-500">{tool.time}</span>
                    </div>
                    <h3 className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-900">
                      <tool.icon className="h-5 w-5 shrink-0 text-[#0284C7]" aria-hidden />
                      {tool.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#1E293B]">{tool.question}</p>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                      {tool.description}
                    </p>
                    {'links' in tool && tool.links ? (
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {tool.links.map((l) => (
                          <li key={l.href}>
                            <Link
                              href={fromTools(l.href)}
                              className="font-medium text-[#0284C7] hover:underline"
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
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A8A]"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* QUICK TOOLS */}
        <section aria-labelledby="quick-tools">
          <h2 id="quick-tools" className="text-xl font-semibold text-slate-900">
            Quick tools
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Supporting utilities — clear purpose, not equal to flagships.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_TOOLS.map((tool) => (
              <div
                key={tool.href}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <tool.icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{tool.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{tool.purpose}</p>
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Best for:</span> {tool.bestFor}
                </p>
                <p className="text-xs text-slate-400">{tool.time}</p>
                <Link
                  href={fromTools(tool.href)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0284C7] hover:underline"
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* RESEARCH JOURNEY */}
        <section aria-labelledby="journey">
          <h2 id="journey" className="text-xl font-semibold text-slate-900">
            Research journey
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Understand → Estimate → Explore → Verify → Decide
          </p>
          <ol className="mt-6 grid gap-2 sm:grid-cols-5">
            {JOURNEY.map((j, i) => (
              <li key={j.step}>
                <Link
                  href={fromTools(j.href)}
                  className={cn(
                    'flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition-colors',
                    'hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/30'
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-[#0284C7]">
                    {i + 1}. {j.step}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-slate-900">{j.label}</span>
                  <span className="mt-0.5 text-xs text-slate-500">{j.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* LIFE SITUATIONS */}
        <section aria-labelledby="situations">
          <h2 id="situations" className="text-xl font-semibold text-slate-900">
            Tools by life situation
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Common moments — each routes to the best 1–2 tools, not a full inventory dump.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SITUATIONS.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-[#0284C7]" aria-hidden />
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {s.routes.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={fromTools(r.href)}
                        className="font-medium text-[#0284C7] hover:underline"
                      >
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* DATA & TRUST */}
        <section
          aria-labelledby="data-trust"
          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-7"
        >
          <h2 id="data-trust" className="text-xl font-semibold text-slate-900">
            Where our data comes from
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            <li>
              <strong className="font-medium text-slate-800">CMS public files</strong> — Star Ratings
              complaint measures, PPEF / Opt Out for provider participation, CPSC enrollment for
              county dashboards (vintages shown above).
            </li>
            <li>
              <strong className="font-medium text-slate-800">State insurance departments</strong> —
              official producer license lookups (we route you there; we do not scrape or invent
              status).
            </li>
            <li>
              <strong className="font-medium text-slate-800">Educational reconstructions</strong> —
              Marketplace premium baselines and FPL math for cost/subsidy planners are labeled
              estimates, not official awards.
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            <strong className="font-medium text-slate-800">Independence:</strong> no paid placements
            and no lead-selling quote funnels on these research tools. Official enrollment remains
            with Medicare.gov, HealthCare.gov (or your state marketplace), and licensed
            professionals.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Overlapping ACA eligibility / “quote comparison” entry points redirect to the ACA Savings
            Planner or Cost Planner so you get one clear path.
          </p>
        </section>

        {/* FIND A VERIFIED AGENT */}
        <section
          aria-labelledby="agents-cta"
          className="rounded-2xl border border-[#0284C7]/30 bg-gradient-to-br from-[#E0F2FE]/80 to-white p-6 md:p-8"
        >
          <h2 id="agents-cta" className="text-xl font-semibold text-slate-900">
            Find a verified agent
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            When research is done and you want licensed human help, browse directories — no forced
            lead form from this page.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={fromTools('/hubs/aca')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-5 text-sm font-semibold text-white hover:bg-[#1E3A8A]"
            >
              ACA specialists
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={fromTools('/hubs/medicare')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-[#0284C7]/40"
            >
              Medicare specialists
            </Link>
            <Link
              href={fromTools('/directory')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-[#0284C7]/40"
            >
              Full directory
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
