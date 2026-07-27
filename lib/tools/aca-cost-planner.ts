/**
 * ACA / Marketplace total-cost planner (Phase 3B-1).
 *
 * Educational ranges only — not HealthCare.gov, not a quote, not underwriting.
 * Pre-existing conditions never affect premium math (ACA guaranteed issue).
 * Utilization inputs affect estimated out-of-pocket only.
 */

import type { ZipLocation } from '@/lib/tools/zip-resolve';

export const ACA_PLANNER_META = {
  planYear: 2026,
  /** HHS poverty guidelines used for educational FPL math */
  fplGuidelineYear: 2025,
  fplSource: 'HHS Federal Poverty Guidelines (48 contiguous states + DC), 2025',
  premiumBasis:
    'State-adjusted marketplace average premium baselines derived from publicly reported KFF / CMS marketplace average premium patterns (educational reconstruction — not live plan quotes)',
  ageCurveNote: 'Simplified CMS ACA age rating curve (3:1 adult band, ages 0–64)',
  lastReviewed: '2026-07',
  disclaimer:
    'Estimates only. Verify premiums, subsidies, networks, and enrollment on HealthCare.gov or your state marketplace before enrolling.',
} as const;

/** 2025 HHS FPL (contiguous US) — used for 2026 plan-year educational context */
const FPL_BASE_1 = 15650;
const FPL_INCREMENT = 5500;

export type SituationId =
  | 'shopping-aca'
  | 'lost-coverage'
  | 'self-employed'
  | 'just-researching'
  | 'turning-65'
  | 'medicare-review';

export type HouseholdShape = 'just-me' | 'me-spouse' | 'me-children' | 'family';

export type UtilizationLevel = 'low' | 'moderate' | 'high' | 'very-high';

export type PriorityId =
  | 'lowest-premium'
  | 'lowest-oop'
  | 'balanced'
  | 'doctors'
  | 'prescriptions';

export type MetalPath = 'bronze' | 'silver' | 'gold';

export type PersonInput = {
  age: number;
  tobacco?: boolean;
};

export type PlannerInput = {
  situation: SituationId;
  location: ZipLocation;
  householdShape: HouseholdShape;
  people: PersonInput[];
  /** Tax household size for FPL / subsidy context */
  householdSize: number;
  annualIncome: number | null;
  utilization: UtilizationLevel;
  prescriptions: boolean;
  majorCare: boolean;
  priority: PriorityId;
};

export type SubsidyContext = {
  fplAmount: number;
  fplRatio: number | null;
  mayQualifyPtc: boolean | null;
  mayQualifyCsr: boolean | null;
  expectedContributionPct: number | null;
  expectedContributionAnnual: number | null;
  estimatedAnnualPtc: number | null;
  summary: string;
};

export type PathEstimate = {
  id: MetalPath;
  label: string;
  tagline: string;
  fits: string;
  monthlyPremiumGross: { low: number; high: number };
  monthlyPremiumNet: { low: number; high: number };
  annualPremiumNet: { low: number; high: number };
  deductibleRange: { low: number; high: number };
  maxOopRange: { low: number; high: number };
  expectedOop: { low: number; high: number };
  totalAnnualCost: { low: number; high: number };
  csrApplied: boolean;
};

export type PlannerResult = {
  meta: typeof ACA_PLANNER_META;
  location: ZipLocation;
  assumptions: string[];
  subsidy: SubsidyContext;
  paths: PathEstimate[];
  recommendedPathId: MetalPath;
  summaryMonthlyNet: { low: number; high: number };
  summaryTotalAnnual: { low: number; high: number };
  medicareRoute: boolean;
};

/** Relative unsubsidized premium vs Silver benchmark */
const METAL_PREMIUM_FACTOR: Record<MetalPath, number> = {
  bronze: 0.84,
  silver: 1,
  gold: 1.2,
};

/** Typical individual deductible / max OOP bands (pre-CSR), educational */
const METAL_COST_SHARE: Record<
  MetalPath,
  { ded: [number, number]; moop: [number, number] }
> = {
  bronze: { ded: [5500, 7500], moop: [7500, 9200] },
  silver: { ded: [3500, 5500], moop: [7000, 9100] },
  gold: { ded: [1000, 2500], moop: [4500, 7000] },
};

/** CSR silver OOP compression when FPL suggests CSR eligibility */
const CSR_SILVER: { ded: [number, number]; moop: [number, number] } = {
  ded: [0, 2500],
  moop: [1200, 3500],
};

/**
 * State factor vs national baseline (~1.0).
 * Higher = higher typical marketplace premiums.
 */
const STATE_PREMIUM_FACTOR: Record<string, number> = {
  FL: 1.08,
  TX: 0.98,
  CA: 1.05,
  NY: 1.22,
  NJ: 1.18,
  CT: 1.15,
  MA: 1.12,
  IL: 1.05,
  GA: 1.02,
  NC: 1.0,
  SC: 1.04,
  VA: 0.98,
  MD: 1.02,
  PA: 1.04,
  OH: 0.95,
  MI: 0.96,
  AZ: 1.0,
  CO: 1.02,
  WA: 1.04,
  OR: 1.03,
  NV: 1.06,
  TN: 1.0,
  AL: 1.05,
  MS: 1.08,
  LA: 1.1,
  OK: 1.06,
  AR: 1.02,
  MO: 1.04,
  KS: 1.0,
  NE: 1.05,
  IA: 0.98,
  MN: 0.95,
  WI: 1.0,
  IN: 0.97,
  KY: 1.02,
  WV: 1.12,
  DC: 1.08,
  HI: 0.85,
  AK: 1.35,
  WY: 1.2,
  MT: 1.15,
  ID: 1.0,
  UT: 0.92,
  NM: 0.95,
  ND: 1.1,
  SD: 1.08,
  DE: 1.1,
  RI: 1.08,
  NH: 1.05,
  ME: 1.08,
  VT: 1.1,
};

/** National educational baseline: unsubsidized Silver monthly premium at age 21 */
const BASE_SILVER_21_MONTHLY = 355;

/**
 * Simplified adult age curve (ACA 3:1). Pediatric simplified.
 */
export function ageRatingFactor(age: number): number {
  const a = Math.min(64, Math.max(0, Math.round(age)));
  if (a <= 14) return 0.765;
  if (a <= 20) return 0.765 + (a - 14) * 0.03;
  // Piecewise toward 3.0 at 64
  const table: Array<[number, number]> = [
    [21, 1.0],
    [25, 1.004],
    [30, 1.135],
    [35, 1.222],
    [40, 1.278],
    [45, 1.444],
    [50, 1.786],
    [55, 2.226],
    [60, 2.704],
    [64, 3.0],
  ];
  if (a <= 21) return 1.0;
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, f0] = table[i];
    const [a1, f1] = table[i + 1];
    if (a <= a1) {
      const t = (a - a0) / (a1 - a0);
      return f0 + t * (f1 - f0);
    }
  }
  return 3.0;
}

export function fplForHousehold(size: number): number {
  const n = Math.max(1, Math.min(12, Math.round(size)));
  return FPL_BASE_1 + (n - 1) * FPL_INCREMENT;
}

/**
 * Enhanced PTC required contribution % of income (IRA-style educational table).
 */
export function requiredContributionPercent(fplRatio: number): number {
  if (fplRatio <= 1.5) return 0;
  if (fplRatio <= 2.0) return lerp(0, 2, (fplRatio - 1.5) / 0.5);
  if (fplRatio <= 2.5) return lerp(2, 4, (fplRatio - 2.0) / 0.5);
  if (fplRatio <= 3.0) return lerp(4, 6, (fplRatio - 2.5) / 0.5);
  if (fplRatio <= 4.0) return lerp(6, 8.5, (fplRatio - 3.0) / 1.0);
  return 8.5;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function utilizationOopShare(level: UtilizationLevel, majorCare: boolean, rx: boolean): number {
  const base: Record<UtilizationLevel, number> = {
    low: 0.08,
    moderate: 0.28,
    high: 0.55,
    'very-high': 0.82,
  };
  let s = base[level];
  if (majorCare) s = Math.min(0.95, s + 0.18);
  if (rx) s = Math.min(0.95, s + 0.06);
  return s;
}

function defaultPeople(shape: HouseholdShape, ages: number[]): PersonInput[] {
  if (ages.length > 0) {
    return ages.map((age) => ({ age: clampAge(age) }));
  }
  switch (shape) {
    case 'just-me':
      return [{ age: 40 }];
    case 'me-spouse':
      return [{ age: 42 }, { age: 40 }];
    case 'me-children':
      return [{ age: 38 }, { age: 10 }, { age: 8 }];
    case 'family':
      return [{ age: 42 }, { age: 40 }, { age: 12 }, { age: 8 }];
  }
}

function clampAge(age: number): number {
  if (Number.isNaN(age)) return 40;
  return Math.min(64, Math.max(0, Math.round(age)));
}

export function defaultHouseholdSize(shape: HouseholdShape): number {
  switch (shape) {
    case 'just-me':
      return 1;
    case 'me-spouse':
      return 2;
    case 'me-children':
      return 3;
    case 'family':
      return 4;
  }
}

export function isMedicareSituation(situation: SituationId): boolean {
  return situation === 'turning-65' || situation === 'medicare-review';
}

function monthlyGrossForPath(
  people: PersonInput[],
  stateCode: string,
  metal: MetalPath
): number {
  const stateFactor = STATE_PREMIUM_FACTOR[stateCode] ?? 1.0;
  const metalFactor = METAL_PREMIUM_FACTOR[metal];
  let total = 0;
  for (const p of people) {
    const tobacco = p.tobacco ? 1.15 : 1;
    total +=
      BASE_SILVER_21_MONTHLY *
      ageRatingFactor(p.age) *
      stateFactor *
      metalFactor *
      tobacco;
  }
  return total;
}

function applyBand(value: number, spread = 0.12): { low: number; high: number } {
  return {
    low: Math.round(value * (1 - spread)),
    high: Math.round(value * (1 + spread)),
  };
}

function moneyBandAdd(
  a: { low: number; high: number },
  b: { low: number; high: number }
): { low: number; high: number } {
  return { low: a.low + b.low, high: a.high + b.high };
}

export function buildPlannerResult(input: PlannerInput): PlannerResult {
  const people =
    input.people.length > 0
      ? input.people.map((p) => ({ ...p, age: clampAge(p.age) }))
      : defaultPeople(input.householdShape, []);

  const householdSize = Math.max(people.length, input.householdSize, 1);
  const fplAmount = fplForHousehold(householdSize);
  const income = input.annualIncome != null && input.annualIncome > 0 ? input.annualIncome : null;
  const fplRatio = income != null ? income / fplAmount : null;

  const silverMonthly = monthlyGrossForPath(people, input.location.stateCode, 'silver');
  const silverAnnual = silverMonthly * 12;

  let expectedContributionPct: number | null = null;
  let expectedContributionAnnual: number | null = null;
  let estimatedAnnualPtc: number | null = null;
  let mayQualifyPtc: boolean | null = null;
  let mayQualifyCsr: boolean | null = null;
  let subsidySummary: string;

  if (fplRatio == null) {
    subsidySummary =
      'No income entered — showing unsubsidized premium ranges. Add household income to see premium tax credit context.';
  } else {
    expectedContributionPct = requiredContributionPercent(fplRatio);
    expectedContributionAnnual = Math.round(income! * (expectedContributionPct / 100));
    estimatedAnnualPtc = Math.max(0, Math.round(silverAnnual - expectedContributionAnnual));
    mayQualifyPtc = estimatedAnnualPtc > 0 || fplRatio <= 4.0;
    mayQualifyCsr = fplRatio >= 1.0 && fplRatio <= 2.5;
    if (fplRatio < 1.0) {
      subsidySummary = `About ${fplRatio.toFixed(2)}× FPL — you may qualify for Medicaid or marketplace subsidies depending on your state. Confirm eligibility on HealthCare.gov or your state agency.`;
      mayQualifyPtc = true;
      mayQualifyCsr = true;
    } else if (mayQualifyCsr) {
      subsidySummary = `About ${fplRatio.toFixed(2)}× FPL — you may qualify for premium tax credits and cost-sharing reductions on Silver plans (lower deductibles). Not a determination.`;
    } else if (estimatedAnnualPtc > 0) {
      subsidySummary = `About ${fplRatio.toFixed(2)}× FPL — educational estimate suggests premium tax credits may reduce monthly cost (benchmark-based). Confirm on HealthCare.gov.`;
    } else {
      subsidySummary = `About ${fplRatio.toFixed(2)}× FPL — subsidies may be limited. You can still compare metal tiers by total annual cost.`;
      mayQualifyPtc = false;
    }
  }

  const oopShare = utilizationOopShare(input.utilization, input.majorCare, input.prescriptions);
  const csrLikely = mayQualifyCsr === true;

  const pathDefs: Array<{
    id: MetalPath;
    label: string;
    tagline: string;
    fits: string;
  }> = [
    {
      id: 'bronze',
      label: 'Lowest monthly premium path',
      tagline: 'Bronze-like protection',
      fits: 'Often fits healthy households who want the lowest monthly bill and can handle a higher deductible if care is needed.',
    },
    {
      id: 'silver',
      label: 'Balanced path',
      tagline: 'Silver-like protection',
      fits: 'Often the best total-cost middle ground — and the only metal tier where cost-sharing reductions apply if you qualify.',
    },
    {
      id: 'gold',
      label: 'Lower out-of-pocket path',
      tagline: 'Gold-like protection',
      fits: 'Often fits higher expected care, regular prescriptions, or anyone who prioritizes lower deductibles over the cheapest premium.',
    },
  ];

  const paths: PathEstimate[] = pathDefs.map((def) => {
    const grossMonthly = monthlyGrossForPath(people, input.location.stateCode, def.id);
    const grossAnnual = grossMonthly * 12;
    const ptc =
      estimatedAnnualPtc != null
        ? Math.min(estimatedAnnualPtc, Math.round(grossAnnual))
        : 0;
    const netAnnual = Math.max(0, grossAnnual - ptc);
    const netMonthly = netAnnual / 12;

    const csrApplied = def.id === 'silver' && csrLikely;
    const share = csrApplied ? CSR_SILVER : METAL_COST_SHARE[def.id];
    // Scale deductible-ish exposure by household (simple: +40% per additional person, cap 2.2×)
    const hhScale = Math.min(2.2, 1 + (people.length - 1) * 0.4);
    const ded = {
      low: Math.round(share.ded[0] * hhScale),
      high: Math.round(share.ded[1] * hhScale),
    };
    const moop = {
      low: Math.round(share.moop[0] * hhScale),
      high: Math.round(share.moop[1] * hhScale),
    };
    const expectedOop = {
      low: Math.round(moop.low * oopShare * 0.85),
      high: Math.round(moop.high * oopShare * 1.05),
    };

    const monthlyGrossBand = applyBand(grossMonthly, 0.1);
    const monthlyNetBand = applyBand(netMonthly, 0.1);
    const annualNetBand = {
      low: monthlyNetBand.low * 12,
      high: monthlyNetBand.high * 12,
    };
    const totalAnnual = moneyBandAdd(annualNetBand, expectedOop);

    return {
      id: def.id,
      label: def.label,
      tagline: def.tagline,
      fits: def.fits,
      monthlyPremiumGross: monthlyGrossBand,
      monthlyPremiumNet: monthlyNetBand,
      annualPremiumNet: annualNetBand,
      deductibleRange: ded,
      maxOopRange: moop,
      expectedOop,
      totalAnnualCost: totalAnnual,
      csrApplied,
    };
  });

  // Recommend by priority + utilization
  let recommended: MetalPath = 'silver';
  if (input.priority === 'lowest-premium') recommended = 'bronze';
  else if (input.priority === 'lowest-oop' || input.priority === 'prescriptions')
    recommended = 'gold';
  else if (input.priority === 'balanced' || input.priority === 'doctors') recommended = 'silver';

  if (input.utilization === 'very-high' || input.majorCare) {
    if (recommended === 'bronze') recommended = 'silver';
    if (input.utilization === 'very-high') recommended = 'gold';
  }
  if (csrLikely && input.priority !== 'lowest-premium') {
    // CSR makes silver especially attractive
    if (recommended === 'bronze') recommended = 'silver';
  }

  const rec = paths.find((p) => p.id === recommended) ?? paths[1];

  const assumptions: string[] = [
    `Marketplace plan year context: ${ACA_PLANNER_META.planYear}`,
    `Location: ${input.location.displayLabel}`,
    `Household members modeled: ${people.map((p) => `age ${p.age}`).join(', ')}`,
    `Healthcare use assumption: ${input.utilization}${input.prescriptions ? ', regular prescriptions' : ''}${input.majorCare ? ', upcoming major care' : ''}`,
    `Priority: ${input.priority}`,
    'Pre-existing conditions are not used to raise premiums (ACA rule).',
    income != null
      ? `Household income entered: $${income.toLocaleString()} (educational subsidy math only)`
      : 'No income entered — unsubsidized premium view',
  ];

  return {
    meta: ACA_PLANNER_META,
    location: input.location,
    assumptions,
    subsidy: {
      fplAmount,
      fplRatio,
      mayQualifyPtc,
      mayQualifyCsr,
      expectedContributionPct,
      expectedContributionAnnual,
      estimatedAnnualPtc,
      summary: subsidySummary,
    },
    paths,
    recommendedPathId: recommended,
    summaryMonthlyNet: rec.monthlyPremiumNet,
    summaryTotalAnnual: rec.totalAnnualCost,
    medicareRoute: isMedicareSituation(input.situation),
  };
}

export function formatMoneyRange(range: { low: number; high: number }, per?: 'mo' | 'yr'): string {
  const suffix = per === 'mo' ? '/mo' : per === 'yr' ? '/yr' : '';
  if (range.low === range.high) return `$${range.low.toLocaleString()}${suffix}`;
  return `$${range.low.toLocaleString()}–$${range.high.toLocaleString()}${suffix}`;
}

export const SITUATIONS: Array<{ id: SituationId; label: string; hint: string }> = [
  { id: 'shopping-aca', label: 'Shopping for ACA / Marketplace coverage', hint: 'Individual or family marketplace plans' },
  { id: 'lost-coverage', label: 'Lost job or other coverage', hint: 'May qualify for a special enrollment period' },
  { id: 'self-employed', label: 'Self-employed / no employer plan', hint: 'Marketplace is a common path' },
  { id: 'just-researching', label: 'Just researching options', hint: 'Explore total-cost scenarios' },
  { id: 'turning-65', label: 'Turning 65 / new to Medicare', hint: 'Medicare tools may fit better' },
  { id: 'medicare-review', label: 'Reviewing Medicare coverage', hint: 'See our Medicare research tools' },
];

export const HOUSEHOLD_SHAPES: Array<{ id: HouseholdShape; label: string }> = [
  { id: 'just-me', label: 'Just me' },
  { id: 'me-spouse', label: 'Me + spouse/partner' },
  { id: 'me-children', label: 'Me + child(ren)' },
  { id: 'family', label: 'Family (me + spouse + child(ren))' },
];

export const UTILIZATION_LEVELS: Array<{ id: UtilizationLevel; label: string; detail: string }> = [
  { id: 'low', label: 'Low', detail: 'Rare visits; mostly preventive care' },
  { id: 'moderate', label: 'Moderate', detail: 'A few visits or minor needs most years' },
  { id: 'high', label: 'High', detail: 'Ongoing care, specialists, or frequent visits' },
  { id: 'very-high', label: 'Very high', detail: 'Complex care, hospital risk, or intensive treatment' },
];

export const PRIORITIES: Array<{ id: PriorityId; label: string }> = [
  { id: 'lowest-premium', label: 'Lowest monthly premium' },
  { id: 'lowest-oop', label: 'Lowest deductible / out-of-pocket exposure' },
  { id: 'balanced', label: 'Best balance of premium + protection' },
  { id: 'doctors', label: 'Keeping doctors / broader network (guidance only for now)' },
  { id: 'prescriptions', label: 'Prescription coverage (guidance only for now)' },
];
