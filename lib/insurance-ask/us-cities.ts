/**
 * TH-DISCOVERY-PARITY-001B — general US city/place → state gazetteer.
 *
 * This is plain reference geography, NOT a query allow-list: it exists so that
 * ANY "<provider category> in/near/around <place>" request can resolve its
 * requested place to a state the same way, instead of only the handful of
 * places some earlier ticket happened to name. Nothing here is keyed to a
 * specific audit string, and an unlisted place must still be handled honestly
 * by the caller (see resolveRequestedPlace's UNRESOLVED / CITY_ONLY outcomes)
 * rather than silently substituted with another state's cohort.
 *
 * Coverage: the largest US municipalities plus every state capital, so all 50
 * states are reachable. City → state is a geographic fact; it is NOT a claim
 * about credential jurisdiction, recorded office address, insurer domicile, or
 * service territory. Those distinctions stay with the caller.
 */
import { US_STATES } from '@/lib/constants';

/** city (lowercased, no punctuation) → USPS state code. */
export const US_CITY_STATE: Readonly<Record<string, string>> = {
  // --- Alabama
  birmingham: 'AL', montgomery: 'AL', huntsville: 'AL', mobile: 'AL', tuscaloosa: 'AL',
  // --- Alaska
  anchorage: 'AK', juneau: 'AK', fairbanks: 'AK',
  // --- Arizona
  phoenix: 'AZ', tucson: 'AZ', mesa: 'AZ', chandler: 'AZ', scottsdale: 'AZ', glendale: 'AZ',
  gilbert: 'AZ', tempe: 'AZ', peoria: 'AZ', surprise: 'AZ', yuma: 'AZ', flagstaff: 'AZ',
  // --- Arkansas
  'little rock': 'AR', fayetteville: 'AR', fortsmith: 'AR', 'fort smith': 'AR', springdale: 'AR',
  // --- California
  'los angeles': 'CA', 'san diego': 'CA', 'san jose': 'CA', 'san francisco': 'CA',
  fresno: 'CA', sacramento: 'CA', 'long beach': 'CA', oakland: 'CA', bakersfield: 'CA',
  anaheim: 'CA', 'santa ana': 'CA', riverside: 'CA', stockton: 'CA', irvine: 'CA',
  chula: 'CA', 'chula vista': 'CA', fremont: 'CA', 'san bernardino': 'CA', modesto: 'CA',
  oxnard: 'CA', fontana: 'CA', 'moreno valley': 'CA', huntington: 'CA', 'huntington beach': 'CA',
  glendale_ca: 'CA', 'santa clarita': 'CA', 'garden grove': 'CA', oceanside: 'CA',
  'rancho cucamonga': 'CA', 'santa rosa': 'CA', ontario: 'CA', 'elk grove': 'CA',
  corona: 'CA', lancaster: 'CA', palmdale: 'CA', salinas: 'CA', hayward: 'CA',
  pomona: 'CA', escondido: 'CA', sunnyvale: 'CA', torrance: 'CA', pasadena: 'CA',
  'santa barbara': 'CA', berkeley: 'CA', burbank: 'CA', 'san mateo': 'CA', concord: 'CA',
  'thousand oaks': 'CA', visalia: 'CA', 'simi valley': 'CA', 'santa monica': 'CA',
  'san luis obispo': 'CA', 'santa clara': 'CA', vallejo: 'CA', fairfield: 'CA', 'daly city': 'CA',
  // --- Colorado
  denver: 'CO', 'colorado springs': 'CO', aurora: 'CO', 'fort collins': 'CO', lakewood: 'CO',
  thornton: 'CO', arvada: 'CO', westminster: 'CO', pueblo: 'CO', boulder: 'CO',
  greeley: 'CO', longmont: 'CO', loveland: 'CO', broomfield: 'CO', 'castle rock': 'CO',
  littleton: 'CO', centennial: 'CO', 'grand junction': 'CO', durango: 'CO', 'highlands ranch': 'CO',
  // --- Connecticut
  bridgeport: 'CT', 'new haven': 'CT', hartford: 'CT', stamford: 'CT', waterbury: 'CT', norwalk: 'CT',
  // --- Delaware
  wilmington_de: 'DE', dover: 'DE', newark_de: 'DE',
  // --- District of Columbia
  washington: 'DC',
  // --- Florida
  jacksonville: 'FL', miami: 'FL', tampa: 'FL', orlando: 'FL', 'st petersburg': 'FL',
  'saint petersburg': 'FL', hialeah: 'FL', tallahassee: 'FL', 'port st lucie': 'FL',
  'cape coral': 'FL', 'fort lauderdale': 'FL', 'ft lauderdale': 'FL', pembroke: 'FL',
  'pembroke pines': 'FL', hollywood: 'FL', gainesville: 'FL', miramar: 'FL',
  'coral springs': 'FL', clearwater: 'FL', palmbay: 'FL', 'palm bay': 'FL',
  'west palm beach': 'FL', lakeland: 'FL', pompano: 'FL', 'pompano beach': 'FL',
  'boca raton': 'FL', 'delray beach': 'FL', 'boynton beach': 'FL', jupiter: 'FL',
  wellington: 'FL', 'deerfield beach': 'FL', 'miami beach': 'FL', 'daytona beach': 'FL',
  ocala: 'FL', sarasota: 'FL', naples: 'FL', 'fort myers': 'FL', 'ft myers': 'FL',
  kissimmee: 'FL', bradenton: 'FL', 'key west': 'FL', 'panama city': 'FL', pensacola: 'FL',
  // --- Georgia
  atlanta: 'GA', augusta: 'GA', columbus_ga: 'GA', macon: 'GA', savannah: 'GA',
  athens: 'GA', 'sandy springs': 'GA', roswell: 'GA', albany_ga: 'GA', marietta: 'GA',
  // --- Hawaii
  honolulu: 'HI', hilo: 'HI', 'pearl city': 'HI',
  // --- Idaho
  boise: 'ID', meridian: 'ID', nampa: 'ID', 'idaho falls': 'ID', 'coeur d alene': 'ID',
  // --- Illinois
  chicago: 'IL', aurora_il: 'IL', naperville: 'IL', joliet: 'IL', rockford: 'IL',
  springfield_il: 'IL', elgin: 'IL', peoria_il: 'IL', champaign: 'IL', evanston: 'IL',
  'arlington heights': 'IL', schaumburg: 'IL', bloomington_il: 'IL', decatur: 'IL',
  // --- Indiana
  indianapolis: 'IN', 'fort wayne': 'IN', evansville: 'IN', 'south bend': 'IN',
  carmel: 'IN', fishers: 'IN', bloomington_in: 'IN', hammond: 'IN', gary: 'IN', lafayette: 'IN',
  // --- Iowa
  'des moines': 'IA', 'cedar rapids': 'IA', davenport: 'IA', 'sioux city': 'IA',
  'iowa city': 'IA', 'west des moines': 'IA', ames: 'IA', 'council bluffs': 'IA',
  // --- Kansas
  wichita: 'KS', 'overland park': 'KS', 'kansas city ks': 'KS', olathe: 'KS', topeka: 'KS', lawrence: 'KS',
  // --- Kentucky
  louisville: 'KY', lexington: 'KY', 'bowling green': 'KY', owensboro: 'KY', frankfort: 'KY',
  // --- Louisiana
  'new orleans': 'LA', 'baton rouge': 'LA', shreveport: 'LA', metairie: 'LA',
  lafayette_la: 'LA', 'lake charles': 'LA', kenner: 'LA',
  // --- Maine
  portland_me: 'ME', lewiston: 'ME', bangor: 'ME', augusta_me: 'ME',
  // --- Maryland
  baltimore: 'MD', columbia_md: 'MD', 'germantown md': 'MD', 'silver spring': 'MD',
  annapolis: 'MD', rockville: 'MD', frederick: 'MD', bethesda: 'MD', gaithersburg: 'MD',
  // --- Massachusetts
  boston: 'MA', worcester: 'MA', springfield_ma: 'MA', cambridge: 'MA', lowell: 'MA',
  brockton: 'MA', 'new bedford': 'MA', quincy: 'MA', lynn: 'MA', 'fall river': 'MA',
  newton: 'MA', somerville: 'MA', framingham: 'MA', 'haverhill nb': 'MA', lawrence_ma: 'MA',
  // --- Michigan
  detroit: 'MI', 'grand rapids': 'MI', warren: 'MI', 'sterling heights': 'MI',
  'ann arbor': 'MI', lansing: 'MI', flint: 'MI', dearborn: 'MI', livonia: 'MI', troy: 'MI',
  // --- Minnesota
  minneapolis: 'MN', 'st paul': 'MN', 'saint paul': 'MN', rochester_mn: 'MN',
  bloomington_mn: 'MN', duluth: 'MN', 'brooklyn park': 'MN', plymouth: 'MN', 'st cloud': 'MN',
  // --- Mississippi
  jackson: 'MS', gulfport: 'MS', biloxi: 'MS', hattiesburg: 'MS', southaven: 'MS',
  tupelo: 'MS', meridian_ms: 'MS',
  // --- Missouri
  'kansas city': 'MO', 'st louis': 'MO', 'saint louis': 'MO', springfield_mo: 'MO',
  columbia_mo: 'MO', 'jefferson city': 'MO', independence: 'MO', 'lees summit': 'MO', 'st joseph': 'MO',
  // --- Montana
  billings: 'MT', missoula: 'MT', 'great falls': 'MT', bozeman: 'MT', helena: 'MT',
  // --- Nebraska
  omaha: 'NE', lincoln: 'NE', bellevue_ne: 'NE', 'grand island': 'NE',
  // --- Nevada
  'las vegas': 'NV', henderson: 'NV', reno: 'NV', 'north las vegas': 'NV',
  sparks: 'NV', 'carson city': 'NV',
  // --- New Hampshire
  manchester: 'NH', nashua: 'NH', concord_nh: 'NH', portsmouth: 'NH',
  // --- New Jersey
  newark: 'NJ', 'jersey city': 'NJ', paterson: 'NJ', elizabeth: 'NJ', trenton: 'NJ',
  clifton: 'NJ', camden: 'NJ', 'atlantic city': 'NJ', hoboken: 'NJ', 'cherry hill': 'NJ',
  edison: 'NJ', woodbridge: 'NJ', 'toms river': 'NJ', hamilton_nj: 'NJ', princeton: 'NJ',
  'new brunswick': 'NJ', bayonne: 'NJ', 'east orange': 'NJ', 'union city nj': 'NJ',
  passaic: 'NJ', 'west new york': 'NJ', 'perth amboy': 'NJ', 'asbury park': 'NJ', morristown: 'NJ',
  // --- New Mexico
  albuquerque: 'NM', 'las cruces': 'NM', 'santa fe': 'NM', rio: 'NM', 'rio rancho': 'NM', roswell_nm: 'NM',
  // --- New York
  'new york': 'NY', 'new york city': 'NYC_ALIAS', brooklyn: 'NY', queens: 'NY',
  bronx: 'NY', 'staten island': 'NY', manhattan: 'NY', buffalo: 'NY', rochester: 'NY',
  yonkers: 'NY', syracuse: 'NY', albany: 'NY', 'new rochelle': 'NY', 'mount vernon': 'NY',
  schenectady: 'NY', utica: 'NY', 'white plains': 'NY', hempstead: 'NY',
  // --- North Carolina
  charlotte: 'NC', raleigh: 'NC', greensboro: 'NC', durham: 'NC', 'winston salem': 'NC',
  fayetteville_nc: 'NC', cary: 'NC', wilmington: 'NC', 'high point': 'NC', asheville: 'NC',
  concord_nc: 'NC', greenville_nc: 'NC', 'chapel hill': 'NC',
  // --- North Dakota
  fargo: 'ND', bismarck: 'ND', 'grand forks': 'ND', minot: 'ND',
  // --- Ohio
  columbus: 'OH', cleveland: 'OH', cincinnati: 'OH', toledo: 'OH', akron: 'OH',
  dayton: 'OH', parma: 'OH', canton: 'OH', youngstown: 'OH', lorain: 'OH',
  'shaker heights': 'OH', elyria: 'OH', kettering: 'OH', 'cuyahoga falls': 'OH',
  // --- Oklahoma
  'oklahoma city': 'OK', tulsa: 'OK', norman: 'OK', 'broken arrow': 'OK', edmond: 'OK', lawton: 'OK',
  // --- Oregon
  portland: 'OR', salem: 'OR', eugene: 'OR', gresham: 'OR', hillsboro: 'OR',
  beaverton: 'OR', bend: 'OR', medford: 'OR', springfield_or: 'OR', corvallis: 'OR',
  // --- Pennsylvania
  philadelphia: 'PA', pittsburgh: 'PA', allentown: 'PA', erie: 'PA', reading: 'PA',
  scranton: 'PA', bethlehem: 'PA', harrisburg: 'PA', lancaster_pa: 'PA',
  altoona: 'PA', 'york pa': 'PA', 'wilkes barre': 'PA',
  // --- Rhode Island
  providence: 'RI', warwick: 'RI', cranston: 'RI', pawtucket: 'RI', newport: 'RI',
  // --- South Carolina
  columbia: 'SC', charleston: 'SC', 'north charleston': 'SC', 'mount pleasant': 'SC',
  greenville: 'SC', rock: 'SC', 'rock hill': 'SC', spartanburg: 'SC', 'myrtle beach': 'SC',
  // --- South Dakota
  'sioux falls': 'SD', 'rapid city': 'SD', pierre: 'SD', aberdeen: 'SD',
  // --- Tennessee
  nashville: 'TN', memphis: 'TN', knoxville: 'TN', chattanooga: 'TN',
  clarksville: 'TN', murfreesboro: 'TN', franklin: 'TN', jackson_tn: 'TN', 'johnson city': 'TN',
  // --- Texas
  houston: 'TX', 'san antonio': 'TX', dallas: 'TX', austin: 'TX', 'fort worth': 'TX',
  'ft worth': 'TX', 'el paso': 'TX', arlington: 'TX', 'corpus christi': 'TX',
  plano: 'TX', laredo: 'TX', lubbock: 'TX', garland: 'TX', irving: 'TX',
  amarillo: 'TX', 'grand prairie': 'TX', brownsville: 'TX', mckinney: 'TX',
  frisco: 'TX', pasadena_tx: 'TX', killeen: 'TX', mesquite: 'TX', midland: 'TX',
  denton: 'TX', waco: 'TX', carrollton: 'TX', abilene: 'TX', beaumont: 'TX',
  odessa: 'TX', round: 'TX', 'round rock': 'TX', richardson: 'TX', 'sugar land': 'TX',
  'the woodlands': 'TX', tyler: 'TX', 'league city': 'TX', 'college station': 'TX',
  'wichita falls': 'TX', 'san angelo': 'TX', 'san marcos': 'TX', galveston: 'TX',
  // --- Utah
  'salt lake city': 'UT', 'west valley city': 'UT', provo: 'UT', 'west jordan': 'UT',
  orem: 'UT', sandy: 'UT', ogden: 'UT', 'st george': 'UT', 'park city': 'UT',
  // --- Vermont
  burlington: 'VT', 'south burlington': 'VT', rutland: 'VT', 'barre vt': 'VT', montpelier: 'VT',
  // --- Virginia
  'virginia beach': 'VA', norfolk: 'VA', chesapeake: 'VA', richmond: 'VA',
  'newport news': 'VA', alexandria: 'VA', hampton: 'VA', roanoke: 'VA',
  'portsmouth va': 'VA', suffolk: 'VA', arlington_va: 'VA', fredericksburg: 'VA',
  charlottesville: 'VA', reston: 'VA', 'falls church': 'VA', fairfax: 'VA', lynchburg: 'VA',
  // --- Washington
  seattle: 'WA', spokane: 'WA', tacoma: 'WA', vancouver_wa: 'WA', bellevue: 'WA',
  kent: 'WA', everett: 'WA', renton: 'WA', 'federal way': 'WA', yakima: 'WA',
  kirkland: 'WA', bellingham: 'WA', olympia: 'WA', 'spokane valley': 'WA',
  redmond: 'WA', kennewick: 'WA', auburn: 'WA', 'walla walla': 'WA', 'port angeles': 'WA',
  // --- West Virginia
  charleston_wv: 'WV', huntington_wv: 'WV', morgantown: 'WV', parkersburg: 'WV', wheeling: 'WV',
  // --- Wisconsin
  milwaukee: 'WI', madison: 'WI', 'green bay': 'WI', kenosha: 'WI', racine: 'WI',
  appleton: 'WI', waukesha: 'WI', eau: 'WI', 'eau claire': 'WI', oshkosh: 'WI',
  // --- Wyoming
  cheyenne: 'WY', casper: 'WY', laramie: 'WY', 'jackson wy': 'WY',
};

/**
 * Names above that carry a disambiguation suffix (e.g. `springfield_il`) exist only so the
 * table can hold several same-named cities. They are never matched against user text; the
 * un-suffixed spelling is what a request can resolve, and a genuinely ambiguous bare city
 * name is reported as ambiguous rather than silently attached to one state.
 */
export const AMBIGUOUS_CITY_NAMES: readonly string[] = [
  'springfield',
  'columbus',
  'columbia',
  'aurora',
  'portland',
  'lafayette',
  'jackson',
  'bloomington',
  'greenville',
  'rochester',
  'charleston',
  'arlington',
  'glendale',
  'pasadena',
  'newark',
  'wilmington',
  'concord',
  'lancaster',
  'kansas city',
  'vancouver',
  'meridian',
  'independence',
  'salem',
  'huntington',
  'peoria',
  'augusta',
  'albany',
  'athens',
  'franklin',
  'auburn',
  'bellevue',
  // TH-DISCOVERY-PARITY-001B: "washington" is mapped above only as the city name Washington, DC.
  // Marking it ambiguous (rather than a confident city match) stops it from shadowing the far more
  // common case of a query naming BOTH a real city AND Washington the STATE (e.g. "insurance broker
  // Seattle Washington") -- CITY_KEYS_BY_LENGTH is sorted longest-first, so the 10-character
  // "washington" was matched before the 7-character "seattle" and the request's actual city (Seattle)
  // was silently dropped in favor of an unrelated DC-city guess, even though "Washington" the STATE
  // was (correctly, separately) already resolved from the very same text via the state-name table.
  'washington',
];

/**
 * TH-DISCOVERY-PARITY-001B — general place resolution built on the gazetteer above, shared by
 * interpret.ts and research-intent.ts so both use ONE geography rule instead of two divergent,
 * narrower ones (interpret.ts previously only matched a ~14-state hardcoded name list; research-
 * intent.ts only matched a state code when written as "in NJ" or ", NJ" -- neither matched a bare
 * city, or a trailing state code such as "Trenton NJ" / "Miami FL" / "Denver CO"). Nothing here is
 * keyed to a specific audited query string; an unrecognized place is UNRESOLVED and a genuinely
 * ambiguous bare city (see AMBIGUOUS_CITY_NAMES) is never silently attached to one state.
 */

const STATE_NAME_TO_CODE: Readonly<Record<string, string>> = Object.fromEntries(
  US_STATES.map((s) => [s.name.toLowerCase(), s.code]),
);
const STATE_CODES: ReadonlySet<string> = new Set(US_STATES.map((s) => s.code));

/** Longest key first so "san diego" wins over any shorter accidental overlap. */
const CITY_KEYS_BY_LENGTH: readonly string[] = Object.keys(US_CITY_STATE)
  .filter((k) => US_CITY_STATE[k] !== 'NYC_ALIAS' && !/_[a-z]{2}$/.test(k))
  .sort((a, b) => b.length - a.length);

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * All distinct state codes a free-text request names, most-specific-first: explicit full state
 * names, then a 2-letter code written the way a person actually writes an abbreviation next to a
 * place name ("Trenton NJ", "Miami, FL" -- matched case-sensitively in caps so ordinary lowercase
 * English words that also happen to be state codes, like "in" or "or", are not misread), then the
 * older "in NJ" / ", NJ" lowercase-tolerant form this codebase already relied on. Only when NO
 * explicit state was named does a recognized, unambiguous city name resolve one state -- an
 * explicit state always wins over an incidental city-like substring, and this never guesses a
 * state for a name in AMBIGUOUS_CITY_NAMES.
 */
export function resolveAllPlaceCodes(raw: string): string[] {
  const codes: string[] = [];
  const add = (code: string) => {
    if (!codes.includes(code)) codes.push(code);
  };
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (new RegExp(`\\b${escapeRe(name)}\\b`, 'i').test(raw)) add(code);
  }
  for (const token of raw.match(/\b[A-Z]{2}\b/g) ?? []) {
    if (STATE_CODES.has(token)) add(token);
  }
  for (const code of STATE_CODES) {
    if (new RegExp(`(?:\\bin\\s+|,\\s*)${code}\\b`, 'i').test(raw)) add(code);
  }
  if (!codes.length) {
    const lower = raw.toLowerCase();
    for (const key of CITY_KEYS_BY_LENGTH) {
      if (AMBIGUOUS_CITY_NAMES.includes(key)) continue;
      if (new RegExp(`\\b${escapeRe(key)}\\b`).test(lower)) {
        const state = US_CITY_STATE[key];
        if (state) {
          add(state);
          break;
        }
      }
    }
  }
  return codes;
}

/**
 * The recognized city name itself (not a state), independent of whether a state was also
 * resolved -- kept separately so a request like "Trenton NJ" can carry both the resolved state
 * (NJ) and the specific city (Trenton) through to execution for a tighter, honestly-labeled
 * broadened query. Skips names in AMBIGUOUS_CITY_NAMES; use matchAmbiguousCity for those.
 */
export function matchKnownCity(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  for (const key of CITY_KEYS_BY_LENGTH) {
    if (AMBIGUOUS_CITY_NAMES.includes(key)) continue;
    if (new RegExp(`\\b${escapeRe(key)}\\b`).test(lower)) return key;
  }
  return undefined;
}

/** A bare, genuinely ambiguous city name (e.g. "Portland") present in the text, if any. */
export function matchAmbiguousCity(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  for (const name of AMBIGUOUS_CITY_NAMES) {
    if (new RegExp(`\\b${escapeRe(name)}\\b`).test(lower)) return name;
  }
  return undefined;
}

/**
 * Resolves an otherwise-ambiguous city name (Newark, Springfield, Portland, ...) ONLY when the
 * request also names an explicit state that this gazetteer already maps that bare name to (e.g.
 * "Newark NJ", "Springfield IL") -- an explicit state removes the real-world ambiguity, so the
 * city is safe to attach for a tighter, city-scoped broadened query. This never guesses: it is a
 * precision improvement on top of an already-resolved state, not a new, independent source of
 * geography, and it returns nothing for a state this gazetteer has no matching entry for (e.g.
 * "Portland Maine" stays state-only, since this table's only "portland" entry is Oregon's).
 */
export function matchCityForState(raw: string, stateCode: string): string | undefined {
  const lower = raw.toLowerCase();
  for (const key of CITY_KEYS_BY_LENGTH) {
    if (US_CITY_STATE[key] !== stateCode) continue;
    if (new RegExp(`\\b${escapeRe(key)}\\b`).test(lower)) return key;
  }
  return undefined;
}

/** Title-cases a gazetteer key ("fort worth" -> "Fort Worth") for display purposes only. */
export function titleCasePlace(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Removes recognized state names, state codes, known city names, and "<Name> County" patterns
 * from text, leaving only whatever is NOT a recognized place -- used to tell a pure
 * "<category> <geography>" discovery phrase apart from an actual company name that happens to
 * contain a state or city word (e.g. a real firm named after a place).
 */
export function stripKnownPlaceText(raw: string): string {
  let residue = raw;
  for (const name of Object.keys(STATE_NAME_TO_CODE)) {
    residue = residue.replace(new RegExp(`\\b${escapeRe(name)}\\b`, 'gi'), ' ');
  }
  for (const code of STATE_CODES) {
    residue = residue.replace(new RegExp(`\\b${code}\\b`, 'g'), ' ');
  }
  for (const key of CITY_KEYS_BY_LENGTH) {
    residue = residue.replace(new RegExp(`\\b${escapeRe(key)}\\b`, 'gi'), ' ');
  }
  residue = residue.replace(/\b[A-Za-z][A-Za-z.'-]*\s+county\b/gi, ' ');
  return residue;
}
