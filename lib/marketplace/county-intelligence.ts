/**
 * Phase 10 — County ACA market intelligence from real plan search aggregates.
 * Fail closed; never invent averages.
 */

import {
  searchMarketplacePlans,
  isMarketplaceApiConfigured,
} from '@/lib/marketplace/client';
import {
  COUNTY_INDEX_GATES,
  getCuratedMarket,
  type CuratedAcaMarket,
  ACA_MARKET_PLAN_YEAR,
} from '@/lib/marketplace/curated-markets';
import type { MarketplacePlanCard, MetalLevel, PlanTypeCode } from '@/lib/marketplace/types';

export type RangeStat = { min: number; max: number; count: number };

export type CountyIntelligenceResult = {
  ok: boolean;
  market: CuratedAcaMarket;
  planYear: number;
  retrievedAt: string;
  sourceSystem: 'cms_marketplace_api' | 'unavailable';
  apiConfigured: boolean;
  locationLabel: string | null;
  countyFips: string | null;
  planCount: number;
  issuerCount: number;
  issuers: string[];
  metalMix: Record<string, number>;
  planTypeMix: Record<string, number>;
  premiumByMetal: Partial<Record<MetalLevel, RangeStat>>;
  deductibleRange: RangeStat | null;
  moopRange: RangeStat | null;
  hsaPlanCount: number;
  quality: { count: number; average: number | null };
  /** Meets quality gates for indexation */
  indexable: boolean;
  thin: boolean;
  explorerHref: string;
  errorMessage?: string;
  limitations: string[];
};

function rangeOf(values: number[]): RangeStat | null {
  if (!values.length) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

function aggregatePlans(plans: MarketplacePlanCard[]): Omit<
  CountyIntelligenceResult,
  | 'ok'
  | 'market'
  | 'planYear'
  | 'retrievedAt'
  | 'sourceSystem'
  | 'apiConfigured'
  | 'locationLabel'
  | 'countyFips'
  | 'explorerHref'
  | 'errorMessage'
  | 'limitations'
  | 'indexable'
  | 'thin'
> {
  const issuers = new Set<string>();
  const metalMix: Record<string, number> = {};
  const planTypeMix: Record<string, number> = {};
  const premiumsByMetal: Partial<Record<MetalLevel, number[]>> = {};
  const deductibles: number[] = [];
  const moops: number[] = [];
  let hsaPlanCount = 0;
  const qualities: number[] = [];

  for (const p of plans) {
    if (p.issuerName) issuers.add(p.issuerName);
    metalMix[p.metalLevel] = (metalMix[p.metalLevel] || 0) + 1;
    planTypeMix[p.planType] = (planTypeMix[p.planType] || 0) + 1;
    const prem = p.premiumMonthly ?? p.estimatedPremiumAfterCreditMonthly;
    if (prem != null && Number.isFinite(prem)) {
      if (!premiumsByMetal[p.metalLevel]) premiumsByMetal[p.metalLevel] = [];
      premiumsByMetal[p.metalLevel]!.push(prem);
    }
    if (p.deductibleIndividual != null) deductibles.push(p.deductibleIndividual);
    if (p.moopIndividual != null) moops.push(p.moopIndividual);
    if (p.hsaEligible === true) hsaPlanCount += 1;
    if (p.qualityRating != null) qualities.push(p.qualityRating);
  }

  const premiumByMetal: Partial<Record<MetalLevel, RangeStat>> = {};
  for (const [metal, vals] of Object.entries(premiumsByMetal) as [MetalLevel, number[]][]) {
    const r = rangeOf(vals);
    if (r) premiumByMetal[metal] = r;
  }

  return {
    planCount: plans.length,
    issuerCount: issuers.size,
    issuers: [...issuers].sort((a, b) => a.localeCompare(b)).slice(0, 40),
    metalMix,
    planTypeMix,
    premiumByMetal,
    deductibleRange: rangeOf(deductibles),
    moopRange: rangeOf(moops),
    hsaPlanCount,
    quality: {
      count: qualities.length,
      average:
        qualities.length > 0
          ? Math.round((qualities.reduce((a, b) => a + b, 0) / qualities.length) * 10) / 10
          : null,
    },
  };
}

export function isCountyIndexable(stats: {
  planCount: number;
  issuerCount: number;
}): boolean {
  return (
    stats.planCount >= COUNTY_INDEX_GATES.minPlans &&
    stats.issuerCount >= COUNTY_INDEX_GATES.minIssuers
  );
}

/**
 * Build county ACA snapshot from live Marketplace plan search for sample ZIP.
 */
export async function loadCountyIntelligence(
  stateSlug: string,
  countySlug: string,
  year: number = ACA_MARKET_PLAN_YEAR
): Promise<CountyIntelligenceResult | null> {
  const market = getCuratedMarket(stateSlug, countySlug);
  if (!market) return null;

  const retrievedAt = new Date().toISOString();
  const limitations = [
    'Snapshot derived from CMS Marketplace plan search for a representative ZIP in this county — not every ZIP, not enrollment quotes.',
    'Premium ranges reflect the research household used for search (adult age 35, Medium utilization when OOPC requested). Other households will differ.',
    'Confirm on HealthCare.gov or your state exchange. No paid placements. You decide.',
  ];

  const explorerHref = `/tools/aca-plan-explorer?zip=${market.sampleZip}&year=${year}&from=county`;

  if (!isMarketplaceApiConfigured()) {
    return {
      ok: false,
      market,
      planYear: year,
      retrievedAt,
      sourceSystem: 'unavailable',
      apiConfigured: false,
      locationLabel: null,
      countyFips: market.countyFips ?? null,
      planCount: 0,
      issuerCount: 0,
      issuers: [],
      metalMix: {},
      planTypeMix: {},
      premiumByMetal: {},
      deductibleRange: null,
      moopRange: null,
      hsaPlanCount: 0,
      quality: { count: 0, average: null },
      indexable: false,
      thin: true,
      explorerHref,
      errorMessage:
        'Marketplace API key is not configured. County intelligence requires live CMS plan data.',
      limitations,
    };
  }

  const search = await searchMarketplacePlans({
    zip: market.sampleZip,
    year,
    people: [{ age: 35 }],
    utilization: 'Medium',
  });

  if (!search.ok || !search.plans.length) {
    return {
      ok: false,
      market,
      planYear: year,
      retrievedAt,
      sourceSystem: 'cms_marketplace_api',
      apiConfigured: true,
      locationLabel: search.locationLabel,
      countyFips: search.provenance.countyFips ?? market.countyFips ?? null,
      planCount: 0,
      issuerCount: 0,
      issuers: [],
      metalMix: {},
      planTypeMix: {},
      premiumByMetal: {},
      deductibleRange: null,
      moopRange: null,
      hsaPlanCount: 0,
      quality: { count: 0, average: null },
      indexable: false,
      thin: true,
      explorerHref,
      errorMessage:
        search.errorMessage ||
        'CMS returned no individual-market plans for this sample ZIP. Thin research stub only.',
      limitations,
    };
  }

  const agg = aggregatePlans(search.plans);
  const indexable = isCountyIndexable(agg);

  return {
    ok: true,
    market,
    planYear: year,
    retrievedAt,
    sourceSystem: 'cms_marketplace_api',
    apiConfigured: true,
    locationLabel: search.locationLabel,
    countyFips: search.provenance.countyFips ?? market.countyFips ?? null,
    ...agg,
    indexable,
    thin: !indexable,
    explorerHref,
    limitations,
  };
}

export type PlanTypeMixKey = PlanTypeCode;
