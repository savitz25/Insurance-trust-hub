import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, ShieldCheck, Sparkles } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { AcaCoverageSavingsPlanner } from '@/components/calculators/aca-coverage-savings-planner';
import { ACA_SAVINGS_META } from '@/lib/tools/aca-subsidy-planner';

export const metadata: Metadata = buildMetadata({
  title: 'ACA Coverage & Savings Planner — Premium Tax Credit & CSR Estimates',
  description:
    'See what Marketplace premium tax credits and Cost-Sharing Reductions you may qualify for — with ZIP, ages, income, local cost paths, and honest cliff education. No leads.',
  path: '/calculators/aca-subsidy',
});

type PageProps = { searchParams?: Promise<{ from?: string }> };

const FAQ = [
  {
    q: 'What if my income changes mid-year?',
    a: 'Report changes to the Marketplace. Premium tax credits are reconciled on your tax return — you may owe back excess credits or receive additional credit. Use a conservative income estimate if self-employed income varies.',
  },
  {
    q: 'What counts toward household income (MAGI)?',
    a: 'Marketplace assistance generally uses modified adjusted gross income: most taxable income plus certain adjustments. This tool uses a rough household income proxy — not a tax calculation. Official MAGI is determined through the Marketplace application and IRS rules.',
  },
  {
    q: 'What if I’m near the subsidy cliff?',
    a: 'Under this educational 2026 model, premium tax credits generally end above 400% of the federal poverty level. Near the cliff, small MAGI changes can eliminate assistance. That is not tax advice — verify with a tax professional and the Marketplace.',
  },
  {
    q: 'Do subsidies apply year-round?',
    a: 'Credits apply for months you are enrolled in a Marketplace plan and eligible. Open enrollment and special enrollment periods control when you can enroll. Credits are not a year-round guarantee if you leave coverage or lose eligibility.',
  },
  {
    q: 'What is CSR and why does Silver matter?',
    a: 'Cost-Sharing Reductions lower deductibles and out-of-pocket costs on Silver plans for many households between about 100% and 250% FPL. CSR does not attach to Bronze or Gold — so the cheapest monthly Bronze can cost more overall if you use care.',
  },
  {
    q: 'Do pre-existing conditions raise my premium?',
    a: 'No. ACA individual-market plans cannot charge more for pre-existing conditions. This tool never uses health conditions to raise premium estimates.',
  },
] as const;

export default async function AcaSubsidyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav
            pathname="/calculators/aca-subsidy"
            from={sp.from}
            currentLabel="ACA Coverage & Savings Planner"
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <Calculator className="h-3.5 w-3.5" aria-hidden />
            Flagship tool · Plan year {ACA_SAVINGS_META.planYear}
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            ACA Coverage &amp; Savings Planner
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            See what Marketplace assistance you may qualify for — and what coverage could actually
            cost in your area.
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-[#0284C7]/30 bg-white/80 px-3 py-2 text-sm text-[#0A2540]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Educational estimates only. No phone number required. No lead selling.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Official eligibility and enrollment are determined through the Marketplace.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden />
              ZIP + ages + income
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              400% FPL cliff model ({ACA_SAVINGS_META.planYear})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              CSR education
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
        <AcaCoverageSavingsPlanner />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="container mx-auto max-w-3xl space-y-12 px-4 py-12 md:py-16">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How premium tax credits work</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Premium tax credits lower the monthly cost of Marketplace plans based on household
              income versus the federal poverty level and the cost of a local benchmark Silver plan
              (SLCSP). This tool reconstructs that logic educationally — it does not pull your
              official SLCSP from CMS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">What MAGI means (plain English)</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Modified adjusted gross income is a tax concept used by the Marketplace. For most
              people it is close to “what I earn in a year” with some adjustments. If you are
              self-employed or have irregular income, build in a buffer — credits are reconciled on
              your tax return.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Why ZIP and ages matter</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Marketplace premiums vary by geography and age. A household of two 55-year-olds faces
              a different benchmark than two 30-year-olds in the same ZIP. State-only averages hide
              those differences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Cost-Sharing Reductions (CSR)</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              If your income falls roughly between 100% and 250% FPL, you may get lower deductibles
              and out-of-pocket limits — but only if you enroll in a Silver plan. That is why the
              cheapest Bronze premium is not always the cheapest total cost.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Data provenance</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>{ACA_SAVINGS_META.fplSource}</li>
              <li>{ACA_SAVINGS_META.ruleNote}</li>
              <li>{ACA_SAVINGS_META.premiumBasis}</li>
              <li>Last reviewed {ACA_SAVINGS_META.lastReviewed}</li>
            </ul>
          </section>

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

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Want human help later?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Browse verified ACA specialists when you are ready — no forced lead form from this
              page.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/hubs/aca" className="font-medium text-[#0284C7] hover:underline">
                ACA specialists
              </Link>
              <Link href="/tools/cost-estimator" className="font-medium text-[#0284C7] hover:underline">
                Cost &amp; Coverage Planner
              </Link>
              <Link href="/calculators" className="font-medium text-[#0284C7] hover:underline">
                All calculators
              </Link>
            </div>
          </section>
        </div>
      </div>

      <DisclaimerBanner />
    </>
  );
}
