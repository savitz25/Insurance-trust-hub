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
  /** Median after estimated credit when available */
  medianAfterCreditMonthly: number | null;
  deductibleLow: number | null;
  deductibleHigh: number | null;
  moopLow: number | null;
  moopHigh: number | null;
  sampleIssuers: string[];
  /** Representative plan (lowest premium with a name) */
  samplePlan: { id: string; name: string; issuerName: string } | null;
  /** Median-premium plan example when ≥2 plans (balanced path) */
  medianPlan: { id: string; name: string; issuerName: string } | null;
};

/**
 * Research path selection for planners (deterministic heuristics).
 * See lib/marketplace/README.md and docs/MARKETPLACE-API-PHASE-2.md.
 */
export type ResearchPathId = 'lowest' | 'balanced' | 'higher_protection';

export type ResearchPathCard = {
  id: ResearchPathId;
  /** Consumer-facing label */
  label: string;
  /** Metal used for this path when live data exists */
  metal: 'Bronze' | 'Silver' | 'Gold' | null;
  /** Why this metal was chosen (or why path is educational-only) */
  heuristicNote: string;
  premiumMonthly: number | null;
  premiumAfterCreditMonthly: number | null;
  deductible: number | null;
  moop: number | null;
  planName: string | null;
  issuerName: string | null;
  planId: string | null;
  planCountInMetal: number;
  available: boolean;
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
  moopSpread: { low: number | null; high: number | null };
  /** Deterministic 3-path research cards from live CMS data */
  researchPaths: ResearchPathCard[];
  /** Short consumer Q&A narrative when live */
  narrative: {
    howManyPlans: string;
    lowerPremium: string;
    moreProtective: string;
    assistance: string;
  } | null;
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

function planRef(p: MarketplacePlanCard): {
  id: string;
  name: string;
  issuerName: string;
} {
  return {
    id: p.id,
    name: p.name || 'Plan name not listed',
    issuerName: p.issuerName || 'Issuer not listed',
  };
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

  // Stable sort: premium asc, then id for determinism when premiums tie
  const byPrem = [...subset]
    .filter((p) => p.premiumMonthly != null)
    .sort((a, b) => {
      const d = (a.premiumMonthly ?? 0) - (b.premiumMonthly ?? 0);
      if (d !== 0) return d;
      return String(a.id).localeCompare(String(b.id));
    });
  const best = byPrem[0] ?? subset[0]!;
  const midIdx = Math.floor(byPrem.length / 2);
  const midPlan = byPrem.length >= 2 ? byPrem[midIdx]! : null;

  const issuers = [...new Set(subset.map((p) => p.issuerName).filter(Boolean))].slice(0, 6);

  return {
    metal,
    planCount: subset.length,
    lowestPremiumMonthly: premiums[0] ?? null,
    medianPremiumMonthly: median(premiums),
    lowestAfterCreditMonthly: after[0] ?? null,
    medianAfterCreditMonthly: median(after),
    deductibleLow: deds[0] ?? null,
    deductibleHigh: deds.length ? deds[deds.length - 1]! : null,
    moopLow: moops[0] ?? null,
    moopHigh: moops.length ? moops[moops.length - 1]! : null,
    sampleIssuers: issuers,
    samplePlan: planRef(best),
    medianPlan: midPlan ? planRef(midPlan) : null,
  };
}

/**
 * Path heuristics (documented for Phase 2 UI):
 * - Lowest premium → lowest-premium Bronze plan; if no Bronze, lowest overall premium plan’s metal.
 * - Balanced → median-premium Silver (or single Silver); if no Silver, median overall premium plan.
 * - Higher protection → lowest-premium Gold; if no Gold, highest-metal available with lowest premium
 *   in that metal (Silver before Bronze). Never invent Gold when CMS returns none.
 */
function buildResearchPaths(
  plans: MarketplacePlanCard[],
  bronze: MetalLandscapeSlice | null,
  silver: MetalLandscapeSlice | null,
  gold: MetalLandscapeSlice | null
): ResearchPathCard[] {
  const withPrem = plans.filter((p) => p.premiumMonthly != null);
  const byPremAsc = [...withPrem].sort((a, b) => {
    const d = (a.premiumMonthly ?? 0) - (b.premiumMonthly ?? 0);
    if (d !== 0) return d;
    return String(a.id).localeCompare(String(b.id));
  });

  // Lowest path
  let lowest: ResearchPathCard;
  if (bronze?.samplePlan && bronze.lowestPremiumMonthly != null) {
    lowest = {
      id: 'lowest',
      label: 'Lowest premium path',
      metal: 'Bronze',
      heuristicNote:
        'Lowest full premium among Bronze plans returned for this household and place.',
      premiumMonthly: bronze.lowestPremiumMonthly,
      premiumAfterCreditMonthly: bronze.lowestAfterCreditMonthly,
      deductible: bronze.deductibleLow,
      moop: bronze.moopLow,
      planName: bronze.samplePlan.name,
      issuerName: bronze.samplePlan.issuerName,
      planId: bronze.samplePlan.id,
      planCountInMetal: bronze.planCount,
      available: true,
    };
  } else if (byPremAsc[0]) {
    const p = byPremAsc[0]!;
    const m = metalOf(p.metalLevel);
    lowest = {
      id: 'lowest',
      label: 'Lowest premium path',
      metal: m,
      heuristicNote: m
        ? `No Bronze in this market response — using lowest-premium ${m} plan instead.`
        : 'Lowest-premium plan among all metals returned (metal label incomplete).',
      premiumMonthly: p.premiumMonthly,
      premiumAfterCreditMonthly: p.estimatedPremiumAfterCreditMonthly,
      deductible: p.deductibleIndividual,
      moop: p.moopIndividual,
      planName: p.name || null,
      issuerName: p.issuerName || null,
      planId: p.id,
      planCountInMetal: m
        ? plans.filter((x) => metalOf(x.metalLevel) === m).length
        : plans.length,
      available: true,
    };
  } else {
    lowest = {
      id: 'lowest',
      label: 'Lowest premium path',
      metal: null,
      heuristicNote: 'Premium fields incomplete in CMS response for this market.',
      premiumMonthly: null,
      premiumAfterCreditMonthly: null,
      deductible: null,
      moop: null,
      planName: null,
      issuerName: null,
      planId: null,
      planCountInMetal: 0,
      available: false,
    };
  }

  // Balanced path
  let balanced: ResearchPathCard;
  if (silver) {
    const useMedian = silver.medianPlan && silver.medianPremiumMonthly != null;
    const ref = useMedian ? silver.medianPlan! : silver.samplePlan;
    balanced = {
      id: 'balanced',
      label: 'Balanced path',
      metal: 'Silver',
      heuristicNote: useMedian
        ? 'Median-premium Silver plan (stable middle of local Silver premiums).'
        : 'Only one Silver-style anchor available — using lowest Silver premium.',
      premiumMonthly: useMedian
        ? silver.medianPremiumMonthly
        : silver.lowestPremiumMonthly,
      premiumAfterCreditMonthly: useMedian
        ? silver.medianAfterCreditMonthly
        : silver.lowestAfterCreditMonthly,
      deductible:
        silver.deductibleLow != null && silver.deductibleHigh != null
          ? Math.round((silver.deductibleLow + silver.deductibleHigh) / 2)
          : silver.deductibleLow,
      moop:
        silver.moopLow != null && silver.moopHigh != null
          ? Math.round((silver.moopLow + silver.moopHigh) / 2)
          : silver.moopLow,
      planName: ref?.name ?? null,
      issuerName: ref?.issuerName ?? null,
      planId: ref?.id ?? null,
      planCountInMetal: silver.planCount,
      available: silver.lowestPremiumMonthly != null || silver.medianPremiumMonthly != null,
    };
  } else if (byPremAsc.length) {
    const mid = byPremAsc[Math.floor(byPremAsc.length / 2)]!;
    const m = metalOf(mid.metalLevel);
    balanced = {
      id: 'balanced',
      label: 'Balanced path',
      metal: m,
      heuristicNote:
        'No Silver plans in this CMS response — using median overall premium plan as a balanced stand-in.',
      premiumMonthly: mid.premiumMonthly,
      premiumAfterCreditMonthly: mid.estimatedPremiumAfterCreditMonthly,
      deductible: mid.deductibleIndividual,
      moop: mid.moopIndividual,
      planName: mid.name || null,
      issuerName: mid.issuerName || null,
      planId: mid.id,
      planCountInMetal: m
        ? plans.filter((x) => metalOf(x.metalLevel) === m).length
        : plans.length,
      available: true,
    };
  } else {
    balanced = {
      id: 'balanced',
      label: 'Balanced path',
      metal: null,
      heuristicNote: 'Not enough plan data for a balanced path example.',
      premiumMonthly: null,
      premiumAfterCreditMonthly: null,
      deductible: null,
      moop: null,
      planName: null,
      issuerName: null,
      planId: null,
      planCountInMetal: 0,
      available: false,
    };
  }

  // Higher protection — never invent Gold
  let higher: ResearchPathCard;
  if (gold?.samplePlan && gold.lowestPremiumMonthly != null) {
    higher = {
      id: 'higher_protection',
      label: 'Higher protection path',
      metal: 'Gold',
      heuristicNote:
        'Lowest full premium among Gold plans (richer actuarial value than Silver/Bronze).',
      premiumMonthly: gold.lowestPremiumMonthly,
      premiumAfterCreditMonthly: gold.lowestAfterCreditMonthly,
      deductible: gold.deductibleLow,
      moop: gold.moopLow,
      planName: gold.samplePlan.name,
      issuerName: gold.samplePlan.issuerName,
      planId: gold.samplePlan.id,
      planCountInMetal: gold.planCount,
      available: true,
    };
  } else if (silver?.samplePlan && silver.lowestPremiumMonthly != null) {
    higher = {
      id: 'higher_protection',
      label: 'Higher protection path',
      metal: 'Silver',
      heuristicNote:
        'No Gold plans in this CMS response — using lowest Silver as the more protective available metal (not invented Gold).',
      premiumMonthly: silver.lowestPremiumMonthly,
      premiumAfterCreditMonthly: silver.lowestAfterCreditMonthly,
      deductible: silver.deductibleLow,
      moop: silver.moopLow,
      planName: silver.samplePlan.name,
      issuerName: silver.samplePlan.issuerName,
      planId: silver.samplePlan.id,
      planCountInMetal: silver.planCount,
      available: true,
    };
  } else if (bronze?.samplePlan && bronze.lowestPremiumMonthly != null) {
    higher = {
      id: 'higher_protection',
      label: 'Higher protection path',
      metal: 'Bronze',
      heuristicNote:
        'Only Bronze-style plans in this response — showing lowest Bronze (limited protection tier).',
      premiumMonthly: bronze.lowestPremiumMonthly,
      premiumAfterCreditMonthly: bronze.lowestAfterCreditMonthly,
      deductible: bronze.deductibleLow,
      moop: bronze.moopLow,
      planName: bronze.samplePlan.name,
      issuerName: bronze.samplePlan.issuerName,
      planId: bronze.samplePlan.id,
      planCountInMetal: bronze.planCount,
      available: true,
    };
  } else {
    higher = {
      id: 'higher_protection',
      label: 'Higher protection path',
      metal: null,
      heuristicNote: 'No higher-protection metal example available in this CMS response.',
      premiumMonthly: null,
      premiumAfterCreditMonthly: null,
      deductible: null,
      moop: null,
      planName: null,
      issuerName: null,
      planId: null,
      planCountInMetal: 0,
      available: false,
    };
  }

  return [lowest, balanced, higher];
}

function buildNarrative(
  landscape: Pick<
    LocalMarketplaceLandscape,
    | 'planCount'
    | 'issuerCount'
    | 'locationLabel'
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'researchPaths'
    | 'creditContext'
    | 'planYear'
  >
): LocalMarketplaceLandscape['narrative'] {
  const place = landscape.locationLabel || 'this ZIP';
  const fmt = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? `$${Math.round(n).toLocaleString()}` : null;

  const lowest = landscape.researchPaths.find((p) => p.id === 'lowest');
  const higher = landscape.researchPaths.find((p) => p.id === 'higher_protection');
  const balanced = landscape.researchPaths.find((p) => p.id === 'balanced');

  const lowPrem = fmt(lowest?.premiumAfterCreditMonthly ?? lowest?.premiumMonthly);
  const highPrem = fmt(higher?.premiumAfterCreditMonthly ?? higher?.premiumMonthly);
  const balPrem = fmt(balanced?.premiumAfterCreditMonthly ?? balanced?.premiumMonthly);

  const credit = landscape.creditContext?.estimatedMonthlyCredit;
  const creditTxt =
    credit != null && credit > 0
      ? `Educational assistance context suggests roughly $${credit.toLocaleString()}/mo in premium tax credit for your household inputs — not an official award.`
      : landscape.creditContext?.note ||
        'Add household income to see educational premium tax credit context for this market.';

  return {
    howManyPlans: `CMS Marketplace data for plan year ${landscape.planYear} lists about ${landscape.planCount} individual-market plan${landscape.planCount === 1 ? '' : 's'} from ${landscape.issuerCount} issuer${landscape.issuerCount === 1 ? '' : 's'} around ${place}.`,
    lowerPremium: lowPrem
      ? `A lower-premium research path in this market is often ${lowest?.metal ?? 'metal-tier'} style, with an educational full premium near ${lowPrem}/mo${lowest?.issuerName ? ` (example issuer: ${lowest.issuerName})` : ''}.`
      : 'A clear lower-premium plan example was not available in this CMS response — compare educational baselines or open HealthCare.gov.',
    moreProtective: highPrem
      ? `A more protective research path${higher?.metal ? ` (${higher.metal})` : ''} often runs near ${highPrem}/mo before official credits${higher?.metal === 'Gold' ? '' : higher?.metal ? ' — Gold was not listed here, so we used the most protective metal CMS returned' : ''}.`
      : 'A higher-protection plan example was not available in this CMS response.',
    assistance: creditTxt + (balPrem ? ` Balanced (often Silver) local premium context is near ${balPrem}/mo.` : ''),
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
    moopSpread: { low: null, high: null },
    researchPaths: [],
    narrative: null,
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
  // Only real Gold from CMS — never invent a Gold tier
  const gold = sliceMetal('Gold', plans);

  const silverPremiums = sortedNums(
    plans
      .filter((p) => p.metalLevel === 'Silver')
      .map((p) => p.premiumMonthly)
  );
  const allPrem = sortedNums(plans.map((p) => p.premiumMonthly));
  const allDed = sortedNums(plans.map((p) => p.deductibleIndividual));
  const allMoop = sortedNums(plans.map((p) => p.moopIndividual));
  const issuers = [...new Set(plans.map((p) => p.issuerName).filter(Boolean))].sort();
  const researchPaths = buildResearchPaths(plans, bronze, silver, gold);

  const base = {
    ok: true as const,
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
    moopSpread: {
      low: allMoop[0] ?? null,
      high: allMoop.length ? allMoop[allMoop.length - 1]! : null,
    },
    researchPaths,
    locationLabel: search.locationLabel,
    planYear: year,
    retrievedAt: search.provenance.retrievedAt,
    sourceSystem: 'cms_marketplace_api' as const,
    usedLiveApi: true,
    fallbackReason: null,
    creditContext: search.creditContext,
    searchOk: true,
  };

  return {
    ...base,
    narrative: buildNarrative(base),
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
