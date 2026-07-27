import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Calculator,
  CircleDollarSign,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { CostCoveragePlanner } from '@/components/tools/cost-coverage-planner';
import { ACA_PLANNER_META } from '@/lib/tools/aca-cost-planner';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Cost & Coverage Planner — ACA Total Cost Estimates',
  description:
    'Estimate what health coverage could really cost — premiums, deductibles, and expected out-of-pocket — with honest subsidy context. No quotes, no lead selling.',
  path: '/tools/cost-estimator',
});

const FAQ = [
  {
    q: 'Does this tool give me real plan prices?',
    a: 'No. It builds educational total-cost scenarios from state-adjusted marketplace averages, age rating, and your utilization assumptions. Official prices and subsidies only come from HealthCare.gov or your state marketplace.',
  },
  {
    q: 'Do pre-existing conditions increase my premium here?',
    a: 'No. Under the ACA, marketplace plans cannot charge more for pre-existing conditions. We never use conditions to raise premium estimates. Health needs only inform expected out-of-pocket and plan-fit guidance.',
  },
  {
    q: 'Why is the cheapest premium often not the cheapest plan?',
    a: 'A low monthly premium (often Bronze) can pair with a high deductible. If you need care, total annual cost (premium + what you pay at the doctor) can exceed a higher-premium Silver or Gold path — especially with subsidies or CSR on Silver.',
  },
  {
    q: 'What about auto, home, or life insurance?',
    a: 'This planner focuses on ACA / marketplace health coverage, where public subsidy rules and metal-tier structure support transparent total-cost education. Other lines may return later as separate reference tools.',
  },
  {
    q: 'Do you sell my information or take lead fees?',
    a: 'No. Inputs stay in your browser for this estimate. We do not gate results behind phone or email forms, and we do not sell leads from this tool.',
  },
] as const;

export default function CostEstimatorPage() {
  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/30">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <nav className="mb-4 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">
              Home
            </Link>
            {' / '}
            <Link href="/tools" className="hover:text-slate-800">
              Tools
            </Link>
            {' / '}
            <span className="text-slate-700">Cost &amp; coverage planner</span>
          </nav>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <Calculator className="h-3.5 w-3.5" aria-hidden />
            Flagship tool · ACA / Marketplace first
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Insurance Cost &amp; Coverage Planner
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Estimate what health coverage could really cost you — premiums, deductibles, and
            expected out-of-pocket — based on your household and situation.
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-teal-200/80 bg-white/80 px-3 py-2 text-sm text-teal-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            No quote requests. No lead selling. Your inputs are used only to generate estimates.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" aria-hidden />
              Independent
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              CMS-informed subsidy math
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              No paid placements
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              Plan year context {ACA_PLANNER_META.planYear}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <CostCoveragePlanner />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="container mx-auto max-w-3xl space-y-12 px-4 py-12 md:py-16">
          <section aria-labelledby="how-estimates-work">
            <h2 id="how-estimates-work" className="text-xl font-semibold text-slate-900">
              How our estimates work
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                <strong className="font-medium text-slate-800">Premiums:</strong> We start from
                educational marketplace average baselines, adjust by state, apply a simplified ACA
                age curve, optional tobacco loading, and metal-tier relative factors (Bronze / Silver
                / Gold style paths).
              </p>
              <p>
                <strong className="font-medium text-slate-800">Subsidies:</strong> If you enter
                income, we compare it to HHS federal poverty guidelines (
                {ACA_PLANNER_META.fplGuidelineYear}) and apply an enhanced premium tax credit
                contribution table for context. Cost-sharing reductions are noted for Silver when
                FPL suggests eligibility.
              </p>
              <p>
                <strong className="font-medium text-slate-800">Out-of-pocket:</strong> Utilization,
                prescriptions, and major-care flags change expected care costs — never the ACA
                premium eligibility story for pre-existing conditions.
              </p>
              <p>
                <strong className="font-medium text-slate-800">Provenance:</strong>{' '}
                {ACA_PLANNER_META.premiumBasis}. Last reviewed {ACA_PLANNER_META.lastReviewed}.
                Phase 3B-2 will layer live CMS Marketplace API landscape stats when available.
              </p>
            </div>
          </section>

          <section aria-labelledby="premium-vs-oop" className="grid gap-4 md:grid-cols-3">
            <ExplainCard
              icon={CircleDollarSign}
              title="Premium"
              body="What you pay each month to keep coverage active — before or after tax credits."
            />
            <ExplainCard
              icon={Scale}
              title="Deductible"
              body="What you typically pay for care before the plan shares more costs (varies by design)."
            />
            <ExplainCard
              icon={ShieldCheck}
              title="Out-of-pocket"
              body="What you may pay for care in a year, up toward the plan’s maximum out-of-pocket limit."
            />
          </section>

          <section aria-labelledby="cheap-not-cheapest">
            <h2 id="cheap-not-cheapest" className="text-xl font-semibold text-slate-900">
              Why the cheapest premium is often not the cheapest plan
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Total annual cost = premiums you pay + care you pay. A rock-bottom monthly premium can
              hide a deductible that turns an ordinary year of care into a budget shock. Silver
              plans can win on total cost when subsidies or cost-sharing reductions apply. Gold
              paths can win when use is high. This planner exists to surface that tradeoff — not to
              push a carrier.
            </p>
          </section>

          <section aria-labelledby="related-tools">
            <h2 id="related-tools" className="text-xl font-semibold text-slate-900">
              Related CMS-powered tools
            </h2>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <li>
                <Link href="/data/plan-complaint-index" className="font-medium text-teal-700 hover:underline">
                  Medicare Plan Complaint Index
                </Link>
              </li>
              <li>
                <Link href="/data/counties" className="font-medium text-teal-700 hover:underline">
                  County Medicare dashboards
                </Link>
              </li>
              <li>
                <Link href="/tools/medicare-provider-lookup" className="font-medium text-teal-700 hover:underline">
                  Medicare provider lookup
                </Link>
              </li>
              <li>
                <Link href="/tools/medicare-plan-finder" className="font-medium text-teal-700 hover:underline">
                  Medicare research guide
                </Link>
              </li>
              <li>
                <Link href="/calculators/aca-subsidy" className="font-medium text-teal-700 hover:underline">
                  ACA subsidy calculator
                </Link>
              </li>
              <li>
                <Link href="/hubs/aca" className="font-medium text-teal-700 hover:underline">
                  ACA marketplace agents
                </Link>
              </li>
            </ul>
          </section>

          <section aria-labelledby="faq">
            <h2 id="faq" className="text-xl font-semibold text-slate-900">
              FAQ
            </h2>
            <dl className="mt-4 space-y-4">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
                  <dt className="font-semibold text-slate-900">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Want human help?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Browse verified agents when you are ready — no forced lead form from this page.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/hubs/aca" className="font-medium text-teal-700 hover:underline">
                ACA specialists
              </Link>
              <Link href="/hubs/south-florida" className="font-medium text-teal-700 hover:underline">
                South Florida agents
              </Link>
              <Link href="/hubs/medicare" className="font-medium text-teal-700 hover:underline">
                Medicare specialists
              </Link>
            </div>
          </section>
        </div>
      </div>

      <DisclaimerBanner />
    </>
  );
}

function ExplainCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof CircleDollarSign;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
