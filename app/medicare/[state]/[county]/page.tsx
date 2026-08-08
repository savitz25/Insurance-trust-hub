import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { CountyMedicareDashboard } from '@/components/insurance/cms/county-medicare-dashboard';
import { MedicareCountyOpenBeacon } from '@/components/insurance/cms/medicare-analytics';
import { getAllCountySummaries } from '@/lib/insurance/cms/county-summaries';
import {
  allCanonicalMedicareCountyPaths,
  getCountyByStateCounty,
  isMedicareCountyIndexable,
} from '@/lib/insurance/cms/medicare-routes';
import { getSouthFloridaCountyAgents } from '@/lib/hubs/county-agents';

type Props = {
  params: Promise<{ state: string; county: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export function generateStaticParams() {
  return allCanonicalMedicareCountyPaths().map(({ state, county }) => ({
    state,
    county,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, county } = await params;
  const summary = getCountyByStateCounty(state, county);
  if (!summary) {
    return buildMetadata({
      title: 'Medicare county research',
      description: 'CMS-backed Medicare market research',
      noIndex: true,
    });
  }
  const path = `/medicare/${state}/${county}`;
  const indexable = isMedicareCountyIndexable(summary);
  return buildMetadata({
    title: `${summary.displayName} Medicare market intelligence | CMS enrollment & complaints`,
    description: indexable
      ? `CMS-backed Medicare Advantage / Part D market snapshot for ${summary.displayName}: enrollment, material contracts, complaint-measure context. Educational only — confirm on Medicare.gov.`
      : `Limited Medicare research data for ${summary.displayName}. Confirm on Medicare.gov.`,
    path,
    noIndex: !indexable,
  });
}

export default async function MedicareCountyPage({ params, searchParams }: Props) {
  const { state, county } = await params;
  const sp = searchParams ? await searchParams : {};
  const summary = getCountyByStateCounty(state, county);
  if (!summary) notFound();

  // Thin markets: still show page if we have a summary object, but noindex via metadata
  const agents = getSouthFloridaCountyAgents(summary.countyName);
  const siblings = getAllCountySummaries().filter((c) => c.slug !== summary.slug);
  const path = `/medicare/${state}/${county}`;

  return (
    <>
      <MedicareCountyOpenBeacon slug={summary.slug} path={path} />
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <ContextNav
            pathname={path}
            from={sp.from}
            currentLabel={summary.displayName}
            className="mb-5"
          />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Medicare Market Intelligence · County
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {summary.displayName} Medicare market
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            CMS-sourced enrollment and complaint-measure context for {summary.displayName},{' '}
            {summary.stateName}. Research only — confirm plan shopping on Medicare.gov.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            <Link href="/medicare" className="font-medium text-[#0284C7] hover:underline">
              Medicare hub
            </Link>
            <Link
              href="/data/plan-complaint-index"
              className="font-medium text-[#0284C7] hover:underline"
            >
              Plan Complaint Index
            </Link>
            <Link
              href={`/data/counties/${summary.slug}`}
              className="font-medium text-[#0284C7] hover:underline"
            >
              Legacy dashboard URL
            </Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-10 px-4 py-10 md:py-14">
        <CountyMedicareDashboard summary={summary} agents={agents} />

        {siblings.length > 0 ? (
          <section aria-labelledby="sibling-counties">
            <h2 id="sibling-counties" className="text-lg font-semibold text-slate-900">
              Related counties
            </h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {siblings.map((c) => {
                const map: Record<string, string> = {
                  'miami-dade-fl': '/medicare/fl/miami-dade',
                  'broward-fl': '/medicare/fl/broward',
                  'palm-beach-fl': '/medicare/fl/palm-beach',
                };
                const href = map[c.slug] || `/data/counties/${c.slug}`;
                return (
                  <li key={c.slug}>
                    <Link
                      href={href}
                      className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-[#0284C7]/40 hover:text-[#0284C7]"
                    >
                      {c.displayName}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <DisclaimerBanner />
    </>
  );
}
