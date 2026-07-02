export interface DestinationCity {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  population?: string;
  highlights: string[];
  avgAutoPremium?: string;
  avgHomePremium?: string;
}

export interface DestinationState {
  slug: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  insuranceNotes: string[];
  cities: DestinationCity[];
  relatedLinks: { href: string; label: string }[];
}

export const DESTINATION_STATES: DestinationState[] = [
  {
    slug: 'florida',
    code: 'FL',
    name: 'Florida',
    tagline: 'Coastal coverage, wind, and flood considerations',
    description:
      'Florida homeowners face unique risks from hurricanes, windstorms, and flood damage. Auto rates vary widely between metro and coastal counties. Independent agents help navigate Citizens, private carriers, and wind mitigation credits.',
    insuranceNotes: [
      'Hurricane deductibles and wind mitigation inspections can lower premiums',
      'Flood insurance is typically separate from standard homeowners policies',
      'PIP auto coverage is required; compare bodily injury limits carefully',
      'Condo and HOA master policies affect what unit-owners must insure',
    ],
    cities: [
      {
        slug: 'miami',
        name: 'Miami',
        state: 'Florida',
        stateCode: 'FL',
        population: '450,000+',
        highlights: ['Coastal wind exposure', 'High auto density', 'Condo-heavy market'],
        avgAutoPremium: '$2,800–$3,600/yr',
        avgHomePremium: '$3,200–$5,500/yr',
      },
      {
        slug: 'tampa',
        name: 'Tampa',
        state: 'Florida',
        stateCode: 'FL',
        population: '390,000+',
        highlights: ['Gulf coast storms', 'Growing suburbs', 'Mixed housing stock'],
        avgAutoPremium: '$2,400–$3,100/yr',
        avgHomePremium: '$2,600–$4,200/yr',
      },
      {
        slug: 'orlando',
        name: 'Orlando',
        state: 'Florida',
        stateCode: 'FL',
        population: '310,000+',
        highlights: ['Inland storm risk', 'Rental properties', 'Theme-park workforce'],
        avgAutoPremium: '$2,200–$2,900/yr',
        avgHomePremium: '$2,100–$3,400/yr',
      },
      {
        slug: 'jacksonville',
        name: 'Jacksonville',
        state: 'Florida',
        stateCode: 'FL',
        population: '970,000+',
        highlights: ['River flood zones', 'Large geographic spread', 'Military presence'],
        avgAutoPremium: '$2,100–$2,800/yr',
        avgHomePremium: '$2,000–$3,200/yr',
      },
      {
        slug: 'fort-lauderdale',
        name: 'Fort Lauderdale',
        state: 'Florida',
        stateCode: 'FL',
        population: '185,000+',
        highlights: ['Coastal wind exposure', 'Medicare Advantage hub', 'Broward County core'],
        avgAutoPremium: '$2,500–$3,200/yr',
        avgHomePremium: '$2,800–$4,500/yr',
      },
      {
        slug: 'west-palm-beach',
        name: 'West Palm Beach',
        state: 'Florida',
        stateCode: 'FL',
        population: '120,000+',
        highlights: ['Retiree Medicare market', 'Palm Beach corridor', 'Coastal properties'],
        avgAutoPremium: '$2,400–$3,100/yr',
        avgHomePremium: '$2,600–$4,800/yr',
      },
      {
        slug: 'boca-raton',
        name: 'Boca Raton',
        state: 'Florida',
        stateCode: 'FL',
        population: '100,000+',
        highlights: ['High-value homes', 'Senior health plans', 'Affluent retiree corridor'],
        avgAutoPremium: '$2,300–$3,000/yr',
        avgHomePremium: '$3,000–$5,200/yr',
      },
    ],
    relatedLinks: [
      { href: '/hubs/south-florida', label: 'South Florida Health Hub' },
      { href: '/resources/flood-insurance-guide', label: 'Flood Insurance Guide' },
      { href: '/resources/hurricane-prep-insurance', label: 'Hurricane Prep & Insurance' },
      { href: '/tools/cost-estimator', label: 'Premium Cost Estimator' },
    ],
  },
  {
    slug: 'texas',
    code: 'TX',
    name: 'Texas',
    tagline: 'Hail, wind, and fast-growing metro markets',
    description:
      'Texas combines large auto markets with significant hail and wind exposure. Deregulated electricity markets do not affect insurance, but rapid suburban growth means many buyers need new construction and flood zone guidance.',
    insuranceNotes: [
      'Hail claims are common in North Texas — roof age affects rates',
      'Coastal wind policies may require separate windstorm pools',
      'Texas minimum auto liability limits are relatively low — consider higher limits',
      'Business insurance demand is strong in energy and tech corridors',
    ],
    cities: [
      {
        slug: 'houston',
        name: 'Houston',
        state: 'Texas',
        stateCode: 'TX',
        population: '2.3M+',
        highlights: ['Flood risk', 'Industrial corridor', 'Sprawling suburbs'],
        avgAutoPremium: '$1,900–$2,600/yr',
        avgHomePremium: '$2,400–$3,800/yr',
      },
      {
        slug: 'dallas',
        name: 'Dallas',
        state: 'Texas',
        stateCode: 'TX',
        population: '1.3M+',
        highlights: ['Hail alley', 'Corporate relocations', 'Dense commuter traffic'],
        avgAutoPremium: '$1,800–$2,500/yr',
        avgHomePremium: '$2,200–$3,400/yr',
      },
      {
        slug: 'austin',
        name: 'Austin',
        state: 'Texas',
        stateCode: 'TX',
        population: '980,000+',
        highlights: ['Tech growth', 'Wildfire fringe zones', 'Rising home values'],
        avgAutoPremium: '$1,700–$2,300/yr',
        avgHomePremium: '$2,000–$3,200/yr',
      },
      {
        slug: 'san-antonio',
        name: 'San Antonio',
        state: 'Texas',
        stateCode: 'TX',
        population: '1.5M+',
        highlights: ['Military families', 'Affordable housing', 'Flash flood zones'],
        avgAutoPremium: '$1,600–$2,200/yr',
        avgHomePremium: '$1,800–$2,900/yr',
      },
    ],
    relatedLinks: [
      { href: '/resources/texas-auto-insurance', label: 'Texas Auto Insurance Guide' },
      { href: '/directory?state=TX', label: 'Texas Insurance Agencies' },
    ],
  },
  {
    slug: 'california',
    code: 'CA',
    name: 'California',
    tagline: 'Wildfire, earthquake, and regulated personal lines',
    description:
      'California insurance markets face wildfire moratoriums, FAIR Plan usage, and strict consumer protections. Earthquake coverage is optional but widely recommended. Auto rates reflect dense urban traffic and theft exposure.',
    insuranceNotes: [
      'Defensible space and fire-hardening can affect renewals in wildfire zones',
      'Earthquake policies are separate; consider deductible tradeoffs',
      'Prop 103 regulates rate filings — shop independent agents for options',
      'Gig economy and EV ownership affect auto coverage needs',
    ],
    cities: [
      {
        slug: 'los-angeles',
        name: 'Los Angeles',
        state: 'California',
        stateCode: 'CA',
        population: '3.9M+',
        highlights: ['Earthquake risk', 'Wildfire interface', 'High auto premiums'],
        avgAutoPremium: '$2,400–$3,200/yr',
        avgHomePremium: '$1,800–$3,500/yr',
      },
      {
        slug: 'san-diego',
        name: 'San Diego',
        state: 'California',
        stateCode: 'CA',
        population: '1.4M+',
        highlights: ['Coastal properties', 'Military base coverage', 'Lower wildfire risk'],
        avgAutoPremium: '$2,000–$2,700/yr',
        avgHomePremium: '$1,600–$2,800/yr',
      },
      {
        slug: 'san-francisco',
        name: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        population: '870,000+',
        highlights: ['Earthquake retrofit', 'Condo HO-6 policies', 'Theft exposure'],
        avgAutoPremium: '$2,300–$3,100/yr',
        avgHomePremium: '$1,400–$2,600/yr',
      },
      {
        slug: 'sacramento',
        name: 'Sacramento',
        state: 'California',
        stateCode: 'CA',
        population: '520,000+',
        highlights: ['State capital workforce', 'River flood zones', 'Suburban growth'],
        avgAutoPremium: '$1,900–$2,500/yr',
        avgHomePremium: '$1,500–$2,400/yr',
      },
    ],
    relatedLinks: [
      { href: '/resources/california-home-insurance', label: 'California Home Insurance' },
      { href: '/resources/wildfire-insurance', label: 'Wildfire Insurance Guide' },
    ],
  },
  {
    slug: 'new-york',
    code: 'NY',
    name: 'New York',
    tagline: 'Urban renters, co-ops, and no-fault auto',
    description:
      'New York combines no-fault auto requirements with complex co-op and condo insurance rules in NYC. Upstate markets differ sharply from downstate pricing. Independent brokers help navigate carrier appetite and surcharges.',
    insuranceNotes: [
      'No-fault PIP is mandatory; compare supplemental UM/UIM limits',
      'Co-op policies (walls-in) differ from condo HO-6 coverage',
      'Flood zones affect Long Island and Hudson Valley properties',
      'Workers comp and commercial package policies are common for NYC businesses',
    ],
    cities: [
      {
        slug: 'new-york-city',
        name: 'New York City',
        state: 'New York',
        stateCode: 'NY',
        population: '8.3M+',
        highlights: ['Co-op insurance', 'Renters density', 'High liability limits'],
        avgAutoPremium: '$2,800–$4,200/yr',
        avgHomePremium: '$1,200–$2,800/yr',
      },
      {
        slug: 'buffalo',
        name: 'Buffalo',
        state: 'New York',
        stateCode: 'NY',
        population: '275,000+',
        highlights: ['Lake-effect snow', 'Older housing stock', 'Affordable premiums'],
        avgAutoPremium: '$1,400–$1,900/yr',
        avgHomePremium: '$900–$1,500/yr',
      },
      {
        slug: 'rochester',
        name: 'Rochester',
        state: 'New York',
        stateCode: 'NY',
        population: '210,000+',
        highlights: ['Winter weather claims', 'University market', 'Stable home values'],
        avgAutoPremium: '$1,300–$1,800/yr',
        avgHomePremium: '$850–$1,400/yr',
      },
      {
        slug: 'albany',
        name: 'Albany',
        state: 'New York',
        stateCode: 'NY',
        population: '100,000+',
        highlights: ['Government sector', 'Capital region suburbs', 'Moderate rates'],
        avgAutoPremium: '$1,350–$1,850/yr',
        avgHomePremium: '$900–$1,450/yr',
      },
    ],
    relatedLinks: [
      { href: '/resources/new-york-auto-insurance', label: 'NY Auto Insurance Guide' },
      { href: '/resources/renters-insurance', label: 'Renters Insurance Guide' },
    ],
  },
  {
    slug: 'north-carolina',
    code: 'NC',
    name: 'North Carolina',
    tagline: 'Coastal wind pools and Research Triangle growth',
    description:
      'North Carolina balances affordable inland rates with coastal wind exposure. The Research Triangle and Charlotte metro drive strong demand for auto, home, and life coverage. Beach properties may need NCJUA or excess wind policies.',
    insuranceNotes: [
      'Coastal counties may require separate wind/hail coverage',
      'Beach plan and FAIR options exist for hard-to-place risks',
      'Growing suburbs mean new construction discounts may apply',
      'Independent agents compare NC Rate Bureau filings across carriers',
    ],
    cities: [
      {
        slug: 'charlotte',
        name: 'Charlotte',
        state: 'North Carolina',
        stateCode: 'NC',
        population: '880,000+',
        highlights: ['Banking hub', 'Rapid suburban growth', 'Moderate hail risk'],
        avgAutoPremium: '$1,400–$1,900/yr',
        avgHomePremium: '$1,200–$1,900/yr',
      },
      {
        slug: 'raleigh',
        name: 'Raleigh',
        state: 'North Carolina',
        stateCode: 'NC',
        population: '470,000+',
        highlights: ['Tech corridor', 'New construction', 'Strong job market'],
        avgAutoPremium: '$1,350–$1,850/yr',
        avgHomePremium: '$1,100–$1,750/yr',
      },
      {
        slug: 'durham',
        name: 'Durham',
        state: 'North Carolina',
        stateCode: 'NC',
        population: '290,000+',
        highlights: ['Research Triangle', 'University housing', 'Mixed urban core'],
        avgAutoPremium: '$1,300–$1,800/yr',
        avgHomePremium: '$1,050–$1,700/yr',
      },
      {
        slug: 'wilmington',
        name: 'Wilmington',
        state: 'North Carolina',
        stateCode: 'NC',
        population: '125,000+',
        highlights: ['Coastal wind', 'Flood zones', 'Vacation properties'],
        avgAutoPremium: '$1,450–$2,000/yr',
        avgHomePremium: '$1,400–$2,400/yr',
      },
    ],
    relatedLinks: [
      { href: '/resources/north-carolina-insurance', label: 'NC Insurance Overview' },
      { href: '/directory?state=NC', label: 'NC Insurance Agencies' },
    ],
  },
  {
    slug: 'illinois',
    code: 'IL',
    name: 'Illinois',
    tagline: 'Chicago metro complexity and Midwest weather',
    description:
      'Illinois combines dense Chicago renters and condo markets with Midwest hail and winter weather claims statewide. Auto rates in Cook County run higher than downstate averages. Independent agents help with umbrella and business lines.',
    insuranceNotes: [
      'Chicago condo master policies affect unit-owner HO-6 needs',
      'Winter freeze claims — verify pipe and water backup coverage',
      'Minimum auto liability is modest — umbrella policies are popular',
      'Small business BOP packages are widely available through independents',
    ],
    cities: [
      {
        slug: 'chicago',
        name: 'Chicago',
        state: 'Illinois',
        stateCode: 'IL',
        population: '2.7M+',
        highlights: ['Condo HO-6', 'High auto rates', 'Renters market'],
        avgAutoPremium: '$1,900–$2,800/yr',
        avgHomePremium: '$1,400–$2,400/yr',
      },
      {
        slug: 'naperville',
        name: 'Naperville',
        state: 'Illinois',
        stateCode: 'IL',
        population: '150,000+',
        highlights: ['Affluent suburbs', 'Family auto policies', 'Low crime'],
        avgAutoPremium: '$1,500–$2,000/yr',
        avgHomePremium: '$1,200–$1,900/yr',
      },
      {
        slug: 'springfield',
        name: 'Springfield',
        state: 'Illinois',
        stateCode: 'IL',
        population: '115,000+',
        highlights: ['State capital', 'Affordable housing', 'Moderate weather risk'],
        avgAutoPremium: '$1,200–$1,600/yr',
        avgHomePremium: '$950–$1,400/yr',
      },
      {
        slug: 'rockford',
        name: 'Rockford',
        state: 'Illinois',
        stateCode: 'IL',
        population: '150,000+',
        highlights: ['Manufacturing base', 'Winter storms', 'Value-oriented market'],
        avgAutoPremium: '$1,250–$1,650/yr',
        avgHomePremium: '$900–$1,350/yr',
      },
    ],
    relatedLinks: [
      { href: '/resources/illinois-auto-insurance', label: 'Illinois Auto Guide' },
      { href: '/resources/umbrella-insurance', label: 'Umbrella Insurance Guide' },
    ],
  },
];

export function getDestinationBySlug(slug: string): DestinationState | undefined {
  return DESTINATION_STATES.find((d) => d.slug === slug);
}

export function getDestinationCity(
  stateSlug: string,
  citySlug: string
): { state: DestinationState; city: DestinationCity } | undefined {
  const state = getDestinationBySlug(stateSlug);
  if (!state) return undefined;
  const city = state.cities.find((c) => c.slug === citySlug);
  if (!city) return undefined;
  return { state, city };
}

export function getAllDestinationSlugs(): string[] {
  return DESTINATION_STATES.map((d) => d.slug);
}