/**
 * Phase 4 — Florida DFS launch geography.
 * DFS often labels Miami-Dade as "Dade".
 */

export type FlLaunchCountyId =
  | 'miami_dade'
  | 'broward'
  | 'palm_beach'
  | 'duval'
  | 'hillsborough';

export type FlLaunchCounty = {
  id: FlLaunchCountyId;
  /** Canonical display name */
  displayName: string;
  /** DFS / raw county name variants (uppercase compare) */
  aliases: string[];
  /** Hub slugs that should surface this county’s verified inventory */
  hubSlugs: string[];
};

export const FL_DFS_REGULATOR = 'Florida DFS';
export const FL_DFS_SOURCE_URL = 'https://licenseesearch.fldfs.com/BulkDownload';
export const FL_DFS_LOOKUP_URL =
  'https://licenseesearch.fldfs.com/';

export const FL_LAUNCH_COUNTIES: FlLaunchCounty[] = [
  {
    id: 'miami_dade',
    displayName: 'Miami-Dade',
    // DFS often labels as Dade; promote tags "(Dade County)" and/or "(Miami-Dade County)"
    aliases: [
      'MIAMI-DADE',
      'MIAMI DADE',
      'DADE',
      'MIAMI-DADE COUNTY',
      'DADE COUNTY',
      'MIAMI DADE COUNTY',
    ],
    hubSlugs: ['miami-dade', 'miami-fort-lauderdale'],
  },
  {
    id: 'broward',
    displayName: 'Broward',
    aliases: ['BROWARD', 'BROWARD COUNTY'],
    // Canonical hub is broward-county; /hubs/florida/broward redirects there
    hubSlugs: ['broward-county', 'broward', 'miami-fort-lauderdale'],
  },
  {
    id: 'palm_beach',
    displayName: 'Palm Beach',
    aliases: ['PALM BEACH', 'PALM BEACH COUNTY', 'PALM-BEACH'],
    hubSlugs: ['palm-beach-county', 'miami-fort-lauderdale'],
  },
  {
    id: 'duval',
    displayName: 'Duval',
    aliases: ['DUVAL', 'DUVAL COUNTY'],
    hubSlugs: ['jacksonville'],
  },
  {
    id: 'hillsborough',
    displayName: 'Hillsborough',
    aliases: ['HILLSBOROUGH', 'HILLSBOROUGH COUNTY'],
    hubSlugs: ['tampa'],
  },
];

export function normalizeCountyName(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw
    .trim()
    .toUpperCase()
    .replace(/COUNTY$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchLaunchCounty(
  countyRaw: string | null | undefined
): FlLaunchCounty | null {
  const n = normalizeCountyName(countyRaw);
  if (!n) return null;
  for (const c of FL_LAUNCH_COUNTIES) {
    for (const a of c.aliases) {
      const an = normalizeCountyName(a);
      if (an && (n === an || n.includes(an) || an.includes(n))) return c;
    }
  }
  return null;
}

/** Counties (canonical display) associated with a hub slug. */
export function launchCountiesForHubSlug(hubSlug: string): FlLaunchCounty[] {
  return FL_LAUNCH_COUNTIES.filter((c) => c.hubSlugs.includes(hubSlug));
}

export function isFlLaunchHub(hubSlug: string): boolean {
  return launchCountiesForHubSlug(hubSlug).length > 0;
}

/** Primary single-county hub path for a launch county (excludes multi-county aggregates). */
export function primaryHubPathForCounty(county: FlLaunchCounty): string {
  const slug =
    county.hubSlugs.find((s) => s !== 'miami-fort-lauderdale') ??
    county.hubSlugs[0];
  return `/hubs/florida/${slug}`;
}

/**
 * Consumer/ops nav rows for every launch county — keeps Broward in parity with
 * Miami-Dade, Palm Beach, Duval, and Hillsborough.
 */
export function flLaunchCountyNavRows(): Array<{
  id: FlLaunchCountyId;
  displayName: string;
  hubHref: string;
  hubSlug: string;
}> {
  return FL_LAUNCH_COUNTIES.map((c) => {
    const hubSlug =
      c.hubSlugs.find((s) => s !== 'miami-fort-lauderdale') ?? c.hubSlugs[0];
    return {
      id: c.id,
      displayName: c.displayName,
      hubSlug,
      hubHref: primaryHubPathForCounty(c),
    };
  });
}
