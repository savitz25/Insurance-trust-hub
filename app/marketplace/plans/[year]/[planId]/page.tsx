import type { Metadata } from 'next';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { PlanXRayView } from '@/components/marketplace/plan-xray-view';
import { buildMetadata } from '@/lib/seo/metadata';
import { loadPlanXRay } from '@/lib/marketplace/plan-xray';
import {
  CURATED_ACA_MARKETS,
  planXrayPath,
  ACA_MARKET_PLAN_YEAR,
} from '@/lib/marketplace/curated-markets';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = {
  params: Promise<{ year: string; planId: string }>;
  searchParams: Promise<{ zip?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { year, planId } = await params;
  const sp = await searchParams;
  const y = Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const data = await loadPlanXRay({
    planId,
    year: y,
    zip: sp.zip ?? null,
  });

  const path = planXrayPath(y, planId, sp.zip);
  if (!data.ok || !data.plan) {
    return buildMetadata({
      title: 'Plan research unavailable',
      description: 'CMS Marketplace plan research page. No invented plan facts.',
      path,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${data.plan.name} — Plan X-Ray (${y})`,
    description: `${data.plan.issuerName} · ${data.plan.metalLevel} · ${data.plan.planType}. Independent CMS Marketplace research — not enrollment.`,
    path,
    noIndex: !data.indexable,
  });
}

export default async function PlanXRayPage({ params, searchParams }: Props) {
  const { year, planId } = await params;
  const sp = await searchParams;
  const y = Number(year) || ACA_MARKET_PLAN_YEAR;
  const zip = sp.zip?.replace(/\D/g, '').slice(0, 5) || null;

  const data = await loadPlanXRay({ planId, year: y, zip });

  const relatedMarket =
    CURATED_ACA_MARKETS.find(
      (m) =>
        (data.state && m.stateCode === data.state) ||
        (zip && m.sampleZip === zip)
    ) ??
    CURATED_ACA_MARKETS.find((m) => m.countyFips && m.countyFips === data.countyFips) ??
    null;

  const explorerHref = zip
    ? `/tools/aca-plan-explorer?zip=${zip}&year=${y}`
    : '/tools/aca-plan-explorer';

  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <ContextNav
            pathname={`/marketplace/plans/${y}/${planId}`}
            currentLabel="Plan X-Ray"
            className="mb-2"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Plan X-Ray · Plan year {y}
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <PlanXRayView
          data={data}
          relatedMarket={relatedMarket}
          explorerHref={explorerHref}
        />
      </div>
      <DisclaimerBanner />
    </>
  );
}
