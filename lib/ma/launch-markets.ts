/**
 * Phase 23 — Massachusetts DOI Wave 1 launch markets (agencies only).
 * City first, then ZIP prefix. Out-of-state HQ is never hub-placed.
 * County is used when present; otherwise city/ZIP only (documented).
 */

export type MaLaunchMarketId = 'boston' | 'worcester' | 'springfield';

export type MaLaunchMarket = {
  id: MaLaunchMarketId;
  displayName: string;
  primaryCounty: string;
  cities: string[];
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
};

export const MA_DOI_REGULATOR = 'Massachusetts Division of Insurance';
export const MA_DOI_HOME_URL =
  'https://www.mass.gov/orgs/division-of-insurance';
export const MA_DOI_LISTS_URL =
  'https://www.mass.gov/lists/massachusetts-licensed-individuals-and-business-entities';
export const MA_DOI_LOOKUP_URL =
  'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=MA';

export const MA_LAUNCH_MARKETS: MaLaunchMarket[] = [
  {
    id: 'boston',
    displayName: 'Greater Boston / Suffolk',
    primaryCounty: 'Suffolk',
    cities: [
      'BOSTON',
      'CHARLESTOWN',
      'ROXBURY',
      'DORCHESTER',
      'JAMAICA PLAIN',
      'SOUTH BOSTON',
      'ALLSTON',
      'BRIGHTON',
      'HYDE PARK',
      'MATTAPAN',
      'ROSINDALE',
      'ROSENDALE',
      'WEST ROXBURY',
      'EAST BOSTON',
      'CHELSEA',
      'REVERE',
      'WINTHROP',
      'BROOKLINE',
      'CAMBRIDGE',
      'SOMERVILLE',
      'QUINCY',
      'NEWTON',
    ],
    zipPrefixes: ['021', '022'],
    hubSlugs: ['boston'],
    promoteCap: 400,
  },
  {
    id: 'worcester',
    displayName: 'Worcester',
    primaryCounty: 'Worcester',
    cities: ['WORCESTER', 'SHREWSBURY', 'AUBURN', 'HOLDEN', 'LEICESTER', 'MILLBURY'],
    zipPrefixes: ['016'],
    hubSlugs: ['worcester'],
    promoteCap: 200,
  },
  {
    id: 'springfield',
    displayName: 'Springfield / Hampden',
    primaryCounty: 'Hampden',
    cities: [
      'SPRINGFIELD',
      'WEST SPRINGFIELD',
      'CHICOPEE',
      'HOLYOKE',
      'AGAWAM',
      'LONGMEADOW',
      'WESTFIELD',
      'LUDLOW',
    ],
    zipPrefixes: ['011', '010'],
    hubSlugs: ['springfield'],
    promoteCap: 200,
  },
];

/** Documented city → county for Wave-1 labels only. Unknown cities stay null. */
export const MA_CITY_COUNTY: Record<string, string> = {
  BOSTON: 'Suffolk',
  CHARLESTOWN: 'Suffolk',
  ROXBURY: 'Suffolk',
  DORCHESTER: 'Suffolk',
  'JAMAICA PLAIN': 'Suffolk',
  'SOUTH BOSTON': 'Suffolk',
  ALLSTON: 'Suffolk',
  BRIGHTON: 'Suffolk',
  'HYDE PARK': 'Suffolk',
  MATTAPAN: 'Suffolk',
  ROSLINDALE: 'Suffolk',
  'WEST ROXBURY': 'Suffolk',
  'EAST BOSTON': 'Suffolk',
  CHELSEA: 'Suffolk',
  REVERE: 'Suffolk',
  WINTHROP: 'Suffolk',
  BROOKLINE: 'Norfolk',
  CAMBRIDGE: 'Middlesex',
  SOMERVILLE: 'Middlesex',
  QUINCY: 'Norfolk',
  NEWTON: 'Middlesex',
  WORCESTER: 'Worcester',
  SHREWSBURY: 'Worcester',
  AUBURN: 'Worcester',
  HOLDEN: 'Worcester',
  LEICESTER: 'Worcester',
  MILLBURY: 'Worcester',
  SPRINGFIELD: 'Hampden',
  'WEST SPRINGFIELD': 'Hampden',
  CHICOPEE: 'Hampden',
  HOLYOKE: 'Hampden',
  AGAWAM: 'Hampden',
  LONGMEADOW: 'Hampden',
  WESTFIELD: 'Hampden',
  LUDLOW: 'Hampden',
};

export function normalizeCityName(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

export function zipPrefix3(zip: string | null | undefined): string {
  if (!zip) return '';
  return zip.replace(/\D/g, '').slice(0, 3);
}

export function inferMaCounty(city: string | null | undefined): string | null {
  const c = normalizeCityName(city);
  return MA_CITY_COUNTY[c] ?? null;
}

export function matchMaLaunchMarket(input: {
  city?: string | null;
  zip?: string | null;
  hqState?: string | null;
}): MaLaunchMarket | null {
  const hq = (input.hqState || '').toUpperCase().slice(0, 2);
  if (hq && hq !== 'MA') return null;

  const city = normalizeCityName(input.city);
  if (city) {
    for (const m of MA_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  const z3 = zipPrefix3(input.zip);
  if (z3) {
    for (const m of MA_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }
  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): MaLaunchMarket[] {
  return MA_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isMaLaunchHub(hubSlug: string): boolean {
  return MA_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): MaLaunchMarket | undefined {
  return MA_LAUNCH_MARKETS.find((m) => m.id === id);
}
