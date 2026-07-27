/**
 * ACA Coverage & Savings Planner — educational PTC / CSR / local cost estimates.
 *
 * Plan year 2026 educational rules: statutory premium tax credit structure with
 * a restored 400% FPL cliff (enhanced IRA subsidies applied through 2025).
 * Not HealthCare.gov. Not a quote. Client-side only — inputs are not stored.
 */

import type { ZipLocation } from '@/lib/tools/zip-resolve';
import {
  ageRatingFactor,
  formatMoneyRange,
  fplForHousehold,
} from '@/lib/tools/aca-cost-planner';

export const ACA_SAVINGS_META = {
  planYear: 2026,
  fplGuidelineYear: 2025,
  fplSource: 'HHS Federal Poverty Guidelines (48 contiguous states + DC), 2025',
  /** Enhanced IRA PTC (no 400% cliff) applied through coverage year 2025. */
  ruleSet: 'statutory-2026-with-400-fpl-cliff' as const,
  ruleNote:
    'Educational model for plan year 2026 uses the statutory premium tax credit applicable-percentage schedule with no subsidy above 400% FPL (the “subsidy cliff”). Enhanced Inflation Reduction Act subsidies without a cliff applied through 2025. Confirm current law and official awards on the Marketplace.',
  premiumBasis:
    'State-adjusted marketplace average premium baselines (educational reconstruction from public KFF/CMS average patterns — not live plan quotes or SLCSP filings)',
  lastReviewed: '2026-07',
  disclaimer:
    'Estimates only. Official eligibility, SLCSP, and enrollment are determined on HealthCare.gov or your state marketplace.',
} as const;

/** National educational baseline: unsubsidized Silver monthly at age 21 */
const BASE_SILVER_21_MONTHLY = 355;

const METAL_PREMIUM_FACTOR = { bronze: 0.84, silver: 1, gold: 1.2 } as const;

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

export type IncomeConfidence = 'very' | 'somewhat' | 'variable';

export type PersonInput = {
  age: number;
  tobacco?: boolean;
};

export type SubsidyPlannerInput = {
  location: ZipLocation;
  people: PersonInput[];
  /** Tax household size for FPL (may differ from applicants on plan) */
  householdSize: number;
  annualIncome: number;
  incomeConfidence?: IncomeConfidence;
};

export type MoneyRange = { low: number; high: number };

export type MetalPathId = 'bronze' | 'silver' | 'gold';

export type PathScenario = {
  id: MetalPathId;
  label: string;
  tagline: string;
  fits: string;
  monthlyGross: MoneyRange;
  monthlyNet: MoneyRange;
  annualNet: MoneyRange;
  csrNote?: string;
};

export type SubsidyPlannerResult = {
  meta: typeof ACA_SAVINGS_META;
  location: ZipLocation;
  fplAmount: number;
  fplRatio: number;
  fplPercentLabel: string;
  /** Statutory applicable % of income for benchmark Silver (null if no PTC) */
  applicablePct: number | null;
  expectedContributionAnnual: number | null;
  expectedContributionMonthly: number | null;
  estimatedPtcAnnual: MoneyRange | null;
  estimatedPtcMonthly: MoneyRange | null;
  qualifiesPtc: boolean;
  qualifiesCsr: boolean;
  csrTier: 'none' | '94' | '87' | '73' | 'below-range' | 'above-range';
  csrSummary: string;
  zeroPremiumPossible: boolean;
  cliff: {
    status: 'below' | 'near-below' | 'near-above' | 'above';
    thresholdIncome: number;
    dollarsFromThreshold: number;
    message: string;
    reverseMessage: string | null;
  };
  assistanceSummary: string;
  localCostNarrative: string;
  paths: PathScenario[];
  assumptions: string[];
  incomeConfidenceNote: string | null;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/**
 * Statutory applicable percentage of household income for the second-lowest-cost
 * Silver plan (SLCSP) — educational reconstruction of the pre-IRA / post-2025 cliff schedule.
 * Returns null when income is outside PTC eligibility (below ~100% FPL or above 400% FPL).
 */
export function statutoryApplicablePercent(fplRatio: number): number | null {
  if (fplRatio < 1.0) return null; // typically Medicaid path or ineligible for PTC
  if (fplRatio > 4.0) return null; // 400% FPL cliff — no PTC
  if (fplRatio <= 1.33) return 2.0;
  if (fplRatio <= 1.5) return lerp(2.0, 3.0, (fplRatio - 1.33) / 0.17);
  if (fplRatio <= 2.0) return lerp(3.0, 4.0, (fplRatio - 1.5) / 0.5);
  if (fplRatio <= 2.5) return lerp(4.0, 6.3, (fplRatio - 2.0) / 0.5);
  if (fplRatio <= 3.0) return lerp(6.3, 8.05, (fplRatio - 2.5) / 0.5);
  if (fplRatio <= 4.0) return lerp(8.05, 9.5, (fplRatio - 3.0) / 1.0);
  return null;
}

/** CSR Silver tiers by FPL (100–250%). */
export function csrTierForFpl(fplRatio: number): SubsidyPlannerResult['csrTier'] {
  if (fplRatio < 1.0) return 'below-range';
  if (fplRatio <= 1.5) return '94';
  if (fplRatio <= 2.0) return '87';
  if (fplRatio <= 2.5) return '73';
  if (fplRatio <= 4.0) return 'above-range';
  return 'none';
}

function clampAge(age: number): number {
  if (Number.isNaN(age)) return 40;
  return Math.min(64, Math.max(0, Math.round(age)));
}

function monthlyGross(
  people: PersonInput[],
  stateCode: string,
  metal: MetalPathId
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

function band(value: number, spread = 0.1): MoneyRange {
  return {
    low: Math.max(0, Math.round(value * (1 - spread))),
    high: Math.round(value * (1 + spread)),
  };
}

function confidenceNote(c?: IncomeConfidence): string | null {
  if (c === 'very') return 'Income confidence: high — still verify final MAGI on the Marketplace.';
  if (c === 'somewhat')
    return 'Income confidence: moderate — small MAGI changes can move FPL position and assistance.';
  if (c === 'variable')
    return 'Income may vary (e.g. self-employed) — Marketplace reconciliation can claw back or refund credits. Estimate ranges are wider.';
  return null;
}

export function buildSubsidyPlannerResult(input: SubsidyPlannerInput): SubsidyPlannerResult {
  const people = input.people.map((p) => ({
    age: clampAge(p.age),
    tobacco: p.tobacco,
  }));
  const householdSize = Math.max(1, Math.min(12, Math.round(input.householdSize) || people.length));
  const income = Math.max(0, input.annualIncome);
  const fplAmount = fplForHousehold(householdSize);
  const fplRatio = income / fplAmount;
  const fplPercentLabel = `${Math.round(fplRatio * 100)}% FPL`;
  const threshold400 = fplAmount * 4;

  const applicablePct = statutoryApplicablePercent(fplRatio);
  const qualifiesPtc = applicablePct != null;
  const expectedContributionAnnual =
    qualifiesPtc && applicablePct != null ? Math.round(income * (applicablePct / 100)) : null;
  const expectedContributionMonthly =
    expectedContributionAnnual != null ? Math.round(expectedContributionAnnual / 12) : null;

  const silverMonthly = monthlyGross(people, input.location.stateCode, 'silver');
  const silverAnnual = silverMonthly * 12;

  let ptcAnnualMid: number | null = null;
  if (qualifiesPtc && expectedContributionAnnual != null) {
    ptcAnnualMid = Math.max(0, Math.round(silverAnnual - expectedContributionAnnual));
  }

  const confSpread =
    input.incomeConfidence === 'variable' ? 0.18 : input.incomeConfidence === 'somewhat' ? 0.14 : 0.1;

  const estimatedPtcAnnual =
    ptcAnnualMid != null
      ? {
          low: Math.max(0, Math.round(ptcAnnualMid * (1 - confSpread))),
          high: Math.round(ptcAnnualMid * (1 + confSpread)),
        }
      : null;
  const estimatedPtcMonthly =
    estimatedPtcAnnual != null
      ? {
          low: Math.round(estimatedPtcAnnual.low / 12),
          high: Math.round(estimatedPtcAnnual.high / 12),
        }
      : null;

  const csrTier = csrTierForFpl(fplRatio);
  const qualifiesCsr = csrTier === '94' || csrTier === '87' || csrTier === '73';

  let csrSummary: string;
  if (qualifiesCsr) {
    const act =
      csrTier === '94' ? '94% actuarial value' : csrTier === '87' ? '87% actuarial value' : '73% actuarial value';
    csrSummary = `Your income appears near ${fplPercentLabel}, which may unlock Cost-Sharing Reductions on Silver plans (${act} — lower deductibles and out-of-pocket costs than standard Silver). This is why Silver often beats Bronze on total cost for CSR-eligible households. CSR does not apply to Bronze or Gold.`;
  } else if (csrTier === 'below-range') {
    csrSummary =
      'Below ~100% FPL, many people check Medicaid eligibility first. Marketplace PTC eligibility can be limited depending on state Medicaid expansion.';
  } else if (fplRatio > 2.5 && fplRatio <= 4.0) {
    csrSummary =
      'You may still qualify for premium tax credits, but Cost-Sharing Reductions (extra Silver benefits) generally end above 250% FPL.';
  } else {
    csrSummary =
      'Cost-Sharing Reductions are not indicated at this income level under standard Marketplace rules.';
  }

  // Cliff messaging
  const dollarsFromThreshold = Math.round(income - threshold400);
  let cliffStatus: SubsidyPlannerResult['cliff']['status'];
  let cliffMessage: string;
  let reverseMessage: string | null = null;

  if (fplRatio <= 3.7) {
    cliffStatus = 'below';
    cliffMessage = `Under this educational 2026 model, PTC may apply up to 400% FPL (about $${threshold400.toLocaleString()} for your household size). You appear below that threshold.`;
  } else if (fplRatio <= 4.0) {
    cliffStatus = 'near-below';
    cliffMessage = `You appear near the 400% FPL cliff (about $${threshold400.toLocaleString()}). Small income increases could eliminate premium tax credits under statutory rules.`;
    reverseMessage = `You are about $${Math.max(0, threshold400 - income).toLocaleString()} under the educational cliff threshold.`;
  } else if (fplRatio <= 4.25) {
    cliffStatus = 'near-above';
    cliffMessage = `You appear just above 400% FPL. Under statutory rules with a restored cliff, premium tax credits are generally $0 above this line — even if local premiums are high.`;
    reverseMessage = `You appear about $${dollarsFromThreshold.toLocaleString()} above the educational 400% FPL threshold (≈$${threshold400.toLocaleString()}). Reducing MAGI by about that amount could restore substantial assistance under this model — not tax advice; confirm with a tax professional and the Marketplace.`;
  } else {
    cliffStatus = 'above';
    cliffMessage = `At ~${fplPercentLabel}, this educational model shows no premium tax credit because income exceeds 400% FPL (≈$${threshold400.toLocaleString()}). Enhanced no-cliff subsidies applied through 2025 only.`;
    reverseMessage = `To fall under the educational cliff, household MAGI would need to be at or below about $${threshold400.toLocaleString()} (about $${dollarsFromThreshold.toLocaleString()} lower than the income you entered).`;
  }

  const ptcMonthlyMid = ptcAnnualMid != null ? ptcAnnualMid / 12 : 0;

  const pathDefs: Array<{
    id: MetalPathId;
    label: string;
    tagline: string;
    fits: string;
  }> = [
    {
      id: 'bronze',
      label: 'Lowest monthly premium path',
      tagline: 'Bronze-style',
      fits: 'Often fits healthy households who want the lowest monthly bill and can handle a higher deductible.',
    },
    {
      id: 'silver',
      label: 'Balanced path',
      tagline: 'Silver-style',
      fits: qualifiesCsr
        ? 'Especially important if CSR applies — enhanced Silver benefits only attach to Silver plans.'
        : 'Often the middle ground for premium vs protection when CSR does not apply.',
    },
    {
      id: 'gold',
      label: 'Lower out-of-pocket path',
      tagline: 'Gold-style',
      fits: 'Often fits higher expected care or anyone prioritizing lower deductibles over the cheapest premium.',
    },
  ];

  const paths: PathScenario[] = pathDefs.map((def) => {
    const gross = monthlyGross(people, input.location.stateCode, def.id);
    const grossBand = band(gross, confSpread);
    const ptcCap = ptcMonthlyMid;
    const netMid = Math.max(0, gross - ptcCap);
    const netBand = band(netMid, confSpread);
    return {
      id: def.id,
      label: def.label,
      tagline: def.tagline,
      fits: def.fits,
      monthlyGross: grossBand,
      monthlyNet: netBand,
      annualNet: { low: netBand.low * 12, high: netBand.high * 12 },
      csrNote:
        def.id === 'silver' && qualifiesCsr
          ? 'CSR may lower deductibles and max out-of-pocket on Silver only.'
          : undefined,
    };
  });

  const bronzeNet = paths[0].monthlyNet.low;
  const silverNet = paths[1].monthlyNet.high;
  const zeroPremiumPossible = qualifiesPtc && paths[0].monthlyNet.low === 0;

  let assistanceSummary: string;
  if (!qualifiesPtc && fplRatio < 1.0) {
    assistanceSummary = `At ~${fplPercentLabel}, check Medicaid or Marketplace special rules for your state. This tool does not determine Medicaid eligibility.`;
  } else if (!qualifiesPtc) {
    assistanceSummary = `At ~${fplPercentLabel}, this educational model shows no premium tax credit under the 400% FPL cliff. You can still compare unsubsidized local cost paths below.`;
  } else {
    assistanceSummary = `At ~${fplPercentLabel}, you may qualify for a premium tax credit. Educational estimate: about ${formatMoneyRange(estimatedPtcMonthly!, 'mo')} (≈${formatMoneyRange(estimatedPtcAnnual!, 'yr')}) based on a reconstructed Silver benchmark for ${input.location.displayLabel}.`;
  }

  const localCostNarrative = qualifiesPtc
    ? `In ${input.location.displayLabel}, this level of assistance could bring a lower-premium path near ${formatMoneyRange({ low: bronzeNet, high: paths[0].monthlyNet.high }, 'mo')} and a more protected Silver-style path near ${formatMoneyRange(paths[1].monthlyNet, 'mo')} after estimated credits — ranges, not quotes.`
    : `In ${input.location.displayLabel}, without PTC the educational unsubsidized ranges run about ${formatMoneyRange(paths[0].monthlyGross, 'mo')} (lower-premium path) to ${formatMoneyRange(paths[2].monthlyGross, 'mo')} (higher-protection path).`;

  const assumptions = [
    `Plan year context: ${ACA_SAVINGS_META.planYear}`,
    `Rule set: ${ACA_SAVINGS_META.ruleSet} — ${ACA_SAVINGS_META.ruleNote}`,
    `Location: ${input.location.displayLabel}`,
    `Applicants modeled: ${people.map((p) => `age ${p.age}`).join(', ')}`,
    `Tax household size for FPL: ${householdSize}`,
    `Income entered: $${income.toLocaleString()} (treated as rough MAGI proxy)`,
    `FPL reference: $${fplAmount.toLocaleString()} → ${fplPercentLabel}`,
    'Pre-existing conditions are not used in premium estimates (ACA rule).',
    ACA_SAVINGS_META.premiumBasis,
  ];

  return {
    meta: ACA_SAVINGS_META,
    location: input.location,
    fplAmount,
    fplRatio,
    fplPercentLabel,
    applicablePct,
    expectedContributionAnnual,
    expectedContributionMonthly,
    estimatedPtcAnnual,
    estimatedPtcMonthly,
    qualifiesPtc,
    qualifiesCsr,
    csrTier,
    csrSummary,
    zeroPremiumPossible,
    cliff: {
      status: cliffStatus,
      thresholdIncome: Math.round(threshold400),
      dollarsFromThreshold: Math.abs(dollarsFromThreshold),
      message: cliffMessage,
      reverseMessage,
    },
    assistanceSummary,
    localCostNarrative,
    paths,
    assumptions,
    incomeConfidenceNote: confidenceNote(input.incomeConfidence),
  };
}

export { formatMoneyRange, fplForHousehold };
