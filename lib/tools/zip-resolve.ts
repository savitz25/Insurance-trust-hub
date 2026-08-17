/**
 * Lightweight ZIP → state / county resolver for educational planning tools.
 * Prefer curated county hits; fall back to USPS ZIP-prefix state ranges.
 * No network calls; no storage of user input.
 */

export type ZipLocation = {
  zip: string;
  stateCode: string;
  stateName: string;
  countyName: string | null;
  displayLabel: string;
  resolution: 'county' | 'state';
  /** When true, link into FL tri-county Medicare dashboards */
  hasCountyDashboard: boolean;
  countyDashboardSlug?: string;
};

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

/** Curated ZIP → county (high-traffic + South Florida dashboard ZIPs). */
const ZIP_COUNTY: Record<
  string,
  { county: string; state: string; dashboardSlug?: string }
> = {
  // South Florida (live county dashboards)
  '33101': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33125': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33139': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33176': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33186': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33010': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33012': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33015': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33018': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33030': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33033': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33054': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33109': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33127': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33134': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33141': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33145': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33155': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33157': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33165': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33172': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33178': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33180': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33196': { county: 'Miami-Dade', state: 'FL', dashboardSlug: 'miami-dade-fl' },
  '33301': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33023': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33024': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33026': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33064': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33065': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33068': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33071': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33304': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33308': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33311': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33312': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33313': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33317': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33319': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33321': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33322': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33324': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33326': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33328': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33351': { county: 'Broward', state: 'FL', dashboardSlug: 'broward-fl' },
  '33401': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33404': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33407': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33410': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33411': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33414': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33415': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33417': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33418': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33426': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33428': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33431': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33433': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33435': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33436': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33437': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33444': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33445': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33458': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33460': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33461': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33462': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33463': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33467': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33470': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33483': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33484': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33486': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33487': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33432': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33434': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33408': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33409': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33412': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33413': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33446': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33472': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33473': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33480': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33496': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  '33498': { county: 'Palm Beach', state: 'FL', dashboardSlug: 'palm-beach-fl' },
  // Other FL metros
  '32801': { county: 'Orange', state: 'FL' },
  '33602': { county: 'Hillsborough', state: 'FL' },
  '32202': { county: 'Duval', state: 'FL' },
  '32301': { county: 'Leon', state: 'FL' },
  // Major metros (state + county label)
  '10001': { county: 'New York', state: 'NY' },
  '10019': { county: 'New York', state: 'NY' },
  '11201': { county: 'Kings', state: 'NY' },
  '90001': { county: 'Los Angeles', state: 'CA' },
  '90012': { county: 'Los Angeles', state: 'CA' },
  '94102': { county: 'San Francisco', state: 'CA' },
  '60601': { county: 'Cook', state: 'IL' },
  '60614': { county: 'Cook', state: 'IL' },
  '75201': { county: 'Dallas', state: 'TX' },
  '77002': { county: 'Harris', state: 'TX' },
  '78701': { county: 'Travis', state: 'TX' },
  '30303': { county: 'Fulton', state: 'GA' },
  '85001': { county: 'Maricopa', state: 'AZ' },
  '98101': { county: 'King', state: 'WA' },
  '80202': { county: 'Denver', state: 'CO' },
  '19102': { county: 'Philadelphia', state: 'PA' },
  '02108': { county: 'Suffolk', state: 'MA' },
  '28202': { county: 'Mecklenburg', state: 'NC' },
  '27601': { county: 'Wake', state: 'NC' },
  '20001': { county: 'District of Columbia', state: 'DC' },
  '89101': { county: 'Clark', state: 'NV' },
  '97201': { county: 'Multnomah', state: 'OR' },
  '55401': { county: 'Hennepin', state: 'MN' },
  '48201': { county: 'Wayne', state: 'MI' },
  '63101': { county: 'St. Louis City', state: 'MO' },
  '21201': { county: 'Baltimore City', state: 'MD' },
  '22201': { county: 'Arlington', state: 'VA' },
  '15222': { county: 'Allegheny', state: 'PA' },
  '43215': { county: 'Franklin', state: 'OH' },
  '46204': { county: 'Marion', state: 'IN' },
  '37203': { county: 'Davidson', state: 'TN' },
  '70112': { county: 'Orleans', state: 'LA' },
  '84101': { county: 'Salt Lake', state: 'UT' },
  '95814': { county: 'Sacramento', state: 'CA' },
  '92602': { county: 'Orange', state: 'CA' },
  '92101': { county: 'San Diego', state: 'CA' },
};

/**
 * Approximate USPS ZIP prefix (first 3 digits) → state.
 * Covers contiguous ranges used for educational location resolution only.
 */
const PREFIX_STATE: Array<{ lo: number; hi: number; state: string }> = [
  { lo: 5, hi: 5, state: 'NY' },
  { lo: 10, hi: 14, state: 'NY' },
  { lo: 15, hi: 19, state: 'PA' },
  { lo: 20, hi: 20, state: 'DC' },
  { lo: 21, hi: 21, state: 'MD' },
  { lo: 22, hi: 24, state: 'VA' },
  { lo: 25, hi: 26, state: 'WV' },
  { lo: 27, hi: 28, state: 'NC' },
  { lo: 29, hi: 29, state: 'SC' },
  { lo: 30, hi: 31, state: 'GA' },
  { lo: 32, hi: 34, state: 'FL' },
  { lo: 35, hi: 36, state: 'AL' },
  { lo: 37, hi: 38, state: 'TN' },
  { lo: 39, hi: 39, state: 'MS' },
  { lo: 40, hi: 42, state: 'KY' },
  { lo: 43, hi: 45, state: 'OH' },
  { lo: 46, hi: 47, state: 'IN' },
  { lo: 48, hi: 49, state: 'MI' },
  { lo: 50, hi: 52, state: 'IA' },
  { lo: 53, hi: 54, state: 'WI' },
  { lo: 55, hi: 56, state: 'MN' },
  { lo: 57, hi: 57, state: 'SD' },
  { lo: 58, hi: 58, state: 'ND' },
  { lo: 59, hi: 59, state: 'MT' },
  { lo: 60, hi: 62, state: 'IL' },
  { lo: 63, hi: 65, state: 'MO' },
  { lo: 66, hi: 67, state: 'KS' },
  { lo: 68, hi: 69, state: 'NE' },
  { lo: 70, hi: 71, state: 'LA' },
  { lo: 72, hi: 72, state: 'AR' },
  { lo: 73, hi: 74, state: 'OK' },
  { lo: 75, hi: 79, state: 'TX' },
  { lo: 80, hi: 81, state: 'CO' },
  { lo: 82, hi: 82, state: 'WY' },
  { lo: 83, hi: 83, state: 'ID' },
  { lo: 84, hi: 84, state: 'UT' },
  { lo: 85, hi: 86, state: 'AZ' },
  { lo: 87, hi: 88, state: 'NM' },
  { lo: 89, hi: 89, state: 'NV' },
  { lo: 90, hi: 96, state: 'CA' },
  { lo: 97, hi: 97, state: 'OR' },
  { lo: 98, hi: 99, state: 'WA' },
  { lo: 6, hi: 9, state: 'PR' },
];

function stateFromPrefix(zip: string): string | null {
  const n = parseInt(zip.slice(0, 3), 10);
  if (Number.isNaN(n)) return null;
  // New England & mid-Atlantic fine ranges
  if (n >= 10 && n <= 27) {
    /* handled below */
  }
  if (n >= 100 && n <= 149) return 'NY';
  if (n >= 150 && n <= 196) return 'PA';
  if (n >= 197 && n <= 199) return 'DE';
  if (n >= 200 && n <= 205) return 'DC';
  if (n >= 206 && n <= 219) return 'MD';
  if (n >= 220 && n <= 246) return 'VA';
  if (n >= 247 && n <= 268) return 'WV';
  if (n >= 270 && n <= 289) return 'NC';
  if (n >= 290 && n <= 299) return 'SC';
  if (n >= 300 && n <= 319) return 'GA';
  if (n >= 320 && n <= 349) return 'FL';
  if (n >= 350 && n <= 369) return 'AL';
  if (n >= 370 && n <= 385) return 'TN';
  if (n >= 386 && n <= 397) return 'MS';
  if (n >= 400 && n <= 427) return 'KY';
  if (n >= 430 && n <= 459) return 'OH';
  if (n >= 460 && n <= 479) return 'IN';
  if (n >= 480 && n <= 499) return 'MI';
  if (n >= 500 && n <= 528) return 'IA';
  if (n >= 530 && n <= 549) return 'WI';
  if (n >= 550 && n <= 567) return 'MN';
  if (n >= 570 && n <= 577) return 'SD';
  if (n >= 580 && n <= 588) return 'ND';
  if (n >= 590 && n <= 599) return 'MT';
  if (n >= 600 && n <= 629) return 'IL';
  if (n >= 630 && n <= 658) return 'MO';
  if (n >= 660 && n <= 679) return 'KS';
  if (n >= 680 && n <= 693) return 'NE';
  if (n >= 700 && n <= 714) return 'LA';
  if (n >= 716 && n <= 729) return 'AR';
  if (n >= 730 && n <= 749) return 'OK';
  if (n >= 750 && n <= 799) return 'TX';
  if (n >= 800 && n <= 816) return 'CO';
  if (n >= 820 && n <= 831) return 'WY';
  if (n >= 832 && n <= 838) return 'ID';
  if (n >= 840 && n <= 847) return 'UT';
  if (n >= 850 && n <= 865) return 'AZ';
  if (n >= 870 && n <= 884) return 'NM';
  if (n >= 889 && n <= 898) return 'NV';
  if (n >= 900 && n <= 961) return 'CA';
  if (n >= 967 && n <= 968) return 'HI';
  if (n >= 970 && n <= 979) return 'OR';
  if (n >= 980 && n <= 994) return 'WA';
  if (n >= 995 && n <= 999) return 'AK';
  // 0xxxx New England
  if (n >= 10 && n <= 27) return 'MA';
  if (n >= 28 && n <= 29) return 'RI';
  if (n >= 30 && n <= 38) return 'NH';
  if (n >= 39 && n <= 49) return 'ME';
  if (n >= 50 && n <= 59) return 'VT';
  if (n >= 60 && n <= 69) return 'CT';
  if (n >= 70 && n <= 89) return 'NJ';
  // 00xxx / 006-009 PR — skip
  for (const r of PREFIX_STATE) {
    if (n >= r.lo && n <= r.hi) return r.state === 'PR' ? null : r.state;
  }
  return null;
}

export function normalizeZip(input: string): string {
  return input.replace(/\D/g, '').slice(0, 5);
}

export function looksLikeZip(input: string | null | undefined): boolean {
  return normalizeZip(input || '').length === 5 && /^\d{5}$/.test(normalizeZip(input || ''));
}

export function resolveZip(input: string): ZipLocation | null {
  const zip = normalizeZip(input);
  if (zip.length !== 5) return null;

  const curated = ZIP_COUNTY[zip];
  if (curated) {
    const stateName = STATE_NAMES[curated.state] ?? curated.state;
    const countyLabel =
      curated.county === 'District of Columbia'
        ? 'Washington, DC'
        : `${curated.county} County, ${curated.state}`;
    return {
      zip,
      stateCode: curated.state,
      stateName,
      countyName: curated.county,
      displayLabel: countyLabel,
      resolution: 'county',
      hasCountyDashboard: Boolean(curated.dashboardSlug),
      countyDashboardSlug: curated.dashboardSlug,
    };
  }

  const stateCode = stateFromPrefix(zip);
  if (!stateCode || !STATE_NAMES[stateCode]) return null;
  const stateName = STATE_NAMES[stateCode];
  return {
    zip,
    stateCode,
    stateName,
    countyName: null,
    displayLabel: `${stateName} (ZIP ${zip})`,
    resolution: 'state',
    hasCountyDashboard: false,
  };
}
