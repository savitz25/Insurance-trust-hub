/**
 * Compact Marketplace research snapshot for My Insurance saves.
 * No raw CMS dumps, no API keys — educational provenance only.
 */

import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import type { MarketplaceDataSource } from '@/lib/tools/apply-marketplace-landscape';
import type { PlannerResult } from '@/lib/tools/aca-cost-planner';
import type { SubsidyPlannerResult } from '@/lib/tools/aca-subsidy-planner';
import type { CalculatorSnapshot, CalculatorToolId } from '@/lib/my-insurance/types';

export type ResearchPathSummary = {
  id: 'lowest' | 'balanced' | 'higher_protection' | string;
  label: string;
  metal: string | null;
  premiumMonthly: number | null;
  premiumAfterCreditMonthly: number | null;
  deductible: number | null;
  moop: number | null;
  planName: string | null;
  issuerName: string | null;
};

export type MarketplaceResearchSnapshot = {
  version: 1;
  toolKey: CalculatorToolId;
  toolLabel: string;
  createdAt: string;
  zip: string;
  state: string | null;
  county: string | null;
  marketLabel: string;
  household: {
    ages: number[];
    householdSize: number;
    tobacco?: boolean;
  };
  income: {
    annual: number | null;
    fplPercentLabel: string | null;
    fplRatio: number | null;
  };
  assistanceSummary: string | null;
  usedLiveMarketplace: boolean;
  planYear: number | null;
  marketSnapshot: {
    planCount: number | null;
    issuerCount: number | null;
    premiumLow: number | null;
    premiumHigh: number | null;
    deductibleLow: number | null;
    deductibleHigh: number | null;
  } | null;
  researchPaths: ResearchPathSummary[];
  /** Cost planner recommended metal when applicable */
  recommendedPathId: string | null;
  costSummary: string | null;
  provenance: {
    honesty: string[];
    sourceSystem: 'cms_marketplace_api' | 'educational_baseline' | 'unavailable';
    retrievedAt: string | null;
    fallbackNotice: string | null;
  };
};

const TOOL_LABELS: Record<string, string> = {
  cost_estimator: 'Insurance Cost & Coverage Planner',
  aca_subsidy: 'ACA Coverage & Savings Planner',
};

function pathSummaries(landscape: LocalMarketplaceLandscape | null): ResearchPathSummary[] {
  if (!landscape?.ok || !landscape.researchPaths?.length) return [];
  return landscape.researchPaths.map((p) => ({
    id: p.id,
    label: p.label,
    metal: p.metal,
    premiumMonthly: p.premiumMonthly,
    premiumAfterCreditMonthly: p.premiumAfterCreditMonthly,
    deductible: p.deductible,
    moop: p.moop,
    planName: p.planName,
    issuerName: p.issuerName,
  }));
}

export function buildCostPlannerResearchSnapshot(params: {
  result: PlannerResult & { marketplace?: MarketplaceDataSource };
  landscape: LocalMarketplaceLandscape | null;
  ages: number[];
  householdSize: number;
  tobacco?: boolean;
  utilization?: string;
}): MarketplaceResearchSnapshot {
  const { result, landscape } = params;
  const mp = result.marketplace;
  const usedLive = Boolean(mp?.usedLiveApi && landscape?.ok);

  return {
    version: 1,
    toolKey: 'cost_estimator',
    toolLabel: TOOL_LABELS.cost_estimator,
    createdAt: new Date().toISOString(),
    zip: result.location.zip,
    state: result.location.stateCode || null,
    county: result.location.countyName || null,
    marketLabel: result.location.displayLabel,
    household: {
      ages: params.ages,
      householdSize: params.householdSize,
      tobacco: params.tobacco,
    },
    income: {
      annual: null,
      fplPercentLabel:
        result.subsidy.fplRatio != null
          ? `~${Math.round(result.subsidy.fplRatio * 100)}% FPL`
          : null,
      fplRatio: result.subsidy.fplRatio,
    },
    assistanceSummary: result.subsidy.summary,
    usedLiveMarketplace: usedLive,
    planYear: landscape?.planYear ?? result.meta.planYear ?? null,
    marketSnapshot: usedLive
      ? {
          planCount: landscape?.planCount ?? mp?.planCount ?? null,
          issuerCount: landscape?.issuerCount ?? mp?.issuerCount ?? null,
          premiumLow: landscape?.premiumSpread.low ?? null,
          premiumHigh: landscape?.premiumSpread.high ?? null,
          deductibleLow: landscape?.deductibleSpread.low ?? null,
          deductibleHigh: landscape?.deductibleSpread.high ?? null,
        }
      : null,
    researchPaths: pathSummaries(landscape),
    recommendedPathId: result.recommendedPathId,
    costSummary: `Est. monthly net ~$${result.summaryMonthlyNet.low}–$${result.summaryMonthlyNet.high}/mo · total annual ~$${result.summaryTotalAnnual.low}–$${result.summaryTotalAnnual.high}/yr`,
    provenance: {
      honesty: mp?.honesty ?? [
        'Educational research tool — not HealthCare.gov',
        'Not an enrollment application',
        'Verify final prices and eligibility on HealthCare.gov',
      ],
      sourceSystem: usedLive
        ? 'cms_marketplace_api'
        : landscape?.sourceSystem === 'cms_marketplace_api'
          ? 'unavailable'
          : 'educational_baseline',
      retrievedAt: landscape?.retrievedAt ?? mp?.retrievedAt ?? null,
      fallbackNotice: usedLive ? null : mp?.fallbackNotice ?? 'Educational baselines only',
    },
  };
}

export function buildSubsidyPlannerResearchSnapshot(params: {
  result: SubsidyPlannerResult & { marketplace?: MarketplaceDataSource };
  landscape: LocalMarketplaceLandscape | null;
  ages: number[];
  householdSize: number;
  tobacco?: boolean;
  annualIncome: number;
}): MarketplaceResearchSnapshot {
  const { result, landscape } = params;
  const mp = result.marketplace;
  const usedLive = Boolean(mp?.usedLiveApi && landscape?.ok);

  const ptc =
    result.estimatedPtcMonthly != null
      ? `Est. PTC ~$${result.estimatedPtcMonthly.low}–$${result.estimatedPtcMonthly.high}/mo`
      : 'No PTC under educational model';

  return {
    version: 1,
    toolKey: 'aca_subsidy',
    toolLabel: TOOL_LABELS.aca_subsidy,
    createdAt: new Date().toISOString(),
    zip: result.location.zip,
    state: result.location.stateCode || null,
    county: result.location.countyName || null,
    marketLabel: result.location.displayLabel,
    household: {
      ages: params.ages,
      householdSize: params.householdSize,
      tobacco: params.tobacco,
    },
    income: {
      annual: params.annualIncome,
      fplPercentLabel: result.fplPercentLabel,
      fplRatio: result.fplRatio,
    },
    assistanceSummary: result.assistanceSummary,
    usedLiveMarketplace: usedLive,
    planYear: landscape?.planYear ?? result.meta.planYear ?? null,
    marketSnapshot: usedLive
      ? {
          planCount: landscape?.planCount ?? mp?.planCount ?? null,
          issuerCount: landscape?.issuerCount ?? mp?.issuerCount ?? null,
          premiumLow: landscape?.premiumSpread.low ?? null,
          premiumHigh: landscape?.premiumSpread.high ?? null,
          deductibleLow: landscape?.deductibleSpread.low ?? null,
          deductibleHigh: landscape?.deductibleSpread.high ?? null,
        }
      : null,
    researchPaths: pathSummaries(landscape),
    recommendedPathId: result.qualifiesCsr ? 'silver' : null,
    costSummary: `${ptc} · ${result.fplPercentLabel}`,
    provenance: {
      honesty: mp?.honesty ?? [
        'Educational research tool — not HealthCare.gov',
        'Not an enrollment application',
        'Verify final prices and eligibility on HealthCare.gov',
      ],
      sourceSystem: usedLive
        ? 'cms_marketplace_api'
        : 'educational_baseline',
      retrievedAt: landscape?.retrievedAt ?? mp?.retrievedAt ?? null,
      fallbackNotice: usedLive ? null : mp?.fallbackNotice ?? 'Educational baselines only',
    },
  };
}

/** Build CalculatorSnapshot for cloud/local save (compact). */
export function toCalculatorSnapshot(
  research: MarketplaceResearchSnapshot,
  sourcePath: string
): CalculatorSnapshot {
  return {
    sourcePath,
    summaryText:
      research.costSummary ||
      research.assistanceSummary ||
      `${research.toolLabel} · ${research.marketLabel}`,
    inputs: {
      zip: research.zip,
      state: research.state,
      county: research.county,
      marketLabel: research.marketLabel,
      household: research.household,
      income: research.income,
    },
    outputs: {
      usedLiveMarketplace: research.usedLiveMarketplace,
      planYear: research.planYear,
      marketSnapshot: research.marketSnapshot,
      researchPaths: research.researchPaths,
      recommendedPathId: research.recommendedPathId,
      costSummary: research.costSummary,
      assistanceSummary: research.assistanceSummary,
    },
    result: {
      marketplaceResearch: research,
    },
    marketplaceResearch: research,
  };
}

export function extractMarketplaceResearch(
  snapshot: CalculatorSnapshot | Record<string, unknown> | null | undefined
): MarketplaceResearchSnapshot | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const s = snapshot as CalculatorSnapshot & { result?: { marketplaceResearch?: unknown } };
  const direct = s.marketplaceResearch;
  if (direct && typeof direct === 'object' && (direct as MarketplaceResearchSnapshot).version === 1) {
    return direct as MarketplaceResearchSnapshot;
  }
  const nested = s.result && typeof s.result === 'object'
    ? (s.result as { marketplaceResearch?: MarketplaceResearchSnapshot }).marketplaceResearch
    : null;
  if (nested && nested.version === 1) return nested;
  return null;
}
