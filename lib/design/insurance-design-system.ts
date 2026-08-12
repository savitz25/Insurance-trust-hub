/**
 * Insurance Trust Hub — Master Design System (Phase 1).
 * Protection & Coverage layer of the Ask Trust Hub network.
 *
 * CSS variables: app/globals.css (:root / [data-hub="insurance"]).
 *
 * Visual rules (light surfaces):
 * - Body / nav / labels: only navy `#0A2540` or ink `#1E293B` (never light gray)
 * - Primary interactive (links, active, focus, CTAs): Shield Blue `#0284C7`
 * - Hover emphasis: Deep Sapphire `#1E3A8A`
 * - Ice Blue `#E0F2FE`: soft backgrounds / selected surfaces only — not body text
 * - On navy footer: white / ice for readable reverse text; interactive links stay Shield Blue
 */

export const INSURANCE_BRAND = {
  /** Shield Blue — primary CTAs, active nav, focus, interactive accents */
  shield: '#0284C7',
  /** Deep Sapphire — hover / deeper emphasis */
  sapphire: '#1E3A8A',
  sapphireDeep: '#172554',
  /** Ice Blue — soft surfaces, tags, selected (never body text) */
  ice: '#E0F2FE',
  /** Deep Navy — primary text, dark surfaces, footer background */
  navy: '#0A2540',
  /** High-contrast body (light surfaces only) */
  ink: '#1E293B',
  canvas: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  /** On navy — high-contrast reverse (not light-gray body on canvas) */
  onNavyMuted: '#CBD5E1',
  onNavySoft: '#E2E8F0',
} as const;

/** Canonical text colors for light UI (header, panels, page) */
export const INSURANCE_TEXT = {
  primary: '#0A2540',
  body: '#1E293B',
  interactive: '#0284C7',
  interactiveHover: '#1E3A8A',
} as const;

export const INSURANCE_RADIUS = {
  card: '0.75rem',
  cardLg: '1rem',
  pill: '9999px',
  control: '0.5rem',
} as const;

export const INSURANCE_SHADOW = {
  soft: '0 1px 2px rgb(10 37 64 / 0.04), 0 4px 16px rgb(10 37 64 / 0.05)',
  card: '0 1px 2px rgb(10 37 64 / 0.05), 0 8px 24px rgb(10 37 64 / 0.07)',
  shield: '0 6px 20px -6px rgb(2 132 199 / 0.35)',
} as const;

export const INSURANCE_SPACE = {
  unit: 8,
} as const;

export const INSURANCE_TAGLINE = 'PROTECT WHAT MATTERS. VERIFY FIRST.';

export const INSURANCE_INDEPENDENCE_LINE =
  'Independent research — no paid placements, no lead fees.';

export const INSURANCE_LAYER_LABEL = 'Protection & Coverage';

/** Phase 2 — homepage hero (independent insurance research product) */
export const INSURANCE_HERO = {
  eyebrow: 'Insurance Trust Hub  ·  Independent research',
  headline: 'Independent insurance research — for decisions that matter.',
  support:
    'Health, Medicare, ACA Marketplace, and verification tools built on public data. No paid placements. No lead fees. Official enrollment stays official. You decide.',
  primaryCta: { label: 'Open Research Center', href: '/tools' },
  secondaryCta: {
    label: 'Marketplace plan research',
    href: '/tools/marketplace-plan-research',
  },
  philosophy: 'We cite. You decide.',
  tagline: 'Research first. Verify always.',
  networkLine: 'The Protection & Coverage layer of the Ask Trust Hub network.',
  chips: [
    { id: 'independent', label: 'Independent research' },
    { id: 'no-lead', label: 'No lead selling' },
    { id: 'public-data', label: 'Public data first' },
    { id: 'verified-only', label: 'Verified listings only' },
  ],
  searchTitle: 'Start where you live',
  searchHint:
    'Enter a ZIP for local Marketplace research — or open the Research Center for the full toolkit.',
} as const;

/** Phase 2 — featured tools block (three-question product) */
export const INSURANCE_TOOLS = {
  eyebrow: 'Flagship research tools',
  title: 'Start with the tools that answer real questions',
  support:
    'Marketplace landscapes, cost and subsidy education, and CMS complaint signals — not a quote marketplace.',
  items: [
    {
      id: 'marketplace',
      title: 'Marketplace plan research',
      description:
        'Local ACA Marketplace landscape by ZIP — plan counts, issuer context, and research paths.',
      href: '/tools/marketplace-plan-research',
      cta: 'Research local plans',
    },
    {
      id: 'aca',
      title: 'ACA Coverage & Savings Planner',
      description:
        'Educational premium tax credit and CSR context from ZIP, ages, and income.',
      href: '/calculators/aca-subsidy',
      cta: 'Open ACA planner',
    },
    {
      id: 'cost',
      title: 'Cost & Coverage Planner',
      description:
        'Total annual cost scenarios for health coverage — premium plus expected care use.',
      href: '/tools/cost-estimator',
      cta: 'Estimate annual cost',
    },
    {
      id: 'complaints',
      title: 'Plan Complaint Index',
      description:
        'CMS complaint measures for Medicare Advantage and Part D contracts — transparent methodology.',
      href: '/data/plan-complaint-index',
      cta: 'Open Complaint Index',
    },
  ],
} as const;

export const INSURANCE_HOW_IT_WORKS = {
  eyebrow: 'How research works here',
  title: 'Three questions. Clear paths. No pressure.',
  support:
    'Every major entry point helps you answer what you need, what exists locally, and how to verify — without inventing inventory.',
  steps: [
    {
      step: '01',
      title: 'Clarify coverage need',
      description:
        'Use Coverage Compass, ACA/Medicare paths, and educational planners when you are not sure what to research first.',
    },
    {
      step: '02',
      title: 'Map options where you live',
      description:
        'Marketplace tools, county intelligence, carriers, and hubs. Verified agencies only when real verified inventory exists.',
    },
    {
      step: '03',
      title: 'Verify before you decide',
      description:
        'Complaint Index, license verification, CMS provider signals, and methodology — re-check primary sources yourself.',
    },
    {
      step: '04',
      title: 'Save and continue on your terms',
      description:
        'My Insurance holds research history. Enrollment stays on HealthCare.gov, state Marketplaces, Medicare.gov, or a licensed professional you choose.',
    },
  ],
} as const;

export const INSURANCE_TRUST = {
  eyebrow: 'Trust principles',
  title: 'Built for confidence — not conversion',
  support:
    'Independent research only. Public sources first. Verified agency inventory only when real. Official enrollment pathways remain official.',
  pillars: [
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
  ],
  primaryCta: { label: 'Read our methodology', href: '/methodology' },
  secondaryCta: {
    label: 'Independence Policy',
    href: 'https://www.asktrusthub.com/promise',
    external: true,
  },
  tertiaryCta: { label: 'About & Trust', href: '/about' },
  philosophy: 'We cite. You decide.',
  tagline: 'Research first. Verify always.',
} as const;

export const INSURANCE_PATHWAYS = {
  eyebrow: 'Local research',
  title: 'Options where you live',
  support:
    'Markets, guides, and ZIP-based tools. Agent directories only surface verified research inventory — empty markets stay honest.',
  coverageTypes: [
    { label: 'Health / ACA', href: '/hubs/health-insurance' },
    { label: 'Medicare', href: '/medicare' },
    { label: 'ACA Marketplace', href: '/hubs/aca' },
    { label: 'Auto (research)', href: '/directory?type=auto' },
    { label: 'Home (research)', href: '/directory?type=homeowners' },
    { label: 'Renters (research)', href: '/directory?type=renters' },
  ],
  markets: [
    { label: 'All hubs', href: '/hubs' },
    { label: 'State browser', href: '/hubs/browse' },
    { label: 'ACA guides', href: '/guides' },
    { label: 'Marketplace counties', href: '/marketplace' },
    { label: 'Medicare counties', href: '/data/counties' },
  ],
  goals: [
    {
      label: 'Local Marketplace landscape',
      href: '/tools/marketplace-plan-research',
      detail: 'ZIP-based ACA research',
    },
    {
      label: 'Verify a license',
      href: '/tools/license-verification',
      detail: 'Official DOI pathways',
    },
    {
      label: 'Complaint Index',
      href: '/data/plan-complaint-index',
      detail: 'CMS MA / Part D signals',
    },
    {
      label: 'Verified directory',
      href: '/directory',
      detail: 'Only when real inventory exists',
    },
  ],
  tools: [
    { label: 'Research Center', href: '/tools' },
    { label: 'My Insurance', href: '/my-insurance' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'Calculators', href: '/calculators' },
    { label: 'About & trust', href: '/about' },
  ],
} as const;

export const INSURANCE_NETWORK_SECTION = {
  eyebrow: 'Ask Trust Hub network',
  title: 'Protection & Coverage within a wider research network',
  support:
    'Insurance Trust Hub is the specialist protection layer. Ask is the parent knowledge layer; Move and Lender cover their own verified domains under the same independence standard.',
  philosophy: 'We cite. You decide.',
  tagline: 'Cover what counts. Choose well.',
} as const;

/**
 * Primary header nav (insurance research IA).
 * Switch Hub is a separate control.
 */
export const INSURANCE_HEADER_NAV = [
  { href: '/tools', label: 'Research' },
  { href: '/tools/marketplace-plan-research', label: 'Marketplace' },
  { href: '/medicare', label: 'Medicare' },
  { href: '/guides', label: 'Guides' },
  { href: '/directory', label: 'Directory' },
  { href: '/methodology', label: 'Methodology' },
] as const;

export const INSURANCE_HEADER_CTA = {
  label: 'Research Center',
  href: '/tools',
} as const;

/** Network switcher + footer network (sibling hubs + parent Ask) */
export const INSURANCE_NETWORK_LINKS = [
  {
    id: 'ask' as const,
    label: 'Ask Trust Hub',
    shortLabel: 'Ask',
    href: 'https://www.asktrusthub.com',
    blurb: 'Parent knowledge & concierge layer',
  },
  {
    id: 'move' as const,
    label: 'Move Trust Hub',
    shortLabel: 'Move',
    href: 'https://www.movetrusthub.com',
    blurb: 'FMCSA movers & local guides',
  },
  {
    id: 'lender' as const,
    label: 'Lender Trust Hub',
    shortLabel: 'Lender',
    href: 'https://www.lendertrusthub.com',
    blurb: 'NMLS lenders & financing tools',
  },
  {
    id: 'contractor' as const,
    label: 'Contractor Trust Hub',
    shortLabel: 'Contractor',
    href: 'https://www.contractortrusthub.com',
    blurb: 'Florida contractor license verification & project planning',
  },
] as const;

export const INSURANCE_FOOTER_COLUMNS = [
  {
    title: 'Coverage need',
    links: [
      { href: '/tools/coverage-compass', label: 'Coverage Compass' },
      { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
      { href: '/tools/cost-estimator', label: 'Cost & Coverage Planner' },
      { href: '/medicare', label: 'Medicare research' },
      { href: '/guides', label: 'ACA guides' },
    ],
  },
  {
    title: 'Local options',
    links: [
      { href: '/tools/marketplace-plan-research', label: 'Marketplace plans near you' },
      { href: '/tools/aca-plan-explorer', label: 'ACA Plan Explorer' },
      { href: '/hubs', label: 'Market hubs' },
      { href: '/directory', label: 'Verified directory' },
      { href: '/carriers', label: 'Carrier research' },
    ],
  },
  {
    title: 'Verify & trust',
    links: [
      { href: '/data/plan-complaint-index', label: 'Plan Complaint Index' },
      { href: '/tools/license-verification', label: 'License verification' },
      { href: '/methodology', label: 'Methodology' },
      { href: '/my-insurance', label: 'My Insurance' },
      { href: 'https://www.asktrusthub.com/promise', label: 'Independence Policy', external: true },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
] as const;
