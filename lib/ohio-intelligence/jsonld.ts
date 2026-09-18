import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { OHIO_INTELLIGENCE_GATE } from './publication';
import { OHIO_SNAPSHOT, type OhioInsuranceSnapshot } from './snapshot';

export function buildOhioInsuranceJsonLd(
  snapshot: OhioInsuranceSnapshot = OHIO_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${OHIO_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: OHIO_INTELLIGENCE_GATE.title,
      description: OHIO_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Ohio insurance licensing and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Ohio insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'ODI authorized-company list, Major Lines business-entity mailing lists, and Administrative Actions Journal metadata',
      description:
        'Official Ohio Department of Insurance complete current authorized-company Excel by NAIC, Major Lines business-entity mailing-list NPNs by residence filter, and a bounded Administrative Actions Journal catalog that the source warns is not comprehensive. Agency LOA is the mailing-list filter, not product inventory. No Trust Score.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Ohio Department of Insurance',
        url: 'https://insurance.ohio.gov/',
      },
      isAccessibleForFree: true,
      variableMeasured: [
        `${snapshot.authorized_companies.distinct_naic} distinct NAIC codes on ODI's complete current authorized-company list`,
        `${snapshot.agency_roster.union_distinct_npn} Major Lines business-entity NPNs across resident and non-resident mailing lists`,
        `${snapshot.journal.document_rows} Administrative Actions Journal documents in the past-12-months bounded catalog`,
        'Individual producer bulk census remains search-only',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Ohio insurance official research paths',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'ODI authorized company list',
          url: snapshot.regulators.auth_list,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'ODI Agent/Agency Mailing Lists',
          url: snapshot.regulators.mailing_list,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'ODI Agent / Agency Locator',
          url: snapshot.regulators.agent_locator,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'ODI Administrative Actions Journal',
          url: snapshot.regulators.journal,
        },
      ],
    },
  ];
}

export function ohJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
