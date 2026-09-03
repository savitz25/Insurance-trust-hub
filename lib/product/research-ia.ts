/**
 * Phase 2 — InsuranceTrustHub product information architecture.
 * Three consumer questions organize homepage, /tools, and primary navigation.
 */

export type ResearchQuestionId = 'need' | 'options' | 'verify';

export type ResearchLink = {
  href: string;
  label: string;
  detail?: string;
};

export type ResearchQuestion = {
  id: ResearchQuestionId;
  number: '01' | '02' | '03';
  title: string;
  shortTitle: string;
  description: string;
  /** Primary CTA for the question card */
  primary: ResearchLink;
  links: ResearchLink[];
};

/** Canonical three questions — single source for homepage + tools framing. */
export const RESEARCH_QUESTIONS: ResearchQuestion[] = [
  {
    id: 'need',
    number: '01',
    title: 'What coverage do I need?',
    shortTitle: 'Coverage need',
    description:
      'Clarify health, Medicare, home, auto, or other protection goals with educational pathfinders — not a sales quiz.',
    primary: { href: '/tools/coverage-compass', label: 'Coverage Compass' },
    links: [
      { href: '/hubs/health-insurance', label: 'Health / ACA overview' },
      { href: '/medicare', label: 'Medicare research path' },
      { href: '/hubs/aca', label: 'ACA Marketplace focus' },
      { href: '/guides', label: 'ACA Marketplace guides' },
      { href: '/calculators/aca-subsidy', label: 'ACA subsidy planner' },
      { href: '/tools/cost-estimator', label: 'Cost & Coverage Planner' },
    ],
  },
  {
    id: 'options',
    number: '02',
    title: 'What options exist where I live?',
    shortTitle: 'Local options',
    description:
      'Local Marketplace landscapes, county Medicare context, carriers, and market hubs — empty agent markets stay honest.',
    primary: {
      href: '/tools/marketplace-plan-research',
      label: 'Marketplace plan research',
    },
    links: [
      { href: '/marketplace', label: 'County ACA intelligence' },
      { href: '/data/counties', label: 'County Medicare dashboards' },
      { href: '/carriers', label: 'Carrier intelligence' },
      { href: '/hubs', label: 'Market hubs' },
      { href: '/directory?verified=true', label: 'Verified agency directory' },
      { href: '/tools/aca-plan-explorer', label: 'Live ACA Plan Explorer' },
    ],
  },
  {
    id: 'verify',
    number: '03',
    title: 'How do I verify what I’m being sold?',
    shortTitle: 'Verify first',
    description:
      'Government complaint signals, license re-checks, methodology, and CMS provider participation — re-check primary sources yourself.',
    primary: {
      href: '/data/plan-complaint-index',
      label: 'Plan Complaint Index',
    },
    links: [
      { href: '/tools/license-verification', label: 'License verification' },
      { href: '/tools/medicare-provider-lookup', label: 'Medicare provider lookup' },
      { href: '/methodology', label: 'Research methodology' },
      { href: '/about', label: 'About & trust' },
      {
        href: 'https://www.healthcare.gov',
        label: 'HealthCare.gov (official)',
      },
      { href: 'https://www.medicare.gov', label: 'Medicare.gov (official)' },
    ],
  },
];

/** Flagship tools promoted on homepage and /tools. */
export const FLAGSHIP_RESEARCH_TOOLS = [
  {
    href: '/tools/marketplace-plan-research',
    title: 'Marketplace plan research',
    question: 'What does the local ACA Marketplace look like for my ZIP?',
    description:
      'CMS-powered plan counts, issuer context, and research paths — educational only. Enroll on official Marketplace pathways.',
  },
  {
    href: '/calculators/aca-subsidy',
    title: 'ACA Coverage & Savings Planner',
    question: 'Might I qualify for Marketplace help — and what could coverage cost?',
    description:
      'ZIP, ages, and income → premium tax credit education, CSR context, and local net-cost paths.',
  },
  {
    href: '/tools/cost-estimator',
    title: 'Cost & Coverage Planner',
    question: 'What could health coverage cost for the year?',
    description:
      'Household and care-use scenarios for total annual cost paths — not premium-only guesses.',
  },
  {
    href: '/data/plan-complaint-index',
    title: 'Plan Complaint Index',
    question: 'What do CMS complaint measures show for MA / Part D contracts?',
    description:
      'Transparent government complaint rates with methodology — not a ranking for sale.',
  },
] as const;

/** Phase 18 — five highest-intent consumer jobs. */
export const PRIMARY_CONSUMER_JOBS = [
  {
    id: 'aca',
    label: 'ACA / health coverage',
    detail: 'See the Marketplace landscape where you live.',
    href: '/tools/marketplace-plan-research',
    secondaryHref: '/tools/coverage-compass',
    secondaryLabel: 'Not sure? Coverage Compass',
  },
  {
    id: 'medicare',
    label: 'Medicare / turning 65',
    detail: 'CMS-backed research path, not ACA Marketplace tools.',
    href: '/medicare',
    secondaryHref: '/tools/medicare-provider-lookup',
    secondaryLabel: 'Provider lookup',
  },
  {
    id: 'verify',
    label: 'Verify a license',
    detail: 'Official state DOI lookup before you share personal data.',
    href: '/tools/license-verification',
    secondaryHref: '/directory?verified=true',
    secondaryLabel: 'Verified directory',
  },
  {
    id: 'agencies',
    label: 'Licensed agencies near me',
    detail: 'Research listings only where official inventory exists.',
    href: '/directory?verified=true',
    secondaryHref: '/hubs',
    secondaryLabel: 'Market hubs',
  },
  {
    id: 'cost',
    label: 'Cost / subsidy context',
    detail: 'Educational estimates before you talk to anyone.',
    href: '/calculators/aca-subsidy',
    secondaryHref: '/tools/cost-estimator',
    secondaryLabel: 'Annual cost planner',
  },
] as const;

/** Launch hubs known to have promoted inventory — still gated by live state counts. */
export const LIVE_LAUNCH_HUBS = [
  { href: '/hubs/south-florida', label: 'South Florida', state: 'FL' as const },
  { href: '/hubs/florida/jacksonville', label: 'Jacksonville', state: 'FL' as const },
  { href: '/hubs/texas/houston', label: 'Houston', state: 'TX' as const },
  { href: '/hubs/ohio/columbus', label: 'Columbus', state: 'OH' as const },
  { href: '/hubs/nevada/las-vegas', label: 'Las Vegas', state: 'NV' as const },
  { href: '/hubs/vermont/burlington', label: 'Burlington', state: 'VT' as const },
  { href: '/hubs/massachusetts/boston', label: 'Boston', state: 'MA' as const },
  { href: '/hubs/mississippi/jackson', label: 'Jackson', state: 'MS' as const },
] as const;

export const RECOMMENDED_FIRST_PATH = [
  {
    step: '1',
    label: 'Name the coverage question',
    href: '/tools/coverage-compass',
    cta: 'Coverage Compass',
  },
  {
    step: '2',
    label: 'See options where you live',
    href: '/tools/marketplace-plan-research',
    cta: 'Marketplace landscape',
  },
  {
    step: '3',
    label: 'Estimate cost or subsidy',
    href: '/calculators/aca-subsidy',
    cta: 'ACA savings planner',
  },
  {
    step: '4',
    label: 'Verify before you decide',
    href: '/tools/license-verification',
    cta: 'License verification',
  },
] as const;

export const STATES_WITH_VERIFIED_INVENTORY = ['FL', 'TX', 'OH', 'NV', 'VT', 'MA', 'MS'] as const;

export function guideHasVerifiedInventory(stateName: string): boolean {
  return stateName === 'Florida' || stateName === 'Texas';
}

export const LOCAL_RESEARCH_ENTRY = {
  title: 'Research where you live',
  support:
    'Start with a ZIP for Marketplace context, browse market hubs, or open Medicare county intelligence. Verified agency listings appear only when real verified inventory exists.',
  links: [
    { href: '/tools/marketplace-plan-research', label: 'ZIP Marketplace research' },
    { href: '/hubs', label: 'Market hubs' },
    { href: '/guides', label: 'Local ACA guides' },
    { href: '/data/counties', label: 'County Medicare data' },
    { href: '/directory?verified=true', label: 'Verified directory' },
    { href: '/california', label: 'California insurance research' },
    { href: '/florida', label: 'Florida insurance research' },
  ],
} as const;

export const PRODUCT_TRUST_PRINCIPLES = [
  {
    title: 'No lead selling',
    body: 'We do not sell quote funnels, ranking slots, or paid introductions.',
  },
  {
    title: 'Educational research only',
    body: 'Tools estimate and explain. They are not insurance advice or enrollment.',
  },
  {
    title: 'Official pathways stay official',
    body: 'Enrollment remains on HealthCare.gov, state Marketplaces, Medicare.gov, and licensed professionals you choose.',
  },
  {
    title: 'Verified inventory only',
    body: 'Empty markets stay empty. We never invent agencies or fake completeness.',
  },
] as const;
