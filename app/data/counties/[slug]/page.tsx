import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { CountyMedicareDashboard } from '@/components/insurance/cms/county-medicare-dashboard';
import {
  getAllCountySummaries,
  getCountySummary,
  getCountySummarySlugs,
} from '@/lib/insurance/cms/county-summaries';
import { getSouthFloridaCountyAgents } from '@/lib/hubs/county-agents';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getCountySummarySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = getCountySummary(slug);
  if (!summary) return { title: 'County Medicare Intelligence' };

  return buildMetadata({
    title: `${summary.displayName} Medicare Intelligence (2026) | CMS Enrollment Dashboard`,
    description: `CMS-derived Medicare Advantage and Part D market snapshot for ${summary.displayName}: published enrollment, material contracts, complaint-measure stars, and verified local agents.`,
    path: `/data/counties/${summary.slug}`,
  });
}

export default async function CountyMedicareIntelligencePage({ params }: Props) {
  const { slug } = await params;
  const summary = getCountySummary(slug);
  if (!summary) notFound();

  const agents = getSouthFloridaCountyAgents(summary.countyName);
  const siblings = getAllCountySummaries().filter((c) => c.slug !== summary.slug);

  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/30">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <nav className="mb-4 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">
              Home
            </Link>
            {' / '}
            <Link href="/data/plan-complaint-index" className="hover:text-slate-800">
              Medicare data
            </Link>
            {' / '}
            <span className="text-slate-700">{summary.displayName}</span>
          </nav>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Medicare Intelligence · County dashboard
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {summary.displayName} Medicare Intelligence
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            CMS-sourced enrollment and complaint-measure context for shoppers, caregivers, and
            agents researching Medicare Advantage and Part D options in{' '}
            {summary.displayName}, {summary.stateName}.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            <Link href="/data/plan-complaint-index" className="font-medium text-teal-700 hover:underline">
              Plan Complaint Index
            </Link>
            <Link
              href={`/hubs/${summary.hubStateSlug}/${summary.hubSlug}`}
              className="font-medium text-teal-700 hover:underline"
            >
              Local agent hub
            </Link>
            <Link href="/hubs/south-florida" className="font-medium text-teal-700 hover:underline">
              South Florida hub
            </Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-10 px-4 py-10 md:py-14">
        <CountyMedicareDashboard summary={summary} agents={agents} />

        {siblings.length > 0 ? (
          <section aria-labelledby="sibling-counties">
            <h2 id="sibling-counties" className="text-lg font-semibold text-slate-900">
              Other South Florida counties
            </h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {siblings.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/data/counties/${c.slug}`}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-800"
                  >
                    {c.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <DisclaimerBanner />
    </>
  );
}
