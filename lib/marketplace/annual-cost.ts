/**
 * Phase 9 — Total annual cost estimates for Plan Explorer.
 *
 * Prefer CMS Marketplace `oopc` (requires utilization on household people).
 * Fail closed: never invent care costs as "facts." Unavailable stays null.
 */

import type {
  CareScenarioId,
  CmsUtilizationLevel,
  CustomCareInputs,
  MarketplacePlanCard,
  PlanAnnualCostEstimate,
} from '@/lib/marketplace/types';

export const CARE_SCENARIO_META: Record<
  Exclude<CareScenarioId, 'custom'>,
  { name: string; blurb: string; cms: CmsUtilizationLevel | null }
> = {
  none: {
    name: 'No care scenario',
    blurb: 'Premiums and plan facts only — yearly care estimate off.',
    cms: null,
  },
  low: {
    name: 'Low use',
    blurb: 'Few visits; mostly preventive. Maps to CMS utilization Low.',
    cms: 'Low',
  },
  moderate: {
    name: 'Moderate use',
    blurb: 'Typical doctor visits and occasional care. Maps to CMS Medium.',
    cms: 'Medium',
  },
  higher: {
    name: 'Higher use',
    blurb: 'Regular care, specialists, or ongoing conditions. Maps to CMS High.',
    cms: 'High',
  },
};

export const DEFAULT_CUSTOM_CARE: CustomCareInputs = {
  primaryCareVisits: 2,
  specialistVisits: 1,
  erVisits: 0,
  genericRxMonths: 0,
  brandRxMonths: 0,
  imagingOrProcedure: false,
};

/**
 * Map custom visit-style inputs → CMS Low/Medium/High.
 * Transparent scoring only — still relies on CMS for dollar OOPC.
 */
export function mapCustomToCmsUtilization(
  custom: CustomCareInputs
): { cms: CmsUtilizationLevel; score: number; note: string } {
  const score =
    custom.primaryCareVisits * 1 +
    custom.specialistVisits * 2 +
    custom.erVisits * 6 +
    custom.genericRxMonths * 0.35 +
    custom.brandRxMonths * 0.7 +
    (custom.imagingOrProcedure ? 5 : 0);

  let cms: CmsUtilizationLevel;
  if (score <= 4) cms = 'Low';
  else if (score <= 12) cms = 'Medium';
  else cms = 'High';

  return {
    cms,
    score: Math.round(score * 10) / 10,
    note: `Custom inputs scored ${score.toFixed(1)} → CMS utilization “${cms}” (not a medical underwriting model).`,
  };
}

export function scenarioToCmsUtilization(
  scenario: CareScenarioId,
  custom?: CustomCareInputs | null
): CmsUtilizationLevel | null {
  if (scenario === 'none') return null;
  if (scenario === 'custom') {
    return mapCustomToCmsUtilization(custom ?? DEFAULT_CUSTOM_CARE).cms;
  }
  return CARE_SCENARIO_META[scenario].cms;
}

export function scenarioDisplayName(
  scenario: CareScenarioId,
  custom?: CustomCareInputs | null
): string {
  if (scenario === 'custom') {
    const m = mapCustomToCmsUtilization(custom ?? DEFAULT_CUSTOM_CARE);
    return `Custom (→ CMS ${m.cms})`;
  }
  return CARE_SCENARIO_META[scenario].name;
}

function monthlyPremiumForAnnual(plan: MarketplacePlanCard): number | null {
  const m = plan.estimatedPremiumAfterCreditMonthly ?? plan.premiumMonthly;
  if (m == null || !Number.isFinite(m) || m < 0) return null;
  return m;
}

/**
 * Build estimate for one plan. Uses CMS OOPC when present on the card
 * (from a search that included utilization). Does not fabricate care $ when missing.
 */
export function estimatePlanAnnualCost(params: {
  plan: MarketplacePlanCard;
  scenario: CareScenarioId;
  custom?: CustomCareInputs | null;
  planYear?: number | null;
  retrievedAt?: string | null;
}): PlanAnnualCostEstimate {
  const { plan, scenario, custom } = params;
  const scenarioName = scenarioDisplayName(scenario, custom);
  const cmsUtil = scenarioToCmsUtilization(scenario, custom);
  const monthly = monthlyPremiumForAnnual(plan);
  const annualPremium = monthly != null ? Math.round(monthly * 12) : null;

  const baseAssumptions: string[] = [
    'Educational research estimate for comparing plans under a care-usage scenario.',
    'Not a guarantee of actual yearly spend. Claims, networks, formulary, and timing change costs.',
  ];
  const limitations: string[] = [
    'Confirm premiums, cost-sharing, and enrollment on HealthCare.gov or your state marketplace.',
    'No paid placements in plan ordering.',
  ];

  if (scenario === 'none') {
    return {
      planId: plan.id,
      available: false,
      annualPremium,
      expectedCareCost: null,
      estimatedTotalAnnual: null,
      methodLabel: 'Scenario not selected',
      scenarioId: scenario,
      scenarioName,
      cmsUtilization: null,
      planYear: params.planYear ?? null,
      sourceSystem: 'unavailable',
      retrievedAt: params.retrievedAt ?? null,
      assumptions: baseAssumptions,
      limitations,
      unavailableReason: 'Choose a care-usage scenario to request CMS expected out-of-pocket (OOPC).',
    };
  }

  if (scenario === 'custom') {
    baseAssumptions.push(mapCustomToCmsUtilization(custom ?? DEFAULT_CUSTOM_CARE).note);
  } else {
    baseAssumptions.push(
      `Scenario “${scenarioName}” maps to CMS household utilization “${cmsUtil}”.`
    );
  }

  const cmsOopc =
    plan.cmsOopc != null && Number.isFinite(plan.cmsOopc) && plan.cmsOopc >= 0
      ? Math.round(plan.cmsOopc)
      : null;

  // Prefer CMS total_costs when it looks usable; else premium annual + OOPC
  let cmsTotal =
    plan.cmsTotalCosts != null &&
    Number.isFinite(plan.cmsTotalCosts) &&
    plan.cmsTotalCosts >= 0
      ? Math.round(plan.cmsTotalCosts)
      : null;

  if (cmsOopc == null) {
    return {
      planId: plan.id,
      available: false,
      annualPremium,
      expectedCareCost: null,
      estimatedTotalAnnual: null,
      methodLabel: 'CMS OOPC unavailable',
      scenarioId: scenario,
      scenarioName,
      cmsUtilization: cmsUtil,
      planYear: params.planYear ?? null,
      sourceSystem: annualPremium != null ? 'partial' : 'unavailable',
      retrievedAt: params.retrievedAt ?? null,
      assumptions: [
        ...baseAssumptions,
        'CMS did not return a calculated out-of-pocket cost (oopc) for this plan/utilization.',
      ],
      limitations: [
        ...limitations,
        'We do not invent care costs when CMS OOPC is missing. Annual premium alone is not shown as “total yearly cost.”',
      ],
      unavailableReason:
        'Estimate unavailable — CMS Marketplace did not provide OOPC for this plan under the selected utilization.',
    };
  }

  const estimatedTotalAnnual =
    cmsTotal != null
      ? cmsTotal
      : annualPremium != null
        ? annualPremium + cmsOopc
        : null;

  if (estimatedTotalAnnual == null) {
    return {
      planId: plan.id,
      available: false,
      annualPremium: null,
      expectedCareCost: cmsOopc,
      estimatedTotalAnnual: null,
      methodLabel: 'Premium missing',
      scenarioId: scenario,
      scenarioName,
      cmsUtilization: cmsUtil,
      planYear: params.planYear ?? null,
      sourceSystem: 'partial',
      retrievedAt: params.retrievedAt ?? null,
      assumptions: baseAssumptions,
      limitations,
      unavailableReason:
        'CMS OOPC present but premium not available — cannot form a total annual cost.',
    };
  }

  return {
    planId: plan.id,
    available: true,
    annualPremium,
    expectedCareCost: cmsOopc,
    estimatedTotalAnnual,
    methodLabel:
      cmsTotal != null
        ? 'CMS total_costs (when returned) / OOPC + annual premium context'
        : 'Annual premium (after educational credit context) + CMS OOPC',
    scenarioId: scenario,
    scenarioName,
    cmsUtilization: cmsUtil,
    planYear: params.planYear ?? null,
    sourceSystem: 'cms_marketplace_api',
    retrievedAt: params.retrievedAt ?? null,
    assumptions: [
      ...baseAssumptions,
      'Annual premium uses issuer-reported or educational after-credit monthly × 12.',
      'Care cost uses CMS Marketplace plan oopc for the utilization level.',
    ],
    limitations: [
      ...limitations,
      'This estimate helps compare plans under a scenario. It is not a promise of your real annual cost.',
    ],
    unavailableReason: null,
  };
}

export function buildCostEstimatesForPlans(params: {
  plans: MarketplacePlanCard[];
  scenario: CareScenarioId;
  custom?: CustomCareInputs | null;
  planYear?: number | null;
  retrievedAt?: string | null;
}): Record<string, PlanAnnualCostEstimate> {
  const out: Record<string, PlanAnnualCostEstimate> = {};
  for (const plan of params.plans) {
    out[plan.id] = estimatePlanAnnualCost({
      plan,
      scenario: params.scenario,
      custom: params.custom,
      planYear: params.planYear,
      retrievedAt: params.retrievedAt,
    });
  }
  return out;
}

/** Lowest premium among plans with a finite monthly figure. */
export function findLowestPremiumPlanId(plans: MarketplacePlanCard[]): string | null {
  let best: { id: string; v: number } | null = null;
  for (const p of plans) {
    const v = p.estimatedPremiumAfterCreditMonthly ?? p.premiumMonthly;
    if (v == null || !Number.isFinite(v)) continue;
    if (!best || v < best.v) best = { id: p.id, v };
  }
  return best?.id ?? null;
}

/** Lowest estimated total annual among available estimates. */
export function findLowestYearlyCostPlanId(
  estimates: Record<string, PlanAnnualCostEstimate>
): string | null {
  let best: { id: string; v: number } | null = null;
  for (const e of Object.values(estimates)) {
    if (!e.available || e.estimatedTotalAnnual == null) continue;
    if (!best || e.estimatedTotalAnnual < best.v) {
      best = { id: e.planId, v: e.estimatedTotalAnnual };
    }
  }
  return best?.id ?? null;
}
