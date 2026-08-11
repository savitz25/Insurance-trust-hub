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
 * Precise PostgREST or() fragments for a launch county.
 * Never put raw `()` inside ilike values — PostgREST treats them as grouping.
 */
export function countyMatchOrParts(county: FlLaunchCounty): string[] {
  const parts: string[] = [];
  const display = county.displayName;

  parts.push(`contact->>launch_county_id.eq.${county.id}`);
  parts.push(`contact->>county.eq.${display}`);
  parts.push(
    `contact->>county_normalized.eq.${county.id.replace(/_/g, '-').toUpperCase()}`
  );
  parts.push(`short_description.ilike.%${display} County%`);

  for (const a of county.aliases) {
    const cleaned = a
      .replace(/COUNTY$/i, '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 3) continue;
    const title = cleaned
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
    if (title.toLowerCase() === display.toLowerCase()) continue;
    parts.push(`short_description.ilike.%${title} County%`);
  }

  return [...new Set(parts)];
}

export function structuredContactForCounty(county: FlLaunchCounty): {
  county: string;
  county_normalized: string;
  launch_county_id: FlLaunchCountyId;
} {
  return {
    county: county.displayName,
    county_normalized: county.id.replace(/_/g, '-').toUpperCase(),
    launch_county_id: county.id,
  };
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

/**
 * Honest inventory scope for launch hubs (metro brand vs county-scoped DFS promote).
 * Shown on hub pages so consumers know what verified rows cover.
 */
export function inventoryScopeNoteForHub(hubSlug: string): string | null {
  switch (hubSlug) {
    case 'jacksonville':
      return 'Verified DFS inventory for this launch is Duval County only. St. Johns, Clay, and Nassau appear as metro context — not full promote coverage yet.';
    case 'tampa':
      return 'Verified DFS inventory for this launch is Hillsborough County only. Pinellas and Pasco appear as metro context — not full promote coverage yet.';
    case 'miami-dade':
      return 'Verified DFS inventory is scoped to Miami-Dade County (DFS often labels this county as Dade).';
    case 'broward-county':
    case 'broward':
      return 'Verified DFS inventory is scoped to Broward County.';
    case 'palm-beach-county':
      return 'Verified DFS inventory is scoped to Palm Beach County.';
    case 'miami-fort-lauderdale':
      return 'Verified DFS inventory for South Florida aggregates Miami-Dade, Broward, and Palm Beach counties.';
    default:
      return null;
  }
}
