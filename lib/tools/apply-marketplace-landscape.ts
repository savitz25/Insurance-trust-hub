/**
 * Merge live CMS Marketplace landscape into educational planner results.
 * When landscape is unavailable, returns the educational result unchanged.
 */

import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import type { PlannerResult, PathEstimate, MetalPath } from '@/lib/tools/aca-cost-planner';
import type { SubsidyPlannerResult, PathScenario, MetalPathId } from '@/lib/tools/aca-subsidy-planner';

export type MarketplaceDataSource = {
  usedLiveApi: boolean;
  planCount: number | null;
  issuerCount: number | null;
  locationLabel: string | null;
  planYear: number | null;
  retrievedAt: string | null;
  fallbackNotice: string | null;
  honesty: string[];
};

const HONESTY_BASE = [
  'Educational research tool — not HealthCare.gov',
  'Not an enrollment application',
  'Verify final prices and eligibility on HealthCare.gov',
] as const;

function bandFromPoint(value: number, spread = 0.08): { low: number; high: number } {
  return {
    low: Math.max(0, Math.round(value * (1 - spread))),
    high: Math.round(value * (1 + spread)),
  };
}

function metalKey(id: MetalPath | MetalPathId): 'bronze' | 'silver' | 'gold' {
  return id;
}

function slicePremium(
  landscape: LocalMarketplaceLandscape,
  metal: 'bronze' | 'silver' | 'gold'
): number | null {
  const slice =
    metal === 'bronze'
      ? landscape.bronze
      : metal === 'silver'
        ? landscape.silver
        : landscape.gold;
  if (!slice) return null;
  // Prefer lowest as the path anchor; median if lowest missing
  return slice.lowestPremiumMonthly ?? slice.medianPremiumMonthly;
}

function sliceDed(
  landscape: LocalMarketplaceLandscape,
  metal: 'bronze' | 'silver' | 'gold'
): { low: number; high: number } | null {
  const slice =
    metal === 'bronze'
      ? landscape.bronze
      : metal === 'silver'
        ? landscape.silver
        : landscape.gold;
  if (!slice || slice.deductibleLow == null) return null;
  return {
    low: slice.deductibleLow,
    high: slice.deductibleHigh ?? slice.deductibleLow,
  };
}

function sliceMoop(
  landscape: LocalMarketplaceLandscape,
  metal: 'bronze' | 'silver' | 'gold'
): { low: number; high: number } | null {
  const slice =
    metal === 'bronze'
      ? landscape.bronze
      : metal === 'silver'
        ? landscape.silver
        : landscape.gold;
  if (!slice || slice.moopLow == null) return null;
  return {
    low: slice.moopLow,
    high: slice.moopHigh ?? slice.moopLow,
  };
}

function provenance(landscape: LocalMarketplaceLandscape | null): MarketplaceDataSource {
  if (!landscape) {
    return {
      usedLiveApi: false,
      planCount: null,
      issuerCount: null,
      locationLabel: null,
      planYear: null,
      retrievedAt: null,
      fallbackNotice:
        'Live Marketplace data was not loaded. Showing educational state-adjusted baselines.',
      honesty: [...HONESTY_BASE],
    };
  }
  if (!landscape.ok) {
    return {
      usedLiveApi: false,
      planCount: null,
      issuerCount: null,
      locationLabel: landscape.locationLabel,
      planYear: landscape.planYear,
      retrievedAt: landscape.retrievedAt,
      fallbackNotice:
        landscape.fallbackReason ||
        'Marketplace API unavailable — using educational state-adjusted baselines.',
      honesty: [
        ...HONESTY_BASE,
        `Plan year context: ${landscape.planYear}`,
      ],
    };
  }
  return {
    usedLiveApi: true,
    planCount: landscape.planCount,
    issuerCount: landscape.issuerCount,
    locationLabel: landscape.locationLabel,
    planYear: landscape.planYear,
    retrievedAt: landscape.retrievedAt,
    fallbackNotice: null,
    honesty: [
      ...HONESTY_BASE,
      `Source: CMS Marketplace API · plan year ${landscape.planYear}`,
      `Retrieved: ${new Date(landscape.retrievedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`,
      `Estimated local landscape: ${landscape.planCount} plans · ${landscape.issuerCount} issuers`,
    ],
  };
}

/**
 * Apply live metal premiums / cost-share ranges to the cost planner paths.
 * Recomputes net premium and total annual using existing PTC estimate when present.
 */
export function applyLandscapeToCostPlanner(
  base: PlannerResult,
  landscape: LocalMarketplaceLandscape | null
): PlannerResult & { marketplace: MarketplaceDataSource } {
  const source = provenance(landscape);
  if (!landscape?.ok) {
    return {
      ...base,
      marketplace: source,
      assumptions: [
        ...base.assumptions,
        source.fallbackNotice || 'Educational premium baselines (no live Marketplace data)',
      ],
    };
  }

  const ptcAnnual = base.subsidy.estimatedAnnualPtc ?? 0;
  const ptcMonthly = ptcAnnual / 12;

  const paths: PathEstimate[] = base.paths.map((path) => {
    const metal = metalKey(path.id);
    const livePrem = slicePremium(landscape, metal);
    const grossMonthly = livePrem ?? path.monthlyPremiumGross.low;
    // If we only have a point estimate, keep a modest band
    const monthlyGross =
      livePrem != null ? bandFromPoint(livePrem, 0.06) : path.monthlyPremiumGross;

    const netMid = Math.max(0, grossMonthly - ptcMonthly);
    const monthlyNet = bandFromPoint(netMid, 0.08);
    const annualNet = { low: monthlyNet.low * 12, high: monthlyNet.high * 12 };

    const ded = sliceDed(landscape, metal) ?? path.deductibleRange;
    const moop = sliceMoop(landscape, metal) ?? path.maxOopRange;

    // Keep educational expected OOP share relative to moop mid
    const moopMid = (moop.low + moop.high) / 2;
    const prevMoopMid = (path.maxOopRange.low + path.maxOopRange.high) / 2 || 1;
    const scale = moopMid / prevMoopMid;
    const expectedOop = {
      low: Math.round(path.expectedOop.low * scale),
      high: Math.round(path.expectedOop.high * scale),
    };
    const totalAnnual = {
      low: annualNet.low + expectedOop.low,
      high: annualNet.high + expectedOop.high,
    };

    return {
      ...path,
      monthlyPremiumGross: monthlyGross,
      monthlyPremiumNet: monthlyNet,
      annualPremiumNet: annualNet,
      deductibleRange: ded,
      maxOopRange: moop,
      expectedOop,
      totalAnnualCost: totalAnnual,
    };
  });

  const rec = paths.find((p) => p.id === base.recommendedPathId) ?? paths[1]!;

  // Prefer educational credit using live Silver benchmark when PTC was computed
  let subsidy = base.subsidy;
  if (landscape.silverBenchmarkMonthly != null && base.subsidy.fplRatio != null) {
    const benchAnnual = landscape.silverBenchmarkMonthly * 12;
    if (base.subsidy.expectedContributionAnnual != null && base.subsidy.mayQualifyPtc) {
      const estPtc = Math.max(
        0,
        Math.round(benchAnnual - base.subsidy.expectedContributionAnnual)
      );
      subsidy = {
        ...base.subsidy,
        estimatedAnnualPtc: estPtc,
        summary: `${base.subsidy.summary} Local Silver landscape used for educational benchmark context (~$${Math.round(landscape.silverBenchmarkMonthly)}/mo second-lowest/median-style Silver stand-in — not official SLCSP).`,
      };
    }
  }

  return {
    ...base,
    subsidy,
    paths,
    summaryMonthlyNet: rec.monthlyPremiumNet,
    summaryTotalAnnual: rec.totalAnnualCost,
    marketplace: source,
    assumptions: [
      ...base.assumptions.filter((a) => !a.includes('state-adjusted')),
      `Local Marketplace landscape: ${landscape.planCount} plans, ${landscape.issuerCount} issuers (${landscape.locationLabel || 'area'})`,
      'Metal-path premiums anchored to lowest local CMS plans per metal when available (educational bands, not quotes)',
      `CMS retrieval: ${landscape.retrievedAt}`,
    ],
  };
}

/**
 * Apply live landscape to subsidy planner path scenarios + narrative.
 */
export function applyLandscapeToSubsidyPlanner(
  base: SubsidyPlannerResult,
  landscape: LocalMarketplaceLandscape | null
): SubsidyPlannerResult & { marketplace: MarketplaceDataSource } {
  const source = provenance(landscape);
  if (!landscape?.ok) {
    return {
      ...base,
      marketplace: source,
      assumptions: [
        ...base.assumptions,
        source.fallbackNotice || 'Educational premium baselines (no live Marketplace data)',
      ],
    };
  }

  const confSpread = 0.08;
  const ptcMid =
    base.estimatedPtcMonthly != null
      ? (base.estimatedPtcMonthly.low + base.estimatedPtcMonthly.high) / 2
      : 0;

  // Rebuild PTC from local Silver benchmark when possible
  let estimatedPtcMonthly = base.estimatedPtcMonthly;
  let estimatedPtcAnnual = base.estimatedPtcAnnual;
  let assistanceSummary = base.assistanceSummary;

  if (
    base.qualifiesPtc &&
    base.expectedContributionMonthly != null &&
    landscape.silverBenchmarkMonthly != null
  ) {
    const ptcM = Math.max(
      0,
      Math.round(landscape.silverBenchmarkMonthly - base.expectedContributionMonthly)
    );
    estimatedPtcMonthly = {
      low: Math.max(0, Math.round(ptcM * (1 - confSpread))),
      high: Math.round(ptcM * (1 + confSpread)),
    };
    estimatedPtcAnnual = {
      low: estimatedPtcMonthly.low * 12,
      high: estimatedPtcMonthly.high * 12,
    };
    assistanceSummary = `At ~${base.fplPercentLabel}, you may qualify for a premium tax credit. Educational estimate: about $${estimatedPtcMonthly.low}–$${estimatedPtcMonthly.high}/mo using local Silver landscape (~$${Math.round(landscape.silverBenchmarkMonthly)}/mo) for ${landscape.locationLabel || base.location.displayLabel} — not an official award.`;
  }

  const ptcForNet =
    estimatedPtcMonthly != null
      ? (estimatedPtcMonthly.low + estimatedPtcMonthly.high) / 2
      : ptcMid;

  const paths: PathScenario[] = base.paths.map((path) => {
    const metal = metalKey(path.id);
    const live = slicePremium(landscape, metal);
    if (live == null) return path;
    const gross = bandFromPoint(live, confSpread);
    const netMid = Math.max(0, live - ptcForNet);
    const net = bandFromPoint(netMid, confSpread);
    return {
      ...path,
      monthlyGross: gross,
      monthlyNet: net,
      annualNet: { low: net.low * 12, high: net.high * 12 },
    };
  });

  const bronze = paths.find((p) => p.id === 'bronze');
  const silver = paths.find((p) => p.id === 'silver');
  const gold = paths.find((p) => p.id === 'gold');

  const localCostNarrative = base.qualifiesPtc
    ? `In ${landscape.locationLabel || base.location.displayLabel}, with about ${landscape.planCount} Marketplace plans available, this educational assistance level could bring a lower-premium (Bronze) path near $${bronze?.monthlyNet.low ?? '—'}–$${bronze?.monthlyNet.high ?? '—'}/mo and a Silver path near $${silver?.monthlyNet.low ?? '—'}–$${silver?.monthlyNet.high ?? '—'}/mo after estimated credits — ranges from CMS landscape data, not quotes.`
    : `In ${landscape.locationLabel || base.location.displayLabel}, CMS lists about ${landscape.planCount} plans from ${landscape.issuerCount} issuers. Educational unsubsidized paths run about $${bronze?.monthlyGross.low ?? '—'}–$${bronze?.monthlyGross.high ?? '—'}/mo (lower premium) to $${gold?.monthlyGross.low ?? '—'}–$${gold?.monthlyGross.high ?? '—'}/mo (higher protection).`;

  return {
    ...base,
    estimatedPtcMonthly,
    estimatedPtcAnnual,
    assistanceSummary,
    localCostNarrative,
    paths,
    zeroPremiumPossible: base.qualifiesPtc && (bronze?.monthlyNet.low ?? 1) === 0,
    marketplace: source,
    assumptions: [
      ...base.assumptions.filter((a) => !a.toLowerCase().includes('reconstructed')),
      `Local Marketplace landscape: ${landscape.planCount} plans, ${landscape.issuerCount} issuers`,
      'Path premiums anchored to lowest local CMS metal-tier plans when available',
      `CMS retrieval: ${landscape.retrievedAt}`,
    ],
  };
}
