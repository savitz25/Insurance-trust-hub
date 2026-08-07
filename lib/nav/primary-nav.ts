/**
 * Insurance Trust Hub primary navigation (production: insurancetrusthub.com).
 * Every href is a published route — no dead links.
 */

export type PrimaryNavLink = {
  label: string;
  href: string;
  description?: string;
};

/** Always-visible product links on desktop (lg+). */
export const PRIMARY_NAV: PrimaryNavLink[] = [
  { href: '/directory', label: 'Directory', description: 'Licensed agencies & agents' },
  { href: '/calculators', label: 'Calculators', description: 'ACA, Medicare & premium tools' },
  { href: '/resources', label: 'Guides', description: 'Coverage research articles' },
  { href: '/methodology', label: 'Methodology', description: 'How we verify agencies' },
  {
    href: '/about',
    label: 'Trust & Transparency',
    description: 'Independence and listing standards',
  },
];

/** Directory dropdown entry points. */
export const DIRECTORY_NAV: PrimaryNavLink[] = [
  {
    href: '/directory',
    label: 'All agencies & agents',
    description: 'Search the full licensed directory',
  },
  {
    href: '/hubs',
    label: 'Health insurance hubs',
    description: 'Market hubs by specialty',
  },
  {
    href: '/hubs/browse',
    label: 'Browse by state',
    description: 'State & MSA browser',
  },
  {
    href: '/destinations',
    label: 'Relocation destinations',
    description: 'Coverage notes for popular moves',
  },
  {
    href: '/providers',
    label: 'Featured providers',
    description: 'Highlighted agency profiles',
  },
];

/** Shield Blue CTA — independent directory tone (no lead-gen / free quotes). */
export const NAV_CTA = {
  href: '/directory',
  label: 'Compare coverage',
} as const;

export function navLinkActive(href: string, pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
