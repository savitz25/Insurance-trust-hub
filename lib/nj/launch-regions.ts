/**
 * Phase 9 — New Jersey Wave 1 launch regions (agencies only).
 * Aligned with ACA guide regions: South / Central / North Jersey.
 */

export type NjLaunchRegionId = 'south_jersey' | 'central_jersey' | 'north_jersey';

export type NjLaunchRegion = {
  id: NjLaunchRegionId;
  displayName: string;
  /** County names (uppercase, no “County” suffix) */
  counties: string[];
  /** Representative cities for city→region fallback */
  cities: string[];
  /** 3-digit ZIP prefixes common to the region */
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
  guideSlug: string;
};

export const NJ_DOBI_REGULATOR = 'New Jersey Department of Banking and Insurance';
export const NJ_DOBI_LOOKUP_URL =
  'https://www.state.nj.us/dobi/DOBI_LicSearch/index.html';
export const NJ_DOBI_LICENSING_URL = 'https://www.nj.gov/dobi/inslic.htm';
export const NJ_DOBI_SOURCE_LABEL = 'New Jersey DOBI';

/**
 * County sets mirror guide framing in lib/guides/aca-marketplace-guides.ts
 * (informal resident labels — ZIP/county still primary for matching).
 */
export const NJ_LAUNCH_REGIONS: NjLaunchRegion[] = [
  {
    id: 'south_jersey',
    displayName: 'South Jersey',
    counties: [
      'CAMDEN',
      'BURLINGTON',
      'GLOUCESTER',
      'ATLANTIC',
      'CAPE MAY',
      'CUMBERLAND',
      'SALEM',
    ],
    cities: [
      'CAMDEN',
      'CHERRY HILL',
      'VOORHEES',
      'MOUNT LAUREL',
      'MOORESTOWN',
      'WILLINGBORO',
      'GLOUCESTER CITY',
      'WOODBURY',
      'WASHINGTON TOWNSHIP',
      'TURNERSVILLE',
      'VINELAND',
      'MILLVILLE',
      'BRIDGETON',
      'ATLANTIC CITY',
      'EGG HARBOR',
      'EGG HARBOR TOWNSHIP',
      'OCEAN CITY',
      'WILDWOOD',
      'CAPE MAY',
      'SALEM',
      'MARLTON',
      'MEDFORD',
    ],
    zipPrefixes: ['080', '081', '082', '083', '084'],
    hubSlugs: ['south-new-jersey'],
    promoteCap: 2000,
    guideSlug: 'south-jersey-aca-marketplace',
  },
  {
    id: 'central_jersey',
    displayName: 'Central Jersey',
    counties: ['MIDDLESEX', 'MERCER', 'MONMOUTH', 'OCEAN', 'SOMERSET'],
    cities: [
      'NEW BRUNSWICK',
      'EAST BRUNSWICK',
      'NORTH BRUNSWICK',
      'EDISON',
      'WOODBRIDGE',
      'PISCATAWAY',
      'TRENTON',
      'HAMILTON',
      'PRINCETON',
      'LAWRENCEVILLE',
      'FREEHOLD',
      'RED BANK',
      'LONG BRANCH',
      'ASBURY PARK',
      'TOMS RIVER',
      'LAKEWOOD',
      'BRICK',
      'SOMERVILLE',
      'BRIDGEWATER',
      'FRANKLIN PARK',
    ],
    zipPrefixes: ['077', '085', '086', '087', '088', '089'],
    hubSlugs: ['central-new-jersey'],
    promoteCap: 2000,
    guideSlug: 'central-jersey-aca-marketplace',
  },
  {
    id: 'north_jersey',
    displayName: 'North Jersey',
    counties: [
      'BERGEN',
      'ESSEX',
      'HUDSON',
      'PASSAIC',
      'MORRIS',
      'UNION',
      // Northwest often grouped with North for research framing
      'SUSSEX',
      'WARREN',
      'HUNTERDON',
    ],
    cities: [
      'NEWARK',
      'JERSEY CITY',
      'HOBOKEN',
      'WEEHAWKEN',
      'UNION CITY',
      'BAYONNE',
      'ELIZABETH',
      'PATERSON',
      'CLIFTON',
      'PASSAIC',
      'HACKENSACK',
      'TEANECK',
      'FORT LEE',
      'PARAMUS',
      'MORRISTOWN',
      'PARSIPPANY',
      'UNION',
      'PLAINFIELD',
      'WESTFIELD',
      'MONTCLAIR',
      'BLOOMFIELD',
      'IRVINGTON',
      'EAST ORANGE',
      'SECAUCUS',
    ],
    zipPrefixes: ['070', '071', '072', '073', '074', '075', '076', '078', '079'],
    hubSlugs: ['north-new-jersey'],
    promoteCap: 2500,
    guideSlug: 'north-jersey-aca-marketplace',
  },
];

export function normalizeCountyName(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .toUpperCase()
    .replace(/COUNTY$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCityName(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function zipPrefix3(zip: string | null | undefined): string {
  if (!zip) return '';
  return zip.replace(/\D/g, '').slice(0, 3);
}

export function matchNjLaunchRegion(input: {
  county?: string | null;
  city?: string | null;
  zip?: string | null;
}): NjLaunchRegion | null {
  const county = normalizeCountyName(input.county);
  const city = normalizeCityName(input.city);
  const z3 = zipPrefix3(input.zip);

  if (county) {
    for (const r of NJ_LAUNCH_REGIONS) {
      if (r.counties.includes(county)) return r;
    }
  }
  if (city) {
    for (const r of NJ_LAUNCH_REGIONS) {
      if (r.cities.includes(city)) return r;
    }
  }
  if (z3) {
    for (const r of NJ_LAUNCH_REGIONS) {
      if (r.zipPrefixes.includes(z3)) return r;
    }
  }
  return null;
}

export function launchRegionsForHubSlug(hubSlug: string): NjLaunchRegion[] {
  return NJ_LAUNCH_REGIONS.filter((r) => r.hubSlugs.includes(hubSlug));
}

export function isNjLaunchHub(hubSlug: string): boolean {
  return NJ_LAUNCH_REGIONS.some((r) => r.hubSlugs.includes(hubSlug));
}

export function regionById(id: string): NjLaunchRegion | undefined {
  return NJ_LAUNCH_REGIONS.find((r) => r.id === id);
}
