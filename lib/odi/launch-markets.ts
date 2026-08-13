/**
 * Phase 10 — Ohio ODI Wave 1 launch markets (agencies / business entities only).
 * Matching: city list → county aliases → ZIP 3-digit prefix.
 */

export type OhLaunchMarketId =
  | 'columbus'
  | 'cleveland'
  | 'cincinnati'
  | 'toledo'
  | 'akron'
  | 'dayton';

export type OhLaunchMarket = {
  id: OhLaunchMarketId;
  displayName: string;
  primaryCounty: string;
  countyAliases: string[];
  cities: string[];
  zipPrefixes: string[];
  hubSlugs: string[];
  promoteCap: number;
};

export const OH_ODI_REGULATOR = 'Ohio Department of Insurance';
export const OH_ODI_SOURCE_URL = 'https://data.ohio.gov/wps/portal/gov/data/view/active-licenses';
export const OH_ODI_LOOKUP_URL =
  'https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/AgentSearch.mvc/DisplaySearch';
export const OH_ODI_MAILING_LIST_URL =
  'https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc';
export const OH_ODI_HOME_URL = 'https://insurance.ohio.gov/';
export const OH_ODI_AGENTS_URL = 'https://insurance.ohio.gov/agents-and-agencies';

export const OH_LAUNCH_MARKETS: OhLaunchMarket[] = [
  {
    id: 'columbus',
    displayName: 'Columbus / Franklin',
    primaryCounty: 'Franklin',
    countyAliases: [
      'FRANKLIN',
      'FRANKLIN COUNTY',
      'DELAWARE',
      'FAIRFIELD',
      'LICKING',
      'UNION',
    ],
    cities: [
      'COLUMBUS',
      'DUBLIN',
      'WESTERVILLE',
      'UPPER ARLINGTON',
      'GROVE CITY',
      'HILLIARD',
      'GAHANNA',
      'REYNOLDSBURG',
      'WORTHINGTON',
      'NEW ALBANY',
      'PICKERINGTON',
      'POWELL',
      'DELAWARE',
      'CANAL WINCHESTER',
      'WHITEHALL',
      'BEXLEY',
      'GRANDVIEW HEIGHTS',
    ],
    zipPrefixes: ['430', '431', '432'],
    hubSlugs: ['columbus'],
    promoteCap: 2000,
  },
  {
    id: 'cleveland',
    displayName: 'Cleveland / Cuyahoga',
    primaryCounty: 'Cuyahoga',
    countyAliases: [
      'CUYAHOGA',
      'CUYAHOGA COUNTY',
      'LAKE',
      'LORAIN',
      'GEAUGA',
      'MEDINA',
    ],
    cities: [
      'CLEVELAND',
      'LAKEWOOD',
      'PARMA',
      'EUCLID',
      'CLEVELAND HEIGHTS',
      'SHAKER HEIGHTS',
      'STRONGSVILLE',
      'WESTLAKE',
      'NORTH OLMSTED',
      'BEACHWOOD',
      'SOLON',
      'INDEPENDENCE',
      'BROOKLYN',
      'GARFIELD HEIGHTS',
      'MAPLE HEIGHTS',
      'MAYFIELD HEIGHTS',
      'ROCKY RIVER',
      'FAIRVIEW PARK',
      'LYNDHURST',
    ],
    zipPrefixes: ['440', '441'],
    hubSlugs: ['cleveland'],
    promoteCap: 2000,
  },
  {
    id: 'cincinnati',
    displayName: 'Cincinnati / Hamilton',
    primaryCounty: 'Hamilton',
    countyAliases: [
      'HAMILTON',
      'HAMILTON COUNTY',
      'BUTLER',
      'CLERMONT',
      'WARREN',
    ],
    cities: [
      'CINCINNATI',
      'MASON',
      'WEST CHESTER',
      'FAIRFIELD',
      'HAMILTON',
      'LOVELAND',
      'MILFORD',
      'NORWOOD',
      'BLUE ASH',
      'MONTGOMERY',
      'MADEIRA',
      'SHARONVILLE',
      'FOREST PARK',
      'SPRINGDALE',
      'DEER PARK',
      'WYOMING',
      'INDIAN HILL',
    ],
    zipPrefixes: ['450', '451', '452'],
    hubSlugs: ['cincinnati'],
    promoteCap: 2000,
  },
  {
    id: 'toledo',
    displayName: 'Toledo / Lucas',
    primaryCounty: 'Lucas',
    countyAliases: ['LUCAS', 'LUCAS COUNTY', 'WOOD', 'OTTAWA', 'FULTON'],
    cities: [
      'TOLEDO',
      'MAUMEE',
      'SYLVANIA',
      'OREGON',
      'PERRYSBURG',
      'HOLLAND',
      'ROSSFORD',
      'WHITEHOUSE',
      'WATERVILLE',
    ],
    zipPrefixes: ['434', '435', '436'],
    hubSlugs: ['toledo'],
    promoteCap: 1500,
  },
  {
    id: 'akron',
    displayName: 'Akron / Summit',
    primaryCounty: 'Summit',
    countyAliases: ['SUMMIT', 'SUMMIT COUNTY', 'PORTAGE', 'MEDINA'],
    cities: [
      'AKRON',
      'CUYAHOGA FALLS',
      'STOW',
      'KENT',
      'BARBERTON',
      'HUDSON',
      'TALLMADGE',
      'FAIRLAWN',
      'GREEN',
      'NORTON',
      'MACEDONIA',
      'TWINSBURG',
    ],
    zipPrefixes: ['442', '443'],
    hubSlugs: ['akron'],
    promoteCap: 1500,
  },
  {
    id: 'dayton',
    displayName: 'Dayton / Montgomery',
    primaryCounty: 'Montgomery',
    countyAliases: [
      'MONTGOMERY',
      'MONTGOMERY COUNTY',
      'GREENE',
      'MIAMI',
      'CLARK',
    ],
    cities: [
      'DAYTON',
      'KETTERING',
      'BEAVERCREEK',
      'CENTERVILLE',
      'FAIRBORN',
      'HUBER HEIGHTS',
      'MIAMISBURG',
      'TROTWOOD',
      'VANDALIA',
      'OAKWOOD',
      'ENGLEWOOD',
      'RIVERSIDE',
      'SPRINGBORO',
      'XENIA',
    ],
    zipPrefixes: ['453', '454', '455'],
    hubSlugs: ['dayton'],
    promoteCap: 1500,
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

export function matchOhLaunchMarket(input: {
  county?: string | null;
  city?: string | null;
  zip?: string | null;
}): OhLaunchMarket | null {
  const county = normalizeCountyName(input.county);
  const city = normalizeCityName(input.city);
  const z3 = zipPrefix3(input.zip);

  if (city) {
    for (const m of OH_LAUNCH_MARKETS) {
      if (m.cities.includes(city)) return m;
    }
  }

  if (county) {
    for (const m of OH_LAUNCH_MARKETS) {
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
    for (const m of OH_LAUNCH_MARKETS) {
      if (m.zipPrefixes.includes(z3)) return m;
    }
  }

  return null;
}

export function launchMarketsForHubSlug(hubSlug: string): OhLaunchMarket[] {
  return OH_LAUNCH_MARKETS.filter((m) => m.hubSlugs.includes(hubSlug));
}

export function isOhLaunchHub(hubSlug: string): boolean {
  return OH_LAUNCH_MARKETS.some((m) => m.hubSlugs.includes(hubSlug));
}

export function marketById(id: string): OhLaunchMarket | undefined {
  return OH_LAUNCH_MARKETS.find((m) => m.id === id);
}

export function inventoryScopeNoteForOhioHub(hubSlug: string): string | null {
  const markets = launchMarketsForHubSlug(hubSlug);
  if (!markets.length) return null;
  const label = markets.map((m) => m.displayName).join(', ');
  return `Verified ODI inventory for this launch is scoped to ${label}. Other Ohio counties remain metro context until promoted.`;
}
