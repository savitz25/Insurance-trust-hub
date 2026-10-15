import { PUBLISHED_STATEWIDE_SLUGS } from '@/lib/seo/published-state-path';

/**
 * Single local list behind homepage state counts and state links.
 * Derived from PUBLISHED_STATEWIDE_SLUGS so a newly published state appears on the
 * homepage without a hand-entered count.
 */
export type PublishedState = {
  slug: string;
  abbreviation: string;
  name: string;
  href: string;
  /** Present only for the newest state pages; restates that page's own published scope. */
  newestSummary?: string;
};

/** Listed for path normalization only: no InsuranceTrustHub state-intelligence page is published. */
const NO_STATE_PAGE = new Set<string>(['arizona']);

const ABBREVIATIONS: Record<(typeof PUBLISHED_STATEWIDE_SLUGS)[number], string> = {
  arizona: 'AZ',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  florida: 'FL',
  georgia: 'GA',
  illinois: 'IL',
  louisiana: 'LA',
  alabama: 'AL',
  kentucky: 'KY',
  'south-carolina': 'SC',
  mississippi: 'MS',
  arkansas: 'AR',
  oklahoma: 'OK',
  missouri: 'MO',
  massachusetts: 'MA',
  maryland: 'MD',
  michigan: 'MI',
  minnesota: 'MN',
  nevada: 'NV',
  'new-jersey': 'NJ',
  'new-york': 'NY',
  'north-carolina': 'NC',
  ohio: 'OH',
  oregon: 'OR',
  pennsylvania: 'PA',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  nebraska: 'NE',
  virginia: 'VA',
  washington: 'WA',
  wisconsin: 'WI',
  indiana: 'IN',
  'new-mexico': 'NM',
  idaho: 'ID',
  kansas: 'KS',
  iowa: 'IA',
  'west-virginia': 'WV',
  hawaii: 'HI',
  alaska: 'AK',
  delaware: 'DE',
  maine: 'ME',
  montana: 'MT',
  'new-hampshire': 'NH',
  'north-dakota': 'ND',
  'rhode-island': 'RI',
  'south-dakota': 'SD',
  vermont: 'VT',
  wyoming: 'WY',
};

/** Newest state pages first. */
const NEWEST: Partial<Record<(typeof PUBLISHED_STATEWIDE_SLUGS)[number], string>> = {
  'west-virginia':
    'Offices of the Insurance Commissioner company-type table as of 09/11/2026. Classes stay separate, including a printed Captive count of 0. Producer, agency, adjuster, and appointment rosters were not acquired.',
  hawaii:
    'Hawaii Insurance Division licensing pathways; current insurer, agency, producer, adjuster, and surplus-lines rosters were not acquired. Appointments and regulatory events stay separate.',
  idaho:
    'Department of Insurance 2024 annual report: 2,384 printed regulated entities and 114,549 licenses that mix business entities and individuals. Those grains are not added.',
  'new-mexico':
    'Office of Superintendent of Insurance Title Insurance Bureau: 68 licensed title insurance agents and 24 underwriters stay separate. Other statewide rosters were not acquired.',
  nebraska:
    'NAIC 2025 key facts, calendar year 2024: 1,687 domestic and licensed foreign insurers, with 155 domestic insurers inside that total. Four captives are separate. Producer, agency, adjuster, and appointment rosters were not acquired.',
  utah:
    'Utah Insurance Department 2025 report: 1,466 commercial insurers licensed at 2024 year-end; 319 reported health business separately. Other statewide rosters were not acquired.',
  missouri:
    'DCI active company directory detail records by printed license type. Insurers, administrators, purchasing groups, producers, appointments and regulatory actions stay separate.',
  oklahoma:
    '2025 annual-report domestic and foreign insurer counts stay separate from resident producers, resident adjusters, complaints, and legal activity. Bulk rosters were not acquired.',
  arkansas:
    'NAIC 2024 domestic and licensed-foreign insurer counts, separate captives, and Department complaint totals. Producer, agency, adjuster, title-agent, and appointment rosters were not acquired.',
  mississippi:
    'MID licensed-company list of 2,129 rows, separate from the 13 Aug 2026 Insurance Producer Entity file of 10,645 rows. Individual producers were not acquired.',
  'south-carolina':
    'NAIC 2024 domestic and licensed-foreign insurer counts, separate captives, and the April 2026 Department of Insurance company list by printed type. Those clocks are not added. Row rosters were not acquired.',
  kentucky:
    'NAIC 2024 domestic and licensed-foreign insurer counts, separate captives, and Department of Insurance complaint totals. Row rosters were not acquired.',
  alabama:
    'ALDOI 2024 company-type counts and separate License Type and Business Type counts. Row rosters were not acquired. Those totals are not one census.',
  louisiana:
    'LDI fiscal-year-end category entries, separate company and producer searches, and complaint intake. Category entries are not distinct companies.',
  indiana:
    'IDOI company and producer verification, administrative-action index, financial examinations, and complaint capabilities',
  wisconsin:
    'OCI insurer-category counts, company and producer verification, administrative actions, and examination indexes',
  connecticut:
    'CID company-list research by NAIC code, market-conduct dispositions, and consent orders',
  maryland:
    'Maryland Insurance Administration company licensing, orders, producer enforcement, and examination indexes',
  michigan: 'DIFS insurer, agency and producer verification, final decisions, and the company examination index',
  alaska:
    'Division of Insurance company and licensee search is published. Dated statewide insurer, agency, and producer rosters were NOT_ACQUIRED, not zero.',
  delaware:
    'October 1, 2026 active-company workbook: 2,279 company-type rows and 2,274 distinct SBS company identifiers. Those figures are not one insurer census. Producer, agency, and appointment rosters were NOT_ACQUIRED.',
  maine:
    'August 1, 2026 active nonresident producer list: 225,804 license rows and 225,570 distinct NPN identifiers. That slice is not resident producers, agencies, or insurers. Those rosters were NOT_ACQUIRED.',
  montana:
    'CSI and SBS lookup pathways are published. Current insurer, agency, producer, adjuster, and surplus-lines rosters were NOT_ACQUIRED in the October 14, 2026 preflight, not zero.',
  'new-hampshire':
    'Insurance Department SBS lookup is published. Current statewide insurer, agency, producer, and adjuster rosters were NOT_ACQUIRED, not zero.',
  'north-dakota':
    'Insurance Department company and SBS lookup paths are published. Dated statewide license rosters were NOT_ACQUIRED, not zero.',
  'rhode-island':
    'DBR insurer reports dated October 2, 2026 keep classes separate, including 840 property and casualty and 386 life report counts. Those classes are not added together. Producer and agency rosters were NOT_ACQUIRED.',
  'south-dakota':
    'Domestic company table as of October 2023: 22 named observations, kept separate from 7 farm-mutual observations as of September 2026. They are not a current insurer census. Producer and agency rosters were NOT_ACQUIRED.',
  vermont:
    'DFR lookup and list paths exist. Dated insurer, agency, and producer rosters were NOT_ACQUIRED because the public portal returned HTTP 403. That is not zero.',
  wyoming:
    'Insurance Department lookup is published. Current insurer, agency, producer, and appointment rosters were NOT_ACQUIRED, not zero.',
};

function nameFor(slug: string): string {
  return slug
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export const PUBLISHED_STATES: PublishedState[] = PUBLISHED_STATEWIDE_SLUGS.filter(
  (slug) => !NO_STATE_PAGE.has(slug),
)
  .map((slug) => ({
    slug,
    abbreviation: ABBREVIATIONS[slug],
    name: nameFor(slug),
    href: `/${slug}`,
    newestSummary: NEWEST[slug],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const PUBLISHED_STATE_COUNT = PUBLISHED_STATES.length;

export const NEWEST_PUBLISHED_STATES: PublishedState[] = Object.keys(NEWEST)
  .map((slug) => PUBLISHED_STATES.find((state) => state.slug === slug))
  .filter((state): state is PublishedState => Boolean(state));
