'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  MapPin,
  Route,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { withReturnContext } from '@/lib/navigation/context-nav';

const FROM = '/tools/medicare-plan-finder';

type StepId = 'complaints' | 'counties' | 'provider' | 'agents';

type ResearchStep = {
  id: StepId;
  href: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  badge?: string;
};

type Situation = {
  value: string;
  label: string;
  guidance: string;
  /** Ordered step ids — first is the strongest next move */
  stepOrder: StepId[];
  countyHighlights?: boolean;
};

const BASE_STEPS: Record<StepId, ResearchStep> = {
  complaints: {
    id: 'complaints',
    href: withReturnContext('/data/plan-complaint-index', FROM),
    title: 'Plan Complaint Index',
    description:
      'Government-sourced complaint rates for Medicare Advantage and Part D contracts — ranked with clear methodology.',
    icon: BarChart3,
  },
  counties: {
    id: 'counties',
    href: withReturnContext('/data/counties', FROM),
    title: 'County Medicare Dashboards',
    description:
      'Enrollment and quality context by county so you can see what plans are active where you live.',
    icon: MapPin,
  },
  provider: {
    id: 'provider',
    href: withReturnContext('/tools/medicare-provider-lookup', FROM),
    title: 'Medicare Provider Lookup',
    description: 'Check whether a doctor or provider appears in CMS Medicare FFS enrollment or Opt Out records.',
    icon: Stethoscope,
  },
  agents: {
    id: 'agents',
    href: withReturnContext('/hubs/south-florida', FROM),
    title: 'South Florida Medicare Agents',
    description:
      'Browse verified local agents when you are ready for licensed help — not a sales funnel from us.',
    icon: Users,
  },
};

const SITUATIONS: Situation[] = [
  {
    value: 'turning-65',
    label: 'Turning 65 / new to Medicare',
    guidance:
      'Start with county market context and provider participation, then review complaint signals before you talk with a licensed agent about Advantage vs Original Medicare + Medigap.',
    stepOrder: ['counties', 'provider', 'complaints', 'agents'],
    countyHighlights: true,
  },
  {
    value: 'moving',
    label: 'Moving to a new state',
    guidance:
      'Networks, formularies, and local plan mix change with a move. Use county dashboards and provider lookup for the destination market, then review complaint rates before you re-enroll.',
    stepOrder: ['counties', 'provider', 'complaints', 'agents'],
    countyHighlights: true,
  },
  {
    value: 'switching-ma',
    label: 'Reviewing or switching Medicare Advantage plans',
    guidance:
      'Compare government complaint rates and local enrollment context first. Confirm your doctors still look like Medicare FFS participants if you might leave Advantage.',
    stepOrder: ['complaints', 'counties', 'provider', 'agents'],
    countyHighlights: true,
  },
  {
    value: 'medigap',
    label: 'Looking at Medicare Supplement (Medigap)',
    guidance:
      'Medigap works with Original Medicare, so doctor participation and local market context matter more than Advantage star marketing. We do not quote Medigap premiums here.',
    stepOrder: ['provider', 'counties', 'complaints', 'agents'],
  },
  {
    value: 'doctor',
    label: 'Checking if my doctor accepts Medicare',
    guidance:
      'Start with the CMS provider lookup. Then use county and complaint tools if you are also comparing plan types.',
    stepOrder: ['provider', 'counties', 'complaints', 'agents'],
  },
  {
    value: 'researching',
    label: 'Just researching options',
    guidance:
      'Use these free, government-sourced tools in any order. When you want human help, open the verified agents directory — we do not sell plans or take lead fees on this path.',
    stepOrder: ['complaints', 'counties', 'provider', 'agents'],
    countyHighlights: true,
  },
];

const COUNTY_LINKS = [
  { href: withReturnContext('/data/counties/miami-dade-fl', FROM), label: 'Miami-Dade' },
  { href: withReturnContext('/data/counties/broward-fl', FROM), label: 'Broward' },
  { href: withReturnContext('/data/counties/palm-beach-fl', FROM), label: 'Palm Beach' },
] as const;

function stepsForSituation(situation: Situation): ResearchStep[] {
  return situation.stepOrder.map((id) => {
    const base = BASE_STEPS[id];
    if (id === 'agents' && situation.value === 'medigap') {
      return {
        ...base,
        href: withReturnContext('/hubs/medicare', FROM),
        title: 'Medicare Specialists Directory',
        description:
          'Find verified Medicare-focused agents when you want licensed help comparing Medigap vs Advantage paths.',
      };
    }
    return base;
  });
}

export function MedicareResearchRouter() {
  const selectId = useId();
  const [situationValue, setSituationValue] = useState('');

  const situation = SITUATIONS.find((s) => s.value === situationValue) ?? null;
  const steps = situation ? stepsForSituation(situation) : [];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <Label htmlFor={selectId} className="text-base font-semibold text-slate-900">
          Your situation
        </Label>
        <p className="mt-1 text-sm text-slate-500">
          Choose what best matches you. We will show a research path — not plan quotes or carrier lists.
        </p>
        <Select
          id={selectId}
          value={situationValue}
          onChange={(e) => setSituationValue(e.target.value)}
          className="mt-3 h-11 max-w-xl text-base"
          aria-describedby={situation ? 'research-path-heading' : undefined}
        >
          <option value="" disabled>
            Select your situation…
          </option>
          {SITUATIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {situation && (
        <section
          aria-labelledby="research-path-heading"
          className="rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/60 via-white to-white p-5 shadow-sm md:p-8"
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
              <Route className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                Research guide
              </p>
              <h2
                id="research-path-heading"
                className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl"
              >
                Best research path for your situation
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700 md:text-base">
                We don&apos;t sell plans or take lead fees. Here&apos;s the best research path for
                your situation.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                <span className="font-medium text-slate-800">{situation.label}: </span>
                {situation.guidance}
              </p>
            </div>
          </div>

          <ol className="mt-8 space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    className={cn(
                      'group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all',
                      'hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2'
                    )}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover:text-teal-800">
                            {step.title}
                          </span>
                          <ArrowRight
                            className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600"
                            aria-hidden
                          />
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          {situation.countyHighlights && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-sm font-medium text-slate-800">
                South Florida county dashboards (live CMS snapshots)
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {COUNTY_LINKS.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="font-medium text-teal-700 hover:underline">
                      {c.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/data/counties" className="font-medium text-teal-700 hover:underline">
                    All counties
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            This page is a research router, not a Medicare plan quoting tool. Official plan search,
            enrollment, and eligibility decisions belong on{' '}
            <a
              href="https://www.medicare.gov"
              className="font-medium text-teal-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Medicare.gov
            </a>{' '}
            and with licensed professionals.
          </p>
        </section>
      )}

      {!situation && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center md:px-8">
          <p className="text-sm text-slate-600 md:text-base">
            Select a situation above to see your best next research steps.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Links go to real CMS-powered tools and verified agent directories on InsuranceTrustHub.
          </p>
        </div>
      )}
    </div>
  );
}
