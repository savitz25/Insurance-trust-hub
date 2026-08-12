/**
 * Phase 8 — Texas TDI Wave 1 launch markets (agencies only).
 * County is sparse on TDI open data (mainly title agencies) — city/ZIP used heavily.
 */

export type TxLaunchMarketId =
  | 'houston'
  | 'dallas'
  | 'fort_worth'
  | 'austin'
  | 'san_antonio';

export type TxLaunchMarket = {
  id: TxLaunchMarketId;
  displayName: string;
  /** Primary county name when known */
  primaryCounty: string;
  countyAliases: string[];
  /** Uppercase city names that map into this market */
  cities: string[];
  /** 3-digit ZIP prefixes (TX) */
  zipPrefixes: string[];
  /** Hub registry slugs that surface this market */
  hubSlugs: string[];
  promoteCap: number;
};

export const TX_TDI_REGULATOR = 'Texas Department of Insurance';
export const TX_TDI_SOURCE_URL =
  'https://data.texas.gov/dataset/Insurance-agencies-and-businesses-approved-to-mana/3yqc-fcdt';
export const TX_TDI_SODA_URL = 'https://data.texas.gov/resource/3yqc-fcdt.csv';
export const TX_TDI_LOOKUP_URL = 'https://www.tdi.texas.gov/agent/index.html';
export const TX_TDI_AGENT_LISTS_URL = 'https://tdi.texas.gov/agent/agentlists.html';

export const TX_LAUNCH_MARKETS: TxLaunchMarket[] = [
  {
    id: 'houston',
    displayName: 'Houston / Harris',
    primaryCounty: 'Harris',
    countyAliases: ['HARRIS', 'HARRIS COUNTY', 'FORT BEND', 'MONTGOMERY', 'BRAZORIA'],
    cities: [
      'HOUSTON',
      'PASADENA',
      'BAYTOWN',
      'SUGAR LAND',
      'THE WOODLANDS',
      'KATY',
      'PEARLAND',
      'LEAGUE CITY',
      'CONROE',
      'SPRING',
      'CYPRESS',
      'HUMBLE',
      'MISSOURI CITY',
      'FRIENDSWOOD',
      'STAFFORD',
      'BELLAIRE',
      'CHANNELVIEW',
      'TOMBALL',
      'RICHMOND',
      'ROSENBERG',
    ],
    zipPrefixes: ['770', '772', '773', '774', '775'],
    hubSlugs: ['houston'],
    /**
     * Phase 8B — raised from 2,500 so hubs are dense but not statewide dumps.
     * Residual staged agencies stay in tdi_producers; re-promote with skip-existing.
     */
    promoteCap: 3500,
  },
  {
    id: 'dallas',
    displayName: 'Dallas / Dallas County',
    primaryCounty: 'Dallas',
    countyAliases: ['DALLAS', 'DALLAS COUNTY', 'COLLIN', 'DENTON', 'ROCKWALL'],
    cities: [
      'DALLAS',
      'RICHARDSON',
      'GARLAND',
      'IRVING',
      'MESQUITE',
      'CARROLLTON',
      'ADDISON',
      'PLANO',
      'ROWLETT',
      'DESOTO',
      'LANCASTER',
      'CEDAR HILL',
      'GRAND PRAIRIE',
      'UNIVERSITY PARK',
      'HIGHLAND PARK',
      'FARMERS BRANCH',
      'BALCH SPRINGS',
      'COPPELL',
    ],
    zipPrefixes: ['750', '751', '752', '753'],
    hubSlugs: ['dallas-fort-worth'],
    /** Phase 8B — raised from 2,500; DFW hub also includes fort_worth market. */
    promoteCap: 3500,
  },
  {
    id: 'fort_worth',
    displayName: 'Fort Worth / Tarrant',
    primaryCounty: 'Tarrant',
    countyAliases: ['TARRANT', 'TARRANT COUNTY'],
    cities: [
      'FORT WORTH',
      'FT WORTH',
      'FT. WORTH',
      'ARLINGTON',
      'NORTH RICHLAND HILLS',
      'MANSFIELD',
      'EULESS',
      'BEDFORD',
      'HURST',
      'GRAPEVINE',
      'SOUTHLAKE',
      'KELLER',
      'HALTOM CITY',
      'WATAUGA',
      'SAGINAW',
      'CROWLEY',
      'BENBROOK',
    ],
    // 760–761 are Tarrant-heavy; 762 overlaps Denton — still DFW-adjacent
    zipPrefixes: ['760', '761'],
    hubSlugs: ['dallas-fort-worth'],
    promoteCap: 2000,
  },
  {
    id: 'austin',
    displayName: 'Austin / Travis',
    primaryCounty: 'Travis',
    countyAliases: ['TRAVIS', 'TRAVIS COUNTY', 'WILLIAMSON', 'HAYS', 'BASTROP'],
    cities: [
      'AUSTIN',
      'ROUND ROCK',
      'CEDAR PARK',
      'PFLUGERVILLE',
      'GEORGETOWN',
      'SAN MARCOS',
      'KYLE',
      'LEANDER',
      'LAKEWAY',
      'BEE CAVE',
      'WEST LAKE HILLS',
      'MANOR',
      'HUTTO',
    ],
    zipPrefixes: ['733', '786', '787'],
    hubSlugs: ['austin'],
    promoteCap: 2000,
  },
  {
    id: 'san_antonio',
    displayName: 'San Antonio / Bexar',
    primaryCounty: 'Bexar',
    countyAliases: ['BEXAR', 'BEXAR COUNTY', 'COMAL', 'GUADALUPE'],
    cities: [
      'SAN ANTONIO',
      'NEW BRAUNFELS',
      'SCHERTZ',
      'CONVERSE',
      'UNIVERSAL CITY',
      'LIVE OAK',
      'SELMA',
      'HELOTES',
      'LEON VALLEY',
      'ALAMO HEIGHTS',
      'TERRELL HILLS',
    ],
    zipPrefixes: ['780', '781', '782'],
    hubSlugs: ['san-antonio'],
    promoteCap: 2000,
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

/** Resolve Wave-1 launch market from county / city / ZIP. */
export function matchTxLaunchMarket(input: {
  county?: string | null;
  city?: string | null;
  zip?: string | null;
}): TxLaunchMarket | null {
  const county = normalizeCountyName(input.county);
  const city = normalizeCityName(input.city);
  const z3 = zipPrefix3(input.zip);

  // Prefer city (most reliable for non-title agencies)
  if (city) {
    for (const m of TX_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  if (county) {
    for (const m of TX_LAUNCH_MARKETS) {
      if (
        m.countyAliases.some(
          (a) => normalizeCountyName(a) === county || a === county
        )
      ) {
        return m;
      }
    }
  }

  if (z3) {
    for (const m of TX_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }

  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): TxLaunchMarket[] {
  return TX_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isTxLaunchHub(hubSlug: string): boolean {
  return TX_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): TxLaunchMarket | undefined {
  return TX_LAUNCH_MARKETS.find((m) => m.id === id);
}
