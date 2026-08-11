/**
 * Phase 3 — Coverage Compass path routing map.
 * Situation → ordered research tools under the three-question product model.
 * Live tools only. Educational routing — never lead-gen or enrollment.
 */

export type CompassSituationId =
  | 'medicare'
  | 'aca_health'
  | 'subsidies_costs'
  | 'moved'
  | 'doctor'
  | 'verify_claim'
  | 'researching';

export type CompassPathId =
  | 'medicare_hub'
  | 'medicare_plan_finder'
  | 'medicare_provider_lookup'
  | 'county_dashboards'
  | 'complaint_index'
  | 'marketplace_research'
  | 'aca_subsidy'
  | 'cost_estimator'
  | 'aca_plan_explorer'
  | 'guides'
  | 'hubs'
  | 'directory'
  | 'carriers'
  | 'license_verification'
  | 'methodology';

export type CompassToolStep = {
  id: CompassPathId;
  href: string;
  title: string;
  description: string;
  /** Which of the three product questions this step primarily serves */
  question: 'need' | 'options' | 'verify';
};

export type CompassSituation = {
  id: CompassSituationId;
  title: string;
  detail: string;
  icon: string;
  summary: string;
  insight: string;
  steps: CompassToolStep[];
  primaryPathId?: CompassPathId;
};

const T: Record<CompassPathId, CompassToolStep> = {
  medicare_hub: {
    id: 'medicare_hub',
    href: '/medicare',
    title: 'Medicare research hub',
    description: 'CMS-backed orientation for Advantage, Medigap, and local market context.',
    question: 'need',
  },
  medicare_plan_finder: {
    id: 'medicare_plan_finder',
    href: '/tools/medicare-plan-finder',
    title: 'Medicare research guide',
    description: 'Situation-based Medicare path — educational, not a quoting tool.',
    question: 'need',
  },
  medicare_provider_lookup: {
    id: 'medicare_provider_lookup',
    href: '/tools/medicare-provider-lookup',
    title: 'Medicare provider lookup',
    description: 'Check CMS PPEF / Opt Out signals for a doctor or organization.',
    question: 'verify',
  },
  county_dashboards: {
    id: 'county_dashboards',
    href: '/data/counties',
    title: 'County Medicare dashboards',
    description: 'Local enrollment and quality context from CMS-derived data.',
    question: 'options',
  },
  complaint_index: {
    id: 'complaint_index',
    href: '/data/plan-complaint-index',
    title: 'Plan Complaint Index',
    description: 'CMS complaint measures for MA / Part D contracts — transparent methodology.',
    question: 'verify',
  },
  marketplace_research: {
    id: 'marketplace_research',
    href: '/tools/marketplace-plan-research',
    title: 'Marketplace plan research',
    description: 'Local ACA Marketplace landscape by ZIP — educational only.',
    question: 'options',
  },
  aca_subsidy: {
    id: 'aca_subsidy',
    href: '/calculators/aca-subsidy',
    title: 'ACA Coverage & Savings Planner',
    description: 'Premium tax credit and CSR education from ZIP, ages, and income.',
    question: 'need',
  },
  cost_estimator: {
    id: 'cost_estimator',
    href: '/tools/cost-estimator',
    title: 'Cost & Coverage Planner',
    description: 'Total annual cost scenarios — premium plus expected care use.',
    question: 'need',
  },
  aca_plan_explorer: {
    id: 'aca_plan_explorer',
    href: '/tools/aca-plan-explorer',
    title: 'Live ACA Plan Explorer',
    description: 'Research CMS Marketplace plans by ZIP and ages.',
    question: 'options',
  },
  guides: {
    id: 'guides',
    href: '/guides',
    title: 'ACA Marketplace guides',
    description: 'State and metro educational guides into live ZIP tools.',
    question: 'options',
  },
  hubs: {
    id: 'hubs',
    href: '/hubs',
    title: 'Market hubs',
    description: 'Local research pages. Verified agencies only when inventory is real.',
    question: 'options',
  },
  directory: {
    id: 'directory',
    href: '/directory',
    title: 'Verified agency directory',
    description: 'Browse verified research listings only — empty markets stay empty.',
    question: 'options',
  },
  carriers: {
    id: 'carriers',
    href: '/carriers',
    title: 'Carrier intelligence',
    description: 'Organization-level public-data rollups — not sales rankings.',
    question: 'options',
  },
  license_verification: {
    id: 'license_verification',
    href: '/tools/license-verification',
    title: 'License verification',
    description: 'Route to official state DOI lookups with consent before you leave.',
    question: 'verify',
  },
  methodology: {
    id: 'methodology',
    href: '/methodology',
    title: 'Research methodology',
    description: 'How we define verified inventory and public research signals.',
    question: 'verify',
  },
};

/** Canonical situation catalog for the Compass UI. */
export const COMPASS_SITUATIONS: CompassSituation[] = [
  {
    id: 'medicare',
    title: 'Turning 65 / new to Medicare',
    detail: 'Advantage, Medigap, doctors, and local markets',
    icon: 'heart',
    summary:
      'You’re exploring Medicare. Start with government-sourced research before marketing materials — then verify doctors and complaint signals.',
    insight:
      'Enrollment stays on Medicare.gov or with a licensed professional you choose. We do not sell plans or take lead fees.',
    steps: [
      T.medicare_plan_finder,
      T.medicare_hub,
      T.county_dashboards,
      T.medicare_provider_lookup,
      T.complaint_index,
    ],
    primaryPathId: 'medicare_plan_finder',
  },
  {
    id: 'aca_health',
    title: 'Need health insurance (ACA / Marketplace)',
    detail: 'No employer plan, or shopping the Marketplace',
    icon: 'stethoscope',
    summary:
      'You’re researching health coverage. Map local Marketplace options, then model costs and assistance — verify claims with public tools before you enroll anywhere.',
    insight:
      'Official enrollment is on HealthCare.gov or your state Marketplace (for example NY State of Health). Research here is educational only.',
    steps: [
      T.marketplace_research,
      T.aca_subsidy,
      T.cost_estimator,
      T.guides,
      T.complaint_index,
    ],
    primaryPathId: 'marketplace_research',
  },
  {
    id: 'subsidies_costs',
    title: 'Reviewing costs or subsidies',
    detail: 'Premiums, out-of-pocket, or Marketplace help',
    icon: 'coins',
    summary:
      'You’re focused on cost. Model total annual cost and subsidy context first, then check local Marketplace landscapes and public complaint signals.',
    insight:
      'Cheapest monthly premium is not always the lowest total cost. Use planners, then re-check official Marketplace estimates.',
    steps: [
      T.aca_subsidy,
      T.cost_estimator,
      T.marketplace_research,
      T.complaint_index,
      T.methodology,
    ],
    primaryPathId: 'aca_subsidy',
  },
  {
    id: 'moved',
    title: 'Moved or moving soon',
    detail: 'New ZIP, state rules, local options',
    icon: 'truck',
    summary:
      'You’re changing location. Start with local Marketplace research and guides, then verify licenses if you talk with an agency. Empty agent markets stay empty — we never invent inventory.',
    insight:
      'Networks, carriers, and subsidy rules can change by county. ZIP-based tools first; directory only when verified listings exist.',
    steps: [
      T.marketplace_research,
      T.guides,
      T.hubs,
      T.cost_estimator,
      T.license_verification,
    ],
    primaryPathId: 'marketplace_research',
  },
  {
    id: 'doctor',
    title: 'Checking a doctor / provider',
    detail: 'Medicare participation or network research',
    icon: 'users',
    summary:
      'You’re verifying a provider. Use CMS participation tools and Marketplace/Medicare research paths — we surface public signals, not guarantees.',
    insight:
      'Always re-check with the clinic and official CMS or Marketplace sources before enrollment decisions.',
    steps: [
      T.medicare_provider_lookup,
      T.medicare_plan_finder,
      T.aca_plan_explorer,
      T.complaint_index,
      T.methodology,
    ],
    primaryPathId: 'medicare_provider_lookup',
  },
  {
    id: 'verify_claim',
    title: 'Verifying a plan, carrier, or agent claim',
    detail: 'Complaints, licenses, methodology',
    icon: 'badge-check',
    summary:
      'You’re stress-testing a claim. Use government complaint measures, official license pathways, and our methodology — not marketing rankings.',
    insight:
      'Independent research only. We do not sell ranking positions or collect lead fees for introductions.',
    steps: [
      T.complaint_index,
      T.license_verification,
      T.methodology,
      T.medicare_provider_lookup,
      T.carriers,
    ],
    primaryPathId: 'complaint_index',
  },
  {
    id: 'researching',
    title: 'Just researching',
    detail: 'Exploring without a hard deadline',
    icon: 'compass',
    summary:
      'You’re learning first. Use the Research Center’s three questions — coverage need, local options, and verification — without pressure.',
    insight:
      'No sales path. Optional: save this research path later in My Insurance for a private trail.',
    steps: [
      T.marketplace_research,
      T.aca_subsidy,
      T.medicare_plan_finder,
      T.complaint_index,
      T.methodology,
    ],
    primaryPathId: 'marketplace_research',
  },
];

export const COMPASS_SITUATION_BY_ID: Record<CompassSituationId, CompassSituation> =
  Object.fromEntries(COMPASS_SITUATIONS.map((s) => [s.id, s])) as Record<
    CompassSituationId,
    CompassSituation
  >;

/** Phase 4-ready payload shape (no auth required to produce). */
export type CoverageCompassResultPayload = {
  version: 1;
  situationKey: CompassSituationId;
  zip: string | null;
  recommendedPathIds: CompassPathId[];
  primaryPathId: CompassPathId;
  steps: CompassToolStep[];
  summary: string;
  insight: string;
  situationLabel: string;
  createdAt: string;
};

export function isValidZip(zip: string | null | undefined): boolean {
  return Boolean(zip && /^\d{5}$/.test(zip.trim()));
}

/**
 * Build ordered research path for a situation + optional ZIP.
 * When ZIP is present, prefer Marketplace research with query param and local guides.
 */
export function buildCompassResult(
  situationId: CompassSituationId,
  zip?: string | null
): CoverageCompassResultPayload {
  const situation = COMPASS_SITUATION_BY_ID[situationId] ?? COMPASS_SITUATION_BY_ID.researching;
  const cleanZip = isValidZip(zip) ? zip!.trim() : null;

  let steps = situation.steps.map((s) => ({ ...s }));

  if (cleanZip) {
    steps = steps.map((s) => {
      if (s.id === 'marketplace_research') {
        return {
          ...s,
          href: `/tools/marketplace-plan-research?zip=${cleanZip}`,
          description: `Local ACA Marketplace landscape for ZIP ${cleanZip} — educational only.`,
        };
      }
      if (s.id === 'aca_subsidy') {
        return {
          ...s,
          href: `/calculators/aca-subsidy?zip=${cleanZip}`,
        };
      }
      if (s.id === 'cost_estimator') {
        return {
          ...s,
          href: `/tools/cost-estimator?zip=${cleanZip}`,
        };
      }
      return s;
    });

    // Prefer local guide entry near the top for move / aca / researching when ZIP present
    if (
      situationId === 'moved' ||
      situationId === 'aca_health' ||
      situationId === 'researching'
    ) {
      const guides = steps.find((s) => s.id === 'guides');
      if (guides) {
        steps = [guides, ...steps.filter((s) => s.id !== 'guides')];
      }
    }
  }

  // Cap 5 steps for UI
  steps = steps.slice(0, 5);

  const primaryPathId =
    situation.primaryPathId && steps.some((s) => s.id === situation.primaryPathId)
      ? situation.primaryPathId
      : steps[0]?.id ?? 'marketplace_research';

  // Ensure primary is first in display order
  const primary = steps.find((s) => s.id === primaryPathId);
  if (primary) {
    steps = [primary, ...steps.filter((s) => s.id !== primaryPathId)];
  }

  return {
    version: 1,
    situationKey: situation.id,
    zip: cleanZip,
    recommendedPathIds: steps.map((s) => s.id),
    primaryPathId,
    steps,
    summary: situation.summary,
    insight: situation.insight,
    situationLabel: situation.title,
    createdAt: new Date().toISOString(),
  };
}

export function getCompassPrimaryStep(
  payload: CoverageCompassResultPayload
): CompassToolStep {
  return (
    payload.steps.find((s) => s.id === payload.primaryPathId) ?? payload.steps[0]
  );
}
