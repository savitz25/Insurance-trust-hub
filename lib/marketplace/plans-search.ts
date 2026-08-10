/**
 * Local Marketplace landscape — aggregate plan search into planner-friendly ranges.
 * Educational research only; not enrollment or official eligibility.
 */

import { searchMarketplacePlans } from '@/lib/marketplace/client';
import type {
  MarketplacePlanCard,
  MarketplaceSearchInput,
  MarketplaceSearchResult,
  MetalLevel,
} from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export type MetalLandscapeSlice = {
  metal: 'Bronze' | 'Silver' | 'Gold';
  planCount: number;
  /** Lowest full premium in metal */
  lowestPremiumMonthly: number | null;
  /** Median full premium in metal */
  medianPremiumMonthly: number | null;
  /** Lowest after estimated credit when available */
  lowestAfterCreditMonthly: number | null;
  deductibleLow: number | null;
  deductibleHigh: number | null;
  moopLow: number | null;
  moopHigh: number | null;
  sampleIssuers: string[];
  /** Representative plan (lowest premium with a name) */
  samplePlan: { id: string; name: string; issuerName: string } | null;
};

export type LocalMarketplaceLandscape = {
  ok: boolean;
  planCount: number;
  issuerCount: number;
  issuerNames: string[];
  bronze: MetalLandscapeSlice | null;
  silver: MetalLandscapeSlice | null;
  /** Second-lowest Silver premium when ≥2 Silvers — rough SLCSP stand-in for educational PTC */
  silverBenchmarkMonthly: number | null;
  gold: MetalLandscapeSlice | null;
  premiumSpread: { low: number | null; high: number | null };
  deductibleSpread: { low: number | null; high: number | null };
  locationLabel: string | null;
  planYear: number;
  retrievedAt: string;
  sourceSystem: 'cms_marketplace_api' | 'unavailable';
  usedLiveApi: boolean;
  fallbackReason: string | null;
  errorCode?: MarketplaceSearchResult['errorCode'];
  errorMessage?: string;
  creditContext?: MarketplaceSearchResult['creditContext'];
  /** Raw search success flag */
  searchOk: boolean;
};

function metalOf(level: MetalLevel): 'Bronze' | 'Silver' | 'Gold' | null {
  if (level === 'Bronze') return 'Bronze';
  if (level === 'Silver') return 'Silver';
  if (level === 'Gold') return 'Gold';
  return null;
}

function sortedNums(values: Array<number | null | undefined>): number[] {
  return values
    .filter((n): n is number => n != null && Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
}

function median(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function secondLowest(sorted: number[]): number | null {
  if (sorted.length >= 2) return sorted[1]!;
  if (sorted.length === 1) return sorted[0]!;
  return null;
}

function sliceMetal(
  metal: 'Bronze' | 'Silver' | 'Gold',
  plans: MarketplacePlanCard[]
): MetalLandscapeSlice | null {
  const subset = plans.filter((p) => metalOf(p.metalLevel) === metal);
  if (!subset.length) return null;

  const premiums = sortedNums(subset.map((p) => p.premiumMonthly));
  const after = sortedNums(subset.map((p) => p.estimatedPremiumAfterCreditMonthly));
  const deds = sortedNums(subset.map((p) => p.deductibleIndividual));
  const moops = sortedNums(subset.map((p) => p.moopIndividual));

  const byPrem = [...subset]
    .filter((p) => p.premiumMonthly != null)
    .sort((a, b) => (a.premiumMonthly ?? 0) - (b.premiumMonthly ?? 0));
  const best = byPrem[0] ?? subset[0]!;

  const issuers = [...new Set(subset.map((p) => p.issuerName).filter(Boolean))].slice(0, 6);

  return {
    metal,
    planCount: subset.length,
    lowestPremiumMonthly: premiums[0] ?? null,
    medianPremiumMonthly: median(premiums),
    lowestAfterCreditMonthly: after[0] ?? null,
    deductibleLow: deds[0] ?? null,
    deductibleHigh: deds.length ? deds[deds.length - 1]! : null,
    moopLow: moops[0] ?? null,
    moopHigh: moops.length ? moops[moops.length - 1]! : null,
    sampleIssuers: issuers,
    samplePlan: {
      id: best.id,
      name: best.name,
      issuerName: best.issuerName,
    },
  };
}

function emptyLandscape(
  partial: Partial<LocalMarketplaceLandscape> & {
    planYear: number;
    retrievedAt: string;
  }
): LocalMarketplaceLandscape {
  return {
    ok: false,
    planCount: 0,
    issuerCount: 0,
    issuerNames: [],
    bronze: null,
    silver: null,
    silverBenchmarkMonthly: null,
    gold: null,
    premiumSpread: { low: null, high: null },
    deductibleSpread: { low: null, high: null },
    locationLabel: null,
    sourceSystem: 'unavailable',
    usedLiveApi: false,
    fallbackReason: partial.fallbackReason ?? 'Marketplace landscape unavailable',
    searchOk: false,
    ...partial,
  };
}

/**
 * Build local landscape from CMS Marketplace plan search.
 * Fail closed: ok=false when API missing/errors; callers should fall back to educational models.
 */
export async function getLocalMarketplaceLandscape(
  input: MarketplaceSearchInput
): Promise<LocalMarketplaceLandscape> {
  const year = input.year || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const search = await searchMarketplacePlans({ ...input, year });

  if (!search.ok || !search.plans.length) {
    return emptyLandscape({
      planYear: year,
      retrievedAt: search.provenance.retrievedAt,
      locationLabel: search.locationLabel,
      sourceSystem: search.provenance.sourceSystem,
      usedLiveApi: search.provenance.apiConfigured,
      fallbackReason:
        search.errorMessage ||
        'No local Marketplace plans returned — using educational state-adjusted baselines.',
      errorCode: search.errorCode,
      errorMessage: search.errorMessage,
      creditContext: search.creditContext,
      searchOk: false,
    });
  }

  const plans = search.plans;
  const bronze = sliceMetal('Bronze', plans);
  const silver = sliceMetal('Silver', plans);
  const gold = sliceMetal('Gold', plans);

  const silverPremiums = sortedNums(
    plans
      .filter((p) => p.metalLevel === 'Silver')
      .map((p) => p.premiumMonthly)
  );
  const allPrem = sortedNums(plans.map((p) => p.premiumMonthly));
  const allDed = sortedNums(plans.map((p) => p.deductibleIndividual));
  const issuers = [...new Set(plans.map((p) => p.issuerName).filter(Boolean))].sort();

  return {
    ok: true,
    planCount: plans.length,
    issuerCount: issuers.length,
    issuerNames: issuers.slice(0, 24),
    bronze,
    silver,
    silverBenchmarkMonthly: secondLowest(silverPremiums),
    gold,
    premiumSpread: {
      low: allPrem[0] ?? null,
      high: allPrem.length ? allPrem[allPrem.length - 1]! : null,
    },
    deductibleSpread: {
      low: allDed[0] ?? null,
      high: allDed.length ? allDed[allDed.length - 1]! : null,
    },
    locationLabel: search.locationLabel,
    planYear: year,
    retrievedAt: search.provenance.retrievedAt,
    sourceSystem: 'cms_marketplace_api',
    usedLiveApi: true,
    fallbackReason: null,
    creditContext: search.creditContext,
    searchOk: true,
  };
}

/** Validate planner-facing inputs before calling CMS. */
export function validateLandscapeInput(raw: {
  zip?: string;
  year?: number;
  ages?: number[];
  people?: Array<{ age: number; usesTobacco?: boolean }>;
  householdIncome?: number | null;
  householdSize?: number | null;
  tobacco?: boolean;
}): { ok: true; input: MarketplaceSearchInput } | { ok: false; message: string } {
  const zip = String(raw.zip ?? '').replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) {
    return { ok: false, message: 'Enter a valid 5-digit U.S. ZIP code.' };
  }

  let people = raw.people?.length
    ? raw.people
        .map((p) => ({
          age: Math.round(Number(p.age)),
          usesTobacco: Boolean(p.usesTobacco),
        }))
        .filter((p) => Number.isFinite(p.age) && p.age >= 0 && p.age <= 120)
    : (raw.ages ?? []).map((age) => ({
        age: Math.round(Number(age)),
        usesTobacco: Boolean(raw.tobacco && Number(age) >= 18),
      }));

  people = people
    .filter((p) => Number.isFinite(p.age) && p.age >= 0 && p.age <= 120)
    .slice(0, 8);

  if (!people.length) {
    people = [{ age: 35, usesTobacco: false }];
  }

  const year = Number(raw.year) || MARKETPLACE_PLAN_YEAR_DEFAULT;
  if (year < 2024 || year > 2030) {
    return { ok: false, message: 'Plan year out of supported range.' };
  }

  let householdIncome: number | null = null;
  if (raw.householdIncome != null && raw.householdIncome !== ('' as unknown)) {
    const n = Number(raw.householdIncome);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
      return { ok: false, message: 'Household income looks invalid.' };
    }
    householdIncome = n;
  }

  const householdSize =
    raw.householdSize != null && Number.isFinite(Number(raw.householdSize))
      ? Math.max(1, Math.min(14, Math.round(Number(raw.householdSize))))
      : people.length;

  return {
    ok: true,
    input: {
      zip,
      year,
      people,
      householdIncome,
      householdSize,
    },
  };
}
