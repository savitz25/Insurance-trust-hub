/**
 * Insurance Trust Hub — Master Design System (Phase 1).
 * Protection & Coverage layer of the Ask Trust Hub network.
 *
 * CSS variables: app/globals.css (:root / [data-hub="insurance"]).
 */

export const INSURANCE_BRAND = {
  /** Shield Blue — primary CTAs, active nav, focus */
  shield: '#0284C7',
  /** Deep Sapphire — hover / deeper emphasis */
  sapphire: '#1E3A8A',
  sapphireDeep: '#172554',
  /** Ice Blue — soft surfaces, tags, selected */
  ice: '#E0F2FE',
  /** Deep Navy — primary text, footer */
  navy: '#0A2540',
  /** High-contrast body */
  ink: '#1E293B',
  canvas: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  onNavyMuted: '#94A3B8',
  onNavySoft: '#CBD5E1',
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
