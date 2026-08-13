/**
 * Phase 24 — Mississippi MID Wave 1 launch markets (Insurance Producer Entity).
 * City first. ZIP prefix only where it does not bleed into another market.
 * Out-of-state HQ is never hub-placed.
 */

export type MsLaunchMarketId =
  | 'jackson'
  | 'gulfport-biloxi'
  | 'hattiesburg'
  | 'southaven'
  | 'tupelo'
  | 'meridian';

export type MsLaunchMarket = {
  id: MsLaunchMarketId;
  displayName: string;
  primaryCounty: string;
  cities: string[];
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
};

export const MS_MID_REGULATOR = 'Mississippi Insurance Department';
export const MS_MID_HOME_URL = 'https://www.mid.ms.gov/';
export const MS_MID_SEARCH_URL =
  'https://www.mid.ms.gov/mississippi-insurance-department/licensing-search/individual-and-entity-licensing-search/';
export const MS_MID_LOOKUP_URL =
  'https://www.mid.ms.gov/mississippi-insurance-department/licensing-search/individual-and-entity-licensing-search/';

export const MS_LAUNCH_MARKETS: MsLaunchMarket[] = [
  {
    id: 'jackson',
    displayName: 'Jackson metro',
    primaryCounty: 'Hinds',
    cities: [
      'JACKSON',
      'RIDGELAND',
      'MADISON',
      'BRANDON',
      'FLOWOOD',
      'CLINTON',
      'PEARL',
      'BYRAM',
      'RICHLAND',
      'FLORENCE',
      'RAYMOND',
      'TERRY',
      'FLORA',
      'CANTON',
    ],
    zipPrefixes: ['392'],
    hubSlugs: ['jackson'],
    promoteCap: 400,
  },
  {
    id: 'gulfport-biloxi',
    displayName: 'Gulf Coast / Gulfport–Biloxi',
    primaryCounty: 'Harrison',
    cities: [
      'GULFPORT',
      'BILOXI',
      'OCEAN SPRINGS',
      'PASCAGOULA',
      'DIBERVILLE',
      "D'IBERVILLE",
      'LONG BEACH',
      'PASS CHRISTIAN',
      'BAY ST LOUIS',
      'BAY SAINT LOUIS',
      'WAVELAND',
      'GAUTIER',
      'MOSS POINT',
    ],
    zipPrefixes: ['395'],
    hubSlugs: ['gulfport-biloxi'],
    promoteCap: 200,
  },
  {
    id: 'hattiesburg',
    displayName: 'Hattiesburg',
    primaryCounty: 'Forrest',
    cities: ['HATTIESBURG', 'PETAL', 'SUMRALL'],
    zipPrefixes: [],
    hubSlugs: ['hattiesburg'],
    promoteCap: 150,
  },
  {
    id: 'southaven',
    displayName: 'Southaven / DeSoto',
    primaryCounty: 'DeSoto',
    cities: ['SOUTHAVEN', 'OLIVE BRANCH', 'HORN LAKE', 'HERNANDO', 'WALLS', 'NESBIT'],
    zipPrefixes: [],
    hubSlugs: ['southaven'],
    promoteCap: 100,
  },
  {
    id: 'tupelo',
    displayName: 'Tupelo',
    primaryCounty: 'Lee',
    cities: ['TUPELO', 'SALTILLO', 'VERONA', 'SHANNON', 'BELDEN', 'PLANTERSVILLE'],
    zipPrefixes: [],
    hubSlugs: ['tupelo'],
    promoteCap: 100,
  },
  {
    id: 'meridian',
    displayName: 'Meridian',
    primaryCounty: 'Lauderdale',
    cities: ['MERIDIAN', 'MARION', 'TOOMSUBA'],
    zipPrefixes: [],
    hubSlugs: ['meridian'],
    promoteCap: 100,
  },
];

/** Documented city → county for Wave-1 labels only. Unknown cities stay null. */
export const MS_CITY_COUNTY: Record<string, string> = {
  JACKSON: 'Hinds',
  BYRAM: 'Hinds',
  RAYMOND: 'Hinds',
  TERRY: 'Hinds',
  CLINTON: 'Hinds',
  RIDGELAND: 'Madison',
  MADISON: 'Madison',
  CANTON: 'Madison',
  FLORA: 'Madison',
  BRANDON: 'Rankin',
  FLOWOOD: 'Rankin',
  PEARL: 'Rankin',
  RICHLAND: 'Rankin',
  FLORENCE: 'Rankin',
  GULFPORT: 'Harrison',
  BILOXI: 'Harrison',
  'LONG BEACH': 'Harrison',
  'PASS CHRISTIAN': 'Harrison',
  DIBERVILLE: 'Harrison',
  "D'IBERVILLE": 'Harrison',
  'OCEAN SPRINGS': 'Jackson',
  PASCAGOULA: 'Jackson',
  GAUTIER: 'Jackson',
  'MOSS POINT': 'Jackson',
  'BAY ST LOUIS': 'Hancock',
  'BAY SAINT LOUIS': 'Hancock',
  WAVELAND: 'Hancock',
  HATTIESBURG: 'Forrest',
  PETAL: 'Forrest',
  SUMRALL: 'Lamar',
  SOUTHAVEN: 'DeSoto',
  'OLIVE BRANCH': 'DeSoto',
  'HORN LAKE': 'DeSoto',
  HERNANDO: 'DeSoto',
  WALLS: 'DeSoto',
  NESBIT: 'DeSoto',
  TUPELO: 'Lee',
  SALTILLO: 'Lee',
  VERONA: 'Lee',
  SHANNON: 'Lee',
  BELDEN: 'Lee',
  PLANTERSVILLE: 'Lee',
  MERIDIAN: 'Lauderdale',
  MARION: 'Lauderdale',
  TOOMSUBA: 'Lauderdale',
};

export function normalizeCityName(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

export function zipPrefix3(zip: string | null | undefined): string {
  if (!zip) return '';
  return zip.replace(/\D/g, '').slice(0, 3);
}

export function inferMsCounty(city: string | null | undefined): string | null {
  const c = normalizeCityName(city);
  return MS_CITY_COUNTY[c] ?? null;
}

export function matchMsLaunchMarket(input: {
  city?: string | null;
  zip?: string | null;
  hqState?: string | null;
}): MsLaunchMarket | null {
  const hq = (input.hqState || '').toUpperCase().slice(0, 2);
  if (hq && hq !== 'MS') return null;

  const city = normalizeCityName(input.city);
  if (city) {
    for (const m of MS_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  const z3 = zipPrefix3(input.zip);
  if (z3) {
    for (const m of MS_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }
  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): MsLaunchMarket[] {
  return MS_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isMsLaunchHub(hubSlug: string): boolean {
  return MS_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): MsLaunchMarket | undefined {
  return MS_LAUNCH_MARKETS.find((m) => m.id === id);
}
