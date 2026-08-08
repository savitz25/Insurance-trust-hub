/**
 * Phase 13 — Curated carrier identity registry.
 * Deterministic slugs + explicit matchers only (no fuzzy “guess the parent”).
 */

export type CarrierRegistryEntry = {
  slug: string;
  displayName: string;
  /** Optional known marketing / legal aliases (display only) */
  aliases: string[];
  /**
   * Match against Medicare contract carrierName (CMS extracts).
   * All patterns are case-insensitive.
   */
  medicareNameMatchers: RegExp[];
  /**
   * Match against ACA Marketplace issuerName fields when present.
   */
  acaIssuerMatchers: RegExp[];
  /** Optional notes shown as research context (not marketing) */
  identityNote?: string;
};

/**
 * Curated strong carriers with evidence in FL Medicare extracts and/or
 * common Marketplace issuer naming. Expand only with evidence.
 */
export const CARRIER_REGISTRY: CarrierRegistryEntry[] = [
  {
    slug: 'humana',
    displayName: 'Humana',
    aliases: ['Humana Inc.'],
    medicareNameMatchers: [/^humana$/i, /^humana\b/i],
    acaIssuerMatchers: [/\bhumana\b/i],
  },
  {
    slug: 'unitedhealthcare',
    displayName: 'UnitedHealthcare',
    aliases: ['United Healthcare', 'UHC'],
    medicareNameMatchers: [/unitedhealthcare/i, /united health care/i],
    acaIssuerMatchers: [/unitedhealthcare/i, /united health/i, /\buhc\b/i],
    identityNote:
      'UnitedHealthcare appears under multiple legal entity names; we match reported CMS / issuer strings, not invent a corporate tree.',
  },
  {
    slug: 'aetna',
    displayName: 'Aetna',
    aliases: ['Aetna Medicare', 'CVS Health / Aetna'],
    medicareNameMatchers: [/\baetna\b/i],
    acaIssuerMatchers: [/\baetna\b/i],
  },
  {
    slug: 'florida-blue',
    displayName: 'Florida Blue',
    aliases: ['Blue Cross and Blue Shield of Florida', 'GuideWell'],
    medicareNameMatchers: [/^florida blue$/i, /florida blue/i],
    acaIssuerMatchers: [/florida blue/i, /blue cross and blue shield of florida/i],
    identityNote:
      'Florida Blue is the Florida BCBS brand. Other BCBS plans are separate carrier pages when evidenced.',
  },
  {
    slug: 'wellcare',
    displayName: 'Wellcare',
    aliases: ['WellCare'],
    medicareNameMatchers: [/\bwellcare\b/i, /\bwell care\b/i],
    acaIssuerMatchers: [/\bwellcare\b/i],
  },
  {
    slug: 'careplus',
    displayName: 'CarePlus',
    aliases: ['CarePlus Health Plans, Inc.'],
    medicareNameMatchers: [/careplus/i],
    acaIssuerMatchers: [/careplus/i],
  },
  {
    slug: 'healthsun',
    displayName: 'HealthSun',
    aliases: ['HealthSun Health Plans, Inc.'],
    medicareNameMatchers: [/healthsun/i],
    acaIssuerMatchers: [/healthsun/i],
  },
  {
    slug: 'doctors-healthcare-plans',
    displayName: 'Doctors HealthCare Plans',
    aliases: ['Doctors HealthCare Plans, Inc.'],
    medicareNameMatchers: [/doctors healthcare/i],
    acaIssuerMatchers: [/doctors healthcare/i],
  },
  {
    slug: 'leon-health',
    displayName: 'Leon Health',
    aliases: ['Leon Health, Inc.'],
    medicareNameMatchers: [/leon health/i],
    acaIssuerMatchers: [/leon health/i],
  },
  {
    slug: 'cigna',
    displayName: 'Cigna',
    aliases: ['Cigna Healthcare'],
    medicareNameMatchers: [/\bcigna\b/i],
    acaIssuerMatchers: [/\bcigna\b/i],
  },
  {
    slug: 'kaiser-permanente',
    displayName: 'Kaiser Permanente',
    aliases: ['Kaiser Foundation Health Plan'],
    medicareNameMatchers: [/\bkaiser\b/i],
    acaIssuerMatchers: [/\bkaiser\b/i],
  },
  {
    slug: 'oscar',
    displayName: 'Oscar',
    aliases: ['Oscar Health', 'Oscar Insurance'],
    medicareNameMatchers: [/\boscar\b/i],
    acaIssuerMatchers: [/\boscar\b/i],
  },
  {
    slug: 'molina',
    displayName: 'Molina Healthcare',
    aliases: ['Molina'],
    medicareNameMatchers: [/\bmolina\b/i],
    acaIssuerMatchers: [/\bmolina\b/i],
  },
  {
    slug: 'ambetter',
    displayName: 'Ambetter',
    aliases: ['Ambetter from Centene', 'Centene'],
    medicareNameMatchers: [/\bambetter\b/i, /\bcentene\b/i],
    acaIssuerMatchers: [/\bambetter\b/i, /\bcentene\b/i],
    identityNote:
      'Ambetter is a Centene Marketplace brand; Medicare may appear under related Centene names when CMS reports them.',
  },
];

export function getCarrierBySlug(slug: string): CarrierRegistryEntry | null {
  const s = slug.toLowerCase().trim();
  return CARRIER_REGISTRY.find((c) => c.slug === s) ?? null;
}

export function carrierPath(slug: string): string {
  return `/carriers/${slug}`;
}

/** Match a free-text org name to at most one curated carrier (first explicit match). */
export function matchCarrierByReportedName(
  reportedName: string | null | undefined
): CarrierRegistryEntry | null {
  const name = (reportedName || '').trim();
  if (!name) return null;
  for (const c of CARRIER_REGISTRY) {
    for (const re of [...c.medicareNameMatchers, ...c.acaIssuerMatchers]) {
      if (re.test(name)) return c;
    }
  }
  return null;
}

export function slugifyIssuerFallback(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}
