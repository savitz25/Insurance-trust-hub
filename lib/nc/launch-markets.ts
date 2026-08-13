/**
 * Phase 13 — North Carolina DOI Wave 1 launch markets (agencies / business entities only).
 * Matching: city list → county aliases → ZIP 3-digit prefix (last resort).
 *
 * Aligned with existing consumer markets:
 * - /hubs/north-carolina/charlotte + /guides/charlotte-aca-marketplace
 * - /hubs/north-carolina/raleigh + /guides/research-triangle-aca-marketplace
 * - /hubs/north-carolina/greensboro
 * - /hubs/north-carolina/wilmington (optional density)
 */

export type NcLaunchMarketId = 'charlotte' | 'triangle' | 'greensboro' | 'wilmington';

export type NcLaunchMarket = {
  id: NcLaunchMarketId;
  displayName: string;
  primaryCounty: string;
  countyAliases: string[];
  cities: string[];
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
};

export const NC_DOI_REGULATOR = 'North Carolina Department of Insurance';
export const NC_DOI_HOME_URL = 'https://www.ncdoi.gov/';
export const NC_DOI_SBS_URL =
  'https://www.ncdoi.gov/licensees/insurance-producer-and-adjuster-licensing/continuing-education-agents-and-adjusters/sbs-report-generator-service';
export const NC_DOI_LOOKUP_URL =
  'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NC';
export const NC_DOI_FIND_AGENT_URL = 'https://www.ncdoi.gov/consumers/helpful-links';

export const NC_LAUNCH_MARKETS: NcLaunchMarket[] = [
  {
    id: 'charlotte',
    displayName: 'Charlotte / Mecklenburg',
    primaryCounty: 'Mecklenburg',
    countyAliases: [
      'MECKLENBURG',
      'MECKLENBURG COUNTY',
      'UNION',
      'CABARRUS',
      'GASTON',
    ],
    cities: [
      'CHARLOTTE',
      'MATTHEWS',
      'HUNTERSVILLE',
      'CORNELIUS',
      'DAVIDSON',
      'MINT HILL',
      'PINEVILLE',
      'CONCORD',
      'KANNAPOLIS',
      'GASTONIA',
      'BELMONT',
      'MOUNT HOLLY',
      'INDIAN TRAIL',
      'MONROE',
      'WAXHAW',
      'HARRISBURG',
    ],
    zipPrefixes: ['280', '281', '282'],
    hubSlugs: ['charlotte'],
    promoteCap: 2000,
  },
  {
    id: 'triangle',
    displayName: 'Raleigh–Durham–Chapel Hill / Research Triangle',
    primaryCounty: 'Wake',
    countyAliases: [
      'WAKE',
      'WAKE COUNTY',
      'DURHAM',
      'DURHAM COUNTY',
      'ORANGE',
      'ORANGE COUNTY',
    ],
    cities: [
      'RALEIGH',
      'DURHAM',
      'CHAPEL HILL',
      'CARY',
      'APEX',
      'MORRISVILLE',
      'WAKE FOREST',
      'HOLLY SPRINGS',
      'GARNER',
      'KNIGHTDALE',
      'CARRBORO',
      'HILLSBOROUGH',
      'FUQUAY VARINA',
      'FUQUAY-VARINA',
      'CLAYTON',
      'ROLESVILLE',
    ],
    zipPrefixes: ['275', '276', '277'],
    hubSlugs: ['raleigh'],
    promoteCap: 2000,
  },
  {
    id: 'greensboro',
    displayName: 'Greensboro / Guilford',
    primaryCounty: 'Guilford',
    countyAliases: ['GUILFORD', 'GUILFORD COUNTY'],
    cities: [
      'GREENSBORO',
      'HIGH POINT',
      'JAMESTOWN',
      'OAK RIDGE',
      'STOKESDALE',
      'SUMMERFIELD',
      'MCLEANSVILLE',
      'BROWNS SUMMIT',
    ],
    zipPrefixes: ['272', '273', '274'],
    hubSlugs: ['greensboro'],
    promoteCap: 1500,
  },
  {
    id: 'wilmington',
    displayName: 'Wilmington / New Hanover',
    primaryCounty: 'New Hanover',
    countyAliases: ['NEW HANOVER', 'NEW HANOVER COUNTY'],
    cities: [
      'WILMINGTON',
      'CAROLINA BEACH',
      'WRIGHTSVILLE BEACH',
      'KURE BEACH',
      'CASTLE HAYNE',
    ],
    zipPrefixes: ['284'],
    hubSlugs: ['wilmington'],
    promoteCap: 800,
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
  const digits = zip.replace(/\D/g, '');
  return digits.slice(0, 3);
}

export function matchNcLaunchMarket(input: {
  county?: string | null;
  city?: string | null;
  zip?: string | null;
}): NcLaunchMarket | null {
  const county = normalizeCountyName(input.county);
  const city = normalizeCityName(input.city);
  const z3 = zipPrefix3(input.zip);

  if (city) {
    for (const m of NC_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  if (county) {
    for (const m of NC_LAUNCH_MARKETS) {
      if (m.countyAliases.some((a) => normalizeCountyName(a) === county || a === county)) {
        return m;
      }
    }
  }

  if (z3) {
    for (const m of NC_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }

  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): NcLaunchMarket[] {
  return NC_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isNcLaunchHub(hubSlug: string): boolean {
  return NC_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): NcLaunchMarket | undefined {
  return NC_LAUNCH_MARKETS.find((m) => m.id === id);
}

export function inventoryScopeNoteForNorthCarolinaHub(hubSlug: string): string | null {
  const markets = launchMarketsForHubSlug(hubSlug);
  if (!markets.length) return null;
  const label = markets.map((m) => m.displayName).join(', ');
  return `Verified NC DOI inventory for this launch is scoped to ${label}. Other North Carolina counties remain metro context until promoted. Agency/business entities only.`;
}
