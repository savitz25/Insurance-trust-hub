/**
 * Phase 14 — Nevada DOI Wave 1 launch markets (firms / agencies only).
 * Matching: city list first, then ZIP 3-digit prefix (last resort).
 * Henderson maps into Las Vegas / Clark. Out-of-state HQ is never hub-placed.
 */

export type NvLaunchMarketId = 'las-vegas' | 'reno' | 'carson-city';

export type NvLaunchMarket = {
  id: NvLaunchMarketId;
  displayName: string;
  primaryCounty: string;
  countyAliases: string[];
  cities: string[];
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
};

export const NV_DOI_REGULATOR = 'Nevada Division of Insurance';
export const NV_DOI_HOME_URL = 'https://doi.nv.gov/';
export const NV_DOI_REPORTS_URL = 'https://di.nv.gov/nv/r/doi/reports-and-lookups/home';
export const NV_DOI_LOOKUP_URL =
  'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NV';

export const NV_LAUNCH_MARKETS: NvLaunchMarket[] = [
  {
    id: 'las-vegas',
    displayName: 'Las Vegas / Clark County',
    primaryCounty: 'Clark',
    countyAliases: ['CLARK', 'CLARK COUNTY'],
    cities: [
      'LAS VEGAS',
      'HENDERSON',
      'NORTH LAS VEGAS',
      'N LAS VEGAS',
      'N. LAS VEGAS',
      'BOULDER CITY',
      'SUMMERLIN',
      'PARADISE',
      'SPRING VALLEY',
      'ENTERPRISE',
      'MESQUITE',
      'LAUGHLIN',
    ],
    zipPrefixes: ['891'],
    hubSlugs: ['las-vegas'],
    promoteCap: 2000,
  },
  {
    id: 'reno',
    displayName: 'Reno / Washoe County',
    primaryCounty: 'Washoe',
    countyAliases: ['WASHOE', 'WASHOE COUNTY'],
    cities: [
      'RENO',
      'SPARKS',
      'SUN VALLEY',
      'WASHOE VALLEY',
      'INCLINE VILLAGE',
      'VERDI',
    ],
    zipPrefixes: ['895'],
    hubSlugs: ['reno'],
    promoteCap: 1500,
  },
  {
    id: 'carson-city',
    displayName: 'Carson City',
    primaryCounty: 'Carson City',
    countyAliases: ['CARSON CITY', 'CARSON'],
    cities: ['CARSON CITY'],
    zipPrefixes: ['897'],
    hubSlugs: ['carson-city'],
    promoteCap: 400,
  },
];

export function normalizeCityName(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\(CLARK\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function zipPrefix3(zip: string | null | undefined): string {
  if (!zip) return '';
  return zip.replace(/\D/g, '').slice(0, 3);
}

export function matchNvLaunchMarket(input: {
  city?: string | null;
  zip?: string | null;
  hqState?: string | null;
}): NvLaunchMarket | null {
  const hq = (input.hqState || '').toUpperCase().slice(0, 2);
  if (hq && hq !== 'NV') return null;

  const city = normalizeCityName(input.city);
  if (city) {
    for (const m of NV_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  const z3 = zipPrefix3(input.zip);
  if (z3) {
    for (const m of NV_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }

  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): NvLaunchMarket[] {
  return NV_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isNvLaunchHub(hubSlug: string): boolean {
  return NV_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): NvLaunchMarket | undefined {
  return NV_LAUNCH_MARKETS.find((m) => m.id === id);
}
