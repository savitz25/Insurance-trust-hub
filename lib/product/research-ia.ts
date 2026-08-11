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
    primary: { href: '/tools/needs-assessment', label: 'Coverage Compass' },
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
      { href: '/directory', label: 'Verified agency directory' },
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

export const LOCAL_RESEARCH_ENTRY = {
  title: 'Research where you live',
  support:
    'Start with a ZIP for Marketplace context, browse market hubs, or open Medicare county intelligence. Verified agency listings appear only when real verified inventory exists.',
  links: [
    { href: '/tools/marketplace-plan-research', label: 'ZIP Marketplace research' },
    { href: '/hubs', label: 'Market hubs' },
    { href: '/guides', label: 'Local ACA guides' },
    { href: '/data/counties', label: 'County Medicare data' },
    { href: '/directory', label: 'Verified directory' },
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
