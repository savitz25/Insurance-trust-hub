import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { NORTH_CAROLINA_INTELLIGENCE_GATE } from './publication';
import { NORTH_CAROLINA_SNAPSHOT, type NorthCarolinaInsuranceSnapshot } from './snapshot';

export function buildNorthCarolinaInsuranceJsonLd(
  snapshot: NorthCarolinaInsuranceSnapshot = NORTH_CAROLINA_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${NORTH_CAROLINA_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: NORTH_CAROLINA_INTELLIGENCE_GATE.title,
      description: NORTH_CAROLINA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'North Carolina insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'North Carolina insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'NCDOI licensing-action catalog, examination indexes, and 2025 market-share line activity',
      description:
        'Official NCDOI Licensing Actions catalog rows by source-native license class, Market Regulation and Financial Examination report indexes, current receivership estate index, and 2025 company market-share line PDFs. Company, agency, and producer bulk rosters remain search-only. A complaint census was not acquired. No Trust Score.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'North Carolina Department of Insurance',
        url: 'https://www.ncdoi.gov/',
      },
      isAccessibleForFree: true,
      variableMeasured: [
        `${snapshot.licensing_actions.document_rows} NCDOI Licensing Action catalog rows`,
        `${snapshot.licensing_actions.producer_rows} Insurance Producer action rows`,
        `${snapshot.market_share.homeowners_multiple_peril_rows} 2025 homeowners multiple peril company-line rows`,
        'Agency, producer, and licensed-company bulk rosters remain search-only',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'North Carolina insurance official research paths',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'NCDOI Licensing Actions',
          url: snapshot.regulators.licensing_actions,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'NCDOI market share and premium reports',
          url: snapshot.regulators.market_share,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'NAIC SBS North Carolina licensee lookup',
          url: snapshot.regulators.sbs_lookup,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'NCDOI receiverships',
          url: snapshot.regulators.receiverships,
        },
      ],
    },
  ];
}

export function ncJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
