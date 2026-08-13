/**
 * Phase 15 — Vermont DFR Wave 1 launch markets (agencies / firms only).
 * Matching: city list first, then ZIP 3-digit prefix (05x).
 * Out-of-state HQ is never hub-placed.
 */

export type VtLaunchMarketId = 'burlington' | 'montpelier' | 'rutland';

export type VtLaunchMarket = {
  id: VtLaunchMarketId;
  displayName: string;
  primaryCounty: string;
  cities: string[];
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
};

export const VT_DFR_REGULATOR = 'Vermont Department of Financial Regulation';
export const VT_DFR_HOME_URL =
  'https://dfr.vermont.gov/insurance/producer-and-individual-licensing';
export const VT_DFR_SPREADSHEET_URL = 'https://dfr.vermont.gov/document-type/spreadsheet';
export const VT_DFR_LOOKUP_URL =
  'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=VT';

export const VT_LAUNCH_MARKETS: VtLaunchMarket[] = [
  {
    id: 'burlington',
    displayName: 'Burlington / Chittenden',
    primaryCounty: 'Chittenden',
    cities: [
      'BURLINGTON',
      'SOUTH BURLINGTON',
      'SO BURLINGTON',
      'SO. BURLINGTON',
      'COLCHESTER',
      'WILLISTON',
      'ESSEX JUNCTION',
      'ESSEX JCT',
      'ESSEX JCT.',
      'SHELBURNE',
      'WINOOSKI',
      'MILTON',
      'UNDERHILL',
      'JERICHO',
      'RICHMOND',
      'GEORGIA',
    ],
    zipPrefixes: ['054'],
    hubSlugs: ['burlington'],
    promoteCap: 200,
  },
  {
    id: 'montpelier',
    displayName: 'Montpelier / central Vermont',
    primaryCounty: 'Washington',
    cities: [
      'MONTPELIER',
      'BARRE',
      'NORTHFIELD',
      'WATERBURY',
      'BERLIN',
      'EAST MONTPELIER',
      'MIDDLESEX',
      'PLAINFIELD',
    ],
    zipPrefixes: ['056'],
    hubSlugs: ['montpelier'],
    promoteCap: 100,
  },
  {
    id: 'rutland',
    displayName: 'Rutland / southern Vermont',
    primaryCounty: 'Rutland',
    cities: [
      'RUTLAND',
      'FAIR HAVEN',
      'KILLINGTON',
      'CASTLETON',
      'PITTSFORD',
      'WEST RUTLAND',
      'BRANDON',
    ],
    zipPrefixes: ['057'],
    hubSlugs: ['rutland'],
    promoteCap: 100,
  },
];

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

export function matchVtLaunchMarket(input: {
  city?: string | null;
  zip?: string | null;
  hqState?: string | null;
}): VtLaunchMarket | null {
  const hq = (input.hqState || '').toUpperCase().slice(0, 2);
  if (hq && hq !== 'VT') return null;

  const city = normalizeCityName(input.city);
  if (city) {
    for (const m of VT_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  const z3 = zipPrefix3(input.zip);
  if (z3) {
    for (const m of VT_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }

  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): VtLaunchMarket[] {
  return VT_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isVtLaunchHub(hubSlug: string): boolean {
  return VT_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): VtLaunchMarket | undefined {
  return VT_LAUNCH_MARKETS.find((m) => m.id === id);
}
