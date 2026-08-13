/**
 * Florida DFS promote geography — wave 1 (SFL + Duval + Hillsborough)
 * plus wave 2 (Orlando metro + Tampa Bay expansion).
 * DFS often labels Miami-Dade as "Dade".
 */

export type FlLaunchCountyId =
  | 'miami_dade'
  | 'broward'
  | 'palm_beach'
  | 'duval'
  | 'hillsborough'
  | 'orange'
  | 'osceola'
  | 'seminole'
  | 'pinellas'
  | 'pasco';

export type FlLaunchWave = 1 | 2;

export type FlLaunchCounty = {
  id: FlLaunchCountyId;
  /** Canonical display name */
  displayName: string;
  /** DFS / raw county name variants (uppercase compare) */
  aliases: string[];
  /** Hub slugs that should surface this county’s verified inventory */
  hubSlugs: string[];
  /** Import/promote wave */
  wave: FlLaunchWave;
  /**
   * Soft cap for public promote volume per county (ops control).
   * Raise via re-promote after raising cap — never invent rows.
   */
  promoteCap: number;
};

export const FL_DFS_REGULATOR = 'Florida DFS';
export const FL_DFS_SOURCE_URL = 'https://licenseesearch.fldfs.com/BulkDownload';
export const FL_DFS_LOOKUP_URL =
  'https://licenseesearch.fldfs.com/';

export const FL_LAUNCH_COUNTIES: FlLaunchCounty[] = [
  {
    id: 'miami_dade',
    displayName: 'Miami-Dade',
    aliases: [
      'MIAMI-DADE',
      'MIAMI DADE',
      'DADE',
      'MIAMI-DADE COUNTY',
      'DADE COUNTY',
      'MIAMI DADE COUNTY',
    ],
    hubSlugs: ['miami-dade', 'miami-fort-lauderdale'],
    wave: 1,
    promoteCap: 3000,
  },
  {
    id: 'broward',
    displayName: 'Broward',
    aliases: ['BROWARD', 'BROWARD COUNTY'],
    hubSlugs: ['broward-county', 'broward', 'miami-fort-lauderdale'],
    wave: 1,
    promoteCap: 2000,
  },
  {
    id: 'palm_beach',
    displayName: 'Palm Beach',
    aliases: ['PALM BEACH', 'PALM BEACH COUNTY', 'PALM-BEACH'],
    hubSlugs: ['palm-beach-county', 'miami-fort-lauderdale'],
    wave: 1,
    promoteCap: 2000,
  },
  {
    id: 'duval',
    displayName: 'Duval',
    aliases: ['DUVAL', 'DUVAL COUNTY'],
    hubSlugs: ['jacksonville'],
    wave: 1,
    promoteCap: 2000,
  },
  {
    id: 'hillsborough',
    displayName: 'Hillsborough',
    aliases: ['HILLSBOROUGH', 'HILLSBOROUGH COUNTY'],
    hubSlugs: ['tampa'],
    wave: 1,
    promoteCap: 2000,
  },
  // —— Wave 2: Orlando metro + Tampa Bay expansion ——
  {
    id: 'orange',
    displayName: 'Orange',
    aliases: ['ORANGE', 'ORANGE COUNTY'],
    hubSlugs: ['orlando'],
    wave: 2,
    promoteCap: 2000,
  },
  {
    id: 'osceola',
    displayName: 'Osceola',
    aliases: ['OSCEOLA', 'OSCEOLA COUNTY'],
    hubSlugs: ['orlando'],
    wave: 2,
    promoteCap: 1500,
  },
  {
    id: 'seminole',
    displayName: 'Seminole',
    aliases: ['SEMINOLE', 'SEMINOLE COUNTY'],
    hubSlugs: ['orlando'],
    wave: 2,
    promoteCap: 1500,
  },
  {
    id: 'pinellas',
    displayName: 'Pinellas',
    aliases: ['PINELLAS', 'PINELLAS COUNTY'],
    hubSlugs: ['tampa'],
    wave: 2,
    promoteCap: 2000,
  },
  {
    id: 'pasco',
    displayName: 'Pasco',
    aliases: ['PASCO', 'PASCO COUNTY'],
    hubSlugs: ['tampa'],
    wave: 2,
    promoteCap: 1500,
  },
];

export function promoteCapForCounty(id: FlLaunchCountyId): number {
  return FL_LAUNCH_COUNTIES.find((c) => c.id === id)?.promoteCap ?? 2000;
}

export function countiesForWave(wave: FlLaunchWave): FlLaunchCounty[] {
  return FL_LAUNCH_COUNTIES.filter((c) => c.wave === wave);
}

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
 * Consumer/ops nav rows for every promote county.
 */
export function flLaunchCountyNavRows(): Array<{
  id: FlLaunchCountyId;
  displayName: string;
  hubHref: string;
  hubSlug: string;
  wave: FlLaunchWave;
}> {
  return FL_LAUNCH_COUNTIES.map((c) => {
    const hubSlug =
      c.hubSlugs.find((s) => s !== 'miami-fort-lauderdale') ?? c.hubSlugs[0];
    return {
      id: c.id,
      displayName: c.displayName,
      hubSlug,
      hubHref: primaryHubPathForCounty(c),
      wave: c.wave,
    };
  });
}

/**
 * Honest inventory scope for launch hubs (metro brand vs county-scoped DFS promote).
 */
export function inventoryScopeNoteForHub(hubSlug: string): string | null {
  switch (hubSlug) {
    case 'jacksonville':
      return 'Verified DFS inventory for this launch is Duval County. St. Johns, Clay, and Nassau remain metro context until promoted.';
    case 'tampa':
      return 'Verified DFS inventory for Tampa Bay covers Hillsborough, Pinellas, and Pasco counties (wave 1–2 promote).';
    case 'orlando':
      return 'Verified DFS inventory for Central Florida covers Orange, Osceola, and Seminole counties (wave 2 promote).';
    case 'miami-dade':
      return 'Verified DFS inventory is scoped to Miami-Dade County (DFS often labels this county as Dade).';
    case 'broward-county':
    case 'broward':
      return 'Verified DFS inventory is scoped to Broward County.';
    case 'palm-beach-county':
      return 'Verified DFS inventory is scoped to Palm Beach County.';
    case 'miami-fort-lauderdale':
      return 'Verified DFS inventory for South Florida aggregates Miami-Dade, Broward, and Palm Beach counties.';
    // —— Phase 8 Texas TDI ——
    case 'houston':
      return 'Verified TDI inventory for this launch is Wave-1 Houston / Harris–area agencies (city/ZIP match from Texas TDI open data). County is sparse on TDI rows except title agencies. Promote caps limit density — not a full statewide dump.';
    case 'dallas-fort-worth':
      return 'Verified TDI inventory for Dallas–Fort Worth aggregates Wave-1 Dallas (Dallas County area) and Fort Worth (Tarrant area) markets. Metro branding is DFW; promotion is market-scoped with caps, not every TX licensee.';
    case 'austin':
      return 'Verified TDI inventory for this launch is Wave-1 Austin / Travis–area agencies (city/ZIP match from Texas TDI open data).';
    case 'san-antonio':
      return 'Verified TDI inventory for this launch is Wave-1 San Antonio / Bexar–area agencies (city/ZIP match from Texas TDI open data).';
    // —— Phase 9 New Jersey DOBI ——
    case 'south-new-jersey':
      return 'Verified DOBI inventory for this launch is Wave-1 South Jersey agencies (Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, Salem area — city/county/ZIP match). Organization/agency entities only.';
    case 'central-new-jersey':
      return 'Verified DOBI inventory for this launch is Wave-1 Central Jersey agencies (Middlesex, Mercer, Monmouth, Ocean, Somerset area — city/county/ZIP match). Organization/agency entities only.';
    case 'north-new-jersey':
      return 'Verified DOBI inventory for this launch is Wave-1 North Jersey agencies (Bergen, Essex, Hudson, Passaic, Morris, Union + northwest counties — city/county/ZIP match). Organization/agency entities only.';
    // —— Phase 10 Ohio ODI ——
    case 'columbus':
      return 'Verified ODI inventory for this launch is Wave-1 Columbus / Franklin–area agencies (city/county/ZIP match). Business entities only.';
    case 'cleveland':
      return 'Verified ODI inventory for this launch is Wave-1 Cleveland / Cuyahoga–area agencies (city/county/ZIP match). Business entities only.';
    case 'cincinnati':
      return 'Verified ODI inventory for this launch is Wave-1 Cincinnati / Hamilton–area agencies (city/county/ZIP match). Business entities only.';
    case 'toledo':
      return 'Verified ODI inventory for this launch is Wave-1 Toledo / Lucas–area agencies (city/county/ZIP match). Business entities only.';
    case 'akron':
      return 'Verified ODI inventory for this launch is Wave-1 Akron / Summit–area agencies (city/county/ZIP match). Business entities only.';
    case 'dayton':
      return 'Verified ODI inventory for this launch is Wave-1 Dayton / Montgomery–area agencies (city/county/ZIP match). Business entities only.';
    // —— Phase 13 North Carolina DOI ——
    case 'charlotte':
      return 'Verified NC DOI inventory for this launch is Wave-1 Charlotte / Mecklenburg–area agencies (city/county/ZIP match). Agency/business entities only.';
    case 'raleigh':
      return 'Verified NC DOI inventory for this launch is Wave-1 Research Triangle agencies (Wake, Durham, and Orange — city/county/ZIP match). Agency/business entities only.';
    case 'greensboro':
      return 'Verified NC DOI inventory for this launch is Wave-1 Greensboro / Guilford agencies (city/county/ZIP match). Agency/business entities only.';
    case 'wilmington':
      return 'Verified NC DOI inventory for this launch is Wave-1 Wilmington / New Hanover agencies (city/county/ZIP match). Agency/business entities only.';
    default:
      return null;
  }
}
