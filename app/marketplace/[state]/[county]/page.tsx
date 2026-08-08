import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { CountyIntelligenceView } from '@/components/marketplace/county-intelligence-view';
import { buildMetadata } from '@/lib/seo/metadata';
import { loadCountyIntelligence } from '@/lib/marketplace/county-intelligence';
import {
  CURATED_ACA_MARKETS,
  getCuratedMarket,
  marketPath,
  ACA_MARKET_PLAN_YEAR,
} from '@/lib/marketplace/curated-markets';
import { JsonLd } from '@/lib/seo/json-ld';
import { metaAcaCounty, buildResearchPageGraph } from '@/lib/seo/research-seo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = {
  params: Promise<{ state: string; county: string }>;
};

export function generateStaticParams() {
  return CURATED_ACA_MARKETS.map((m) => ({
    state: m.stateSlug,
    county: m.countySlug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, county } = await params;
  const market = getCuratedMarket(state, county);
  if (!market) {
    return buildMetadata({
      title: 'County ACA research',
      description: 'Marketplace county intelligence',
      noIndex: true,
    });
  }

  const data = await loadCountyIntelligence(state, county, ACA_MARKET_PLAN_YEAR);
  const path = marketPath(market);
  const indexable = Boolean(data?.ok && data.indexable);
  const m = metaAcaCounty({
    countyName: market.countyName,
    stateCode: market.stateCode,
    stateName: market.stateName,
    planYear: ACA_MARKET_PLAN_YEAR,
    indexable,
  });

  return buildMetadata({
    title: m.title,
    description: m.description,
    path,
    noIndex: !indexable,
  });
}

export default async function CountyAcaIntelligencePage({ params }: Props) {
  const { state, county } = await params;
  const market = getCuratedMarket(state, county);
  if (!market) notFound();

  const data = await loadCountyIntelligence(state, county, ACA_MARKET_PLAN_YEAR);
  if (!data) notFound();

  const m = metaAcaCounty({
    countyName: market.countyName,
    stateCode: market.stateCode,
    stateName: market.stateName,
    planYear: data.planYear,
    indexable: data.indexable,
  });
  const path = marketPath(market);
  const jsonLd = buildResearchPageGraph({
    path,
    name: m.h1,
    description: m.description,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Marketplace research', path: '/marketplace' },
      { name: m.h1, path },
    ],
    dateModified: data.retrievedAt,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <ContextNav
            pathname={path}
            currentLabel={`${market.countyName} ACA`}
            className="mb-2"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            County ACA intelligence · Plan year {data.planYear}
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <CountyIntelligenceView data={data} />
      </div>
      <DisclaimerBanner />
    </>
  );
}
