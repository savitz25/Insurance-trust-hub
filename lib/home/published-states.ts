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
  virginia: 'VA',
  washington: 'WA',
  wisconsin: 'WI',
  indiana: 'IN',
};

/** Newest state pages first. */
const NEWEST: Partial<Record<(typeof PUBLISHED_STATEWIDE_SLUGS)[number], string>> = {
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
