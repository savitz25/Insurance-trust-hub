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

/** Phase 2 — homepage hero (Protection & Coverage research layer) */
export const INSURANCE_HERO = {
  eyebrow: 'Insurance Trust Hub  ·  Protection & Coverage',
  headline: 'Verify. Compare. Protect with confidence.',
  support:
    'Independent research for insurance coverage decisions. We surface verified public sources — including DOI and license context — with no paid placements and no lead fees. You decide.',
  primaryCta: { label: 'Compare coverage', href: '/directory' },
  secondaryCta: { label: 'Explore guides', href: '/resources' },
  philosophy: 'We cite. You decide.',
  tagline: 'Cover what counts. Choose well.',
  networkLine: 'The Protection & Coverage layer of the Ask Trust Hub network.',
  chips: [
    { id: 'doi', label: 'DOI / license context' },
    { id: 'independent', label: 'Independent research' },
    { id: 'no-paid', label: 'No paid placements' },
    { id: 'guidance', label: 'Clear coverage guidance' },
  ],
  searchTitle: 'Find licensed agencies',
  searchHint: 'Enter a ZIP and optional coverage types to start local research.',
} as const;

/** Phase 3 — homepage sections below the hero */
export const INSURANCE_TOOLS = {
  eyebrow: 'Key tools',
  title: 'What you can do here',
  support:
    'Practical research tools for coverage decisions — not a quote marketplace. Start where you need clarity.',
  items: [
    {
      id: 'compare',
      title: 'Compare coverage',
      description:
        'Browse licensed agencies and public signals side-by-side — not paid rankings or sponsored slots.',
      href: '/directory',
      cta: 'Open directory',
    },
    {
      id: 'verify',
      title: 'Verify DOI / license',
      description:
        'Use license research tools and public DOI pathways so you can re-check Active status yourself.',
      href: '/tools/license-verification',
      cta: 'Verify a license',
    },
    {
      id: 'guides',
      title: 'Coverage guides',
      description:
        'Calm, educational articles that explain what matters before you enroll or switch coverage.',
      href: '/resources',
      cta: 'Explore guides',
    },
    {
      id: 'tools',
      title: 'Tools & calculators',
      description:
        'Educational planners for costs, ACA, Medicare, and related coverage questions.',
      href: '/calculators',
      cta: 'Open tools',
    },
  ],
} as const;

export const INSURANCE_HOW_IT_WORKS = {
  eyebrow: 'How it works',
  title: 'Independent research, step by step',
  support:
    'A calm path from public records to your decision — with no pressure and no paid placements.',
  steps: [
    {
      step: '01',
      title: 'Start with verified public sources',
      description:
        'Begin with directory listings and DOI / license context drawn from public research signals we surface.',
    },
    {
      step: '02',
      title: 'Compare coverage options',
      description:
        'Review agencies and educational tools side-by-side — never sponsored order or lead-fee ranking.',
    },
    {
      step: '03',
      title: 'Use guides to understand what matters',
      description:
        'Read clear coverage guidance so you know which questions to ask before you act.',
    },
    {
      step: '04',
      title: 'You decide',
      description:
        'Re-check licenses on official DOI pathways, compare offers yourself, and protect with confidence. We cite. You decide.',
    },
  ],
} as const;

export const INSURANCE_TRUST = {
  eyebrow: 'Trust & methodology',
  title: 'Built for confidence — not conversion',
  support:
    'Insurance Trust Hub is independent research only. We surface verified public sources so you can decide with clearer context.',
  pillars: [
    {
      title: 'Independent research only',
      body: 'We do not sell policies, operate a quote marketplace, or sell ranking position.',
    },
    {
      title: 'Verified public sources',
      body: 'DOI / license context and other public signals are cited so you can re-check primary records yourself.',
    },
    {
      title: 'No paid placements or lead fees',
      body: 'Directory order and research aids are not sold. We do not collect lead fees for introductions.',
    },
    {
      title: 'Clear separation of roles',
      body: 'Research tools stay on this hub. Any relationship with an external provider is yours to evaluate — not ours to sell.',
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
  tagline: 'Cover what counts. Choose well.',
} as const;

export const INSURANCE_PATHWAYS = {
  eyebrow: 'Popular pathways',
  title: 'Where people start',
  support:
    'Jump into common coverage types, markets, protection goals, or the tools you are most likely to need next.',
  coverageTypes: [
    { label: 'Health', href: '/directory?type=health' },
    { label: 'Medicare', href: '/directory?type=medicare' },
    { label: 'Auto', href: '/directory?type=auto' },
    { label: 'Homeowners', href: '/directory?type=homeowners' },
    { label: 'Life', href: '/directory?type=life' },
    { label: 'Renters', href: '/directory?type=renters' },
  ],
  markets: [
    { label: 'Florida', href: '/destinations/florida' },
    { label: 'Texas', href: '/destinations/texas' },
    { label: 'California', href: '/destinations/california' },
    { label: 'All hubs', href: '/hubs' },
    { label: 'State browser', href: '/hubs/browse' },
  ],
  goals: [
    {
      label: 'Protect my family',
      href: '/resources',
      detail: 'Guides for personal coverage decisions',
    },
    {
      label: 'Verify an agency',
      href: '/tools/license-verification',
      detail: 'DOI / license research tools',
    },
    {
      label: 'Compare options',
      href: '/directory',
      detail: 'Licensed directory research',
    },
    {
      label: 'Estimate costs',
      href: '/calculators',
      detail: 'Educational planners and tools',
    },
  ],
  tools: [
    { label: 'Agency directory', href: '/directory' },
    { label: 'License verification', href: '/tools/license-verification' },
    { label: 'Calculators', href: '/calculators' },
    { label: 'My Insurance', href: '/my-insurance' },
    { label: 'Methodology', href: '/methodology' },
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
  { href: '/directory', label: 'Compare coverage' },
  { href: '/tools/license-verification', label: 'Verify DOI / license' },
  { href: '/resources', label: 'Guides' },
  { href: '/calculators', label: 'Tools' },
  { href: '/methodology', label: 'Methodology' },
] as const;

export const INSURANCE_HEADER_CTA = {
  label: 'Compare coverage',
  href: '/directory',
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
] as const;

export const INSURANCE_FOOTER_COLUMNS = [
  {
    title: 'Research',
    links: [
      { href: '/directory', label: 'Directory' },
      { href: '/hubs', label: 'Health hubs' },
      { href: '/calculators', label: 'Calculators' },
      { href: '/tools/license-verification', label: 'License verification' },
      { href: '/resources', label: 'Guides' },
      { href: '/my-insurance', label: 'My Insurance' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { href: '/methodology', label: 'Methodology' },
      { href: '/about', label: 'About & Trust' },
      { href: 'https://www.asktrusthub.com/promise', label: 'Independence Policy', external: true },
      { href: 'https://www.asktrusthub.com/trust', label: 'Trust Center', external: true },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/about#disclaimer', label: 'Disclaimer' },
    ],
  },
] as const;
