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
import { ResearchQuestions } from '@/components/research-questions';
import { RecommendedResearchPath } from '@/components/recommended-research-path';
import { CMS_COMPLAINT_DATASET_META } from '@/lib/insurance/cms/complaint-rankings';
import { getProviderSearchMeta } from '@/lib/insurance/cms/provider-search';
import { ACA_SAVINGS_META } from '@/lib/tools/aca-subsidy-planner';
import {
  FLAGSHIP_RESEARCH_TOOLS,
  RESEARCH_QUESTIONS,
} from '@/lib/product/research-ia';
import { cn } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Research Center — Need, options & verification',
  description:
    'Insurance Research Center organized around three questions: what coverage you need, what options exist where you live, and how to verify. Marketplace tools, ACA planners, Medicare intelligence, Complaint Index — no lead selling.',
  path: '/tools',
});

function fromTools(href: string) {
  return withReturnContext(href, '/tools');
}

const FLAGSHIP_ICONS = {
  '/tools/marketplace-plan-research': MapPin,
  '/calculators/aca-subsidy': PiggyBank,
  '/tools/cost-estimator': Calculator,
  '/data/plan-complaint-index': BarChart3,
} as const;

const QUICK_BY_QUESTION = {
  need: [
    {
      href: '/tools/coverage-compass',
      icon: ClipboardCheck,
      title: 'Coverage Compass',
      purpose: 'Short pathfinder when you are not sure where to start.',
    },
    {
      href: '/medicare',
      icon: Stethoscope,
      title: 'Medicare research hub',
      purpose: 'CMS-backed path separate from ACA Marketplace tools.',
    },
    {
      href: '/guides',
      icon: Compass,
      title: 'ACA Marketplace guides',
      purpose: 'State and metro educational guides into live ZIP tools.',
    },
  ],
  options: [
    {
      href: '/marketplace',
      icon: MapPin,
      title: 'County ACA intelligence',
      purpose: 'Curated county Marketplace snapshots from CMS plan data.',
    },
    {
      href: '/carriers',
      icon: Briefcase,
      title: 'Carrier intelligence',
      purpose: 'Organization-level public-data rollups — not sales rankings.',
    },
    {
      href: '/data/counties',
      icon: MapPin,
      title: 'County Medicare dashboards',
      purpose: 'Enrollment and quality context by county.',
    },
    {
      href: '/hubs',
      icon: Home,
      title: 'Market hubs',
      purpose: 'Local research pages — verified agencies only when inventory is real.',
    },
    {
      href: '/directory?verified=true',
      icon: Users,
      title: 'Verified agency directory',
      purpose: 'FL, TX, OH, NV, and VT research listings. Empty markets stay empty.',
    },
    {
      href: '/tools/aca-plan-explorer',
      icon: Compass,
      title: 'Live ACA Plan Explorer',
      purpose: 'Deeper CMS plan table — start with Marketplace plan research first.',
    },
  ],
  verify: [
    {
      href: '/tools/license-verification',
      icon: ShieldCheck,
      title: 'License verification',
      purpose: 'Official state DOI lookups with consent before you leave.',
    },
    {
      href: '/tools/medicare-provider-lookup',
      icon: Users,
      title: 'Medicare provider lookup',
      purpose: 'CMS PPEF / Opt Out participation signals.',
    },
    {
      href: '/methodology',
      icon: Scale,
      title: 'Research methodology',
      purpose: 'How we define verified inventory and public signals.',
    },
    {
      href: '/calculators',
      icon: Calculator,
      title: 'All calculators',
      purpose: 'Educational premium ranges and related helpers.',
    },
  ],
} as const;

const SITUATIONS = [
  {
    icon: HeartPulse,
    title: 'Turning 65 / new to Medicare',
    routes: [
      { href: '/tools/medicare-plan-finder', label: 'Medicare research guide' },
      { href: '/tools/medicare-provider-lookup', label: 'Provider lookup' },
      { href: '/data/plan-complaint-index', label: 'Complaint Index' },
    ],
  },
  {
    icon: Briefcase,
    title: 'Lost employer coverage',
    routes: [
      { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
      { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
      { href: '/tools/cost-estimator', label: 'Cost Planner' },
    ],
  },
  {
    icon: Home,
    title: 'Self-employed / no employer plan',
    routes: [
      { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
      { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
      { href: '/guides', label: 'Local ACA guides' },
    ],
  },
  {
    icon: Truck,
    title: 'Moving or new state',
    routes: [
      { href: '/tools/marketplace-plan-research', label: 'Marketplace research' },
      { href: '/tools/cost-estimator', label: 'Cost Planner' },
      { href: '/data/counties', label: 'County dashboards' },
    ],
  },
  {
    icon: Compass,
    title: 'Just researching',
    routes: [
      { href: '/tools/coverage-compass', label: 'Coverage Compass' },
      { href: '/data/plan-complaint-index', label: 'Complaint Index' },
      { href: '/methodology', label: 'Methodology' },
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
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/40">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <ContextNav pathname="/tools" className="mb-5" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            Research Center
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Insurance research, organized by the questions you actually have
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600">
            What coverage do you need? What options exist where you live? How do you verify what
            you&apos;re being sold? Independent tools on public data — no paid placements, no
            lead-selling funnels.
          </p>
          <p className="mt-4 max-w-2xl rounded-xl border border-[#0284C7]/30 bg-white/90 px-3 py-2 text-sm text-[#0A2540]">
            Estimates and research guidance only. Official enrollment stays on HealthCare.gov, state
            Marketplaces, Medicare.gov, and licensed professionals you choose.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Complaint Index {complaintMeta.dataVintage} · {complaintSynced}
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
        <RecommendedResearchPath linkFrom={fromTools} />

        {/* THREE QUESTIONS */}
        <section aria-labelledby="three-questions">
          <h2 id="three-questions" className="text-xl font-semibold text-slate-900">
            Start with a question
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Same product map as the homepage — pick a path, then go deeper.
          </p>
          <div className="mt-6">
            <ResearchQuestions variant="full" linkFrom={fromTools} />
          </div>
        </section>

        {/* FLAGSHIPS */}
        <section aria-labelledby="flagships">
          <h2 id="flagships" className="text-xl font-semibold text-slate-900">
            Featured research tools
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Four flagships. ACA Savings Planner and Cost Planner are two views of cost and
            assistance — not competing quote tools.
          </p>
          <div className="mt-6 space-y-4">
            {FLAGSHIP_RESEARCH_TOOLS.map((tool) => {
              const Icon =
                FLAGSHIP_ICONS[tool.href as keyof typeof FLAGSHIP_ICONS] ?? Calculator;
              return (
                <article
                  key={tool.href}
                  className="rounded-2xl border border-[#0284C7]/30 bg-gradient-to-br from-white via-white to-[#E0F2FE]/40 p-5 shadow-sm md:p-7"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                        <Icon className="h-5 w-5 shrink-0 text-[#0284C7]" aria-hidden />
                        {tool.title}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-[#1E293B]">{tool.question}</p>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                        {tool.description}
                      </p>
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
              );
            })}
          </div>
        </section>

        {/* GROUPED BY QUESTION */}
        {RESEARCH_QUESTIONS.map((q) => {
          const tools = QUICK_BY_QUESTION[q.id];
          return (
            <section key={q.id} aria-labelledby={`section-${q.id}`}>
              <h2 id={`section-${q.id}`} className="text-xl font-semibold text-slate-900">
                {q.number}. {q.shortTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{q.description}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <div
                    key={tool.href}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <tool.icon className="h-4 w-4" aria-hidden />
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-900">{tool.title}</h3>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">
                      {tool.purpose}
                    </p>
                    <Link
                      href={fromTools(tool.href)}
                      className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#0284C7] hover:underline"
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* LIFE SITUATIONS */}
        <section aria-labelledby="situations">
          <h2 id="situations" className="text-xl font-semibold text-slate-900">
            Tools by life situation
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Common moments — each routes to the best tools, not a full inventory dump.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SITUATIONS.map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-4">
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
              <strong className="font-medium text-slate-800">CMS public files</strong> — complaint
              measures, PPEF / Opt Out, enrollment context (vintages shown above).
            </li>
            <li>
              <strong className="font-medium text-slate-800">State insurance departments</strong> —
              official producer license lookups (we route you there; we do not invent status).
            </li>
            <li>
              <strong className="font-medium text-slate-800">Educational reconstructions</strong> —
              Marketplace premium baselines and FPL math are labeled estimates, not official awards.
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            <strong className="font-medium text-slate-800">Independence:</strong> no paid placements
            and no lead-selling quote funnels. My Insurance is a private save layer — not a lead
            marketplace.
          </p>
        </section>

        {/* VERIFIED DIRECTORY — honest soft path */}
        <section
          aria-labelledby="agents-cta"
          className="rounded-2xl border border-[#0284C7]/30 bg-gradient-to-br from-[#E0F2FE]/80 to-white p-6 md:p-8"
        >
          <h2 id="agents-cta" className="text-xl font-semibold text-slate-900">
            Verified agency research listings
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            When research is done and you want licensed human help, browse directories that meet our
            verified research standard. Empty markets stay empty — we will not invent inventory or
            force a quote funnel.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={fromTools('/directory?verified=true')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-5 text-sm font-semibold text-white hover:bg-[#1E3A8A]"
            >
              Open directory
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={fromTools('/hubs')}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-[#0284C7]/40'
              )}
            >
              Market hubs
            </Link>
            <Link
              href={fromTools('/my-insurance')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-[#0284C7]/40"
            >
              My Insurance
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
