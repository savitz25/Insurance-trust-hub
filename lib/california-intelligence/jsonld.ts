import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { CALIFORNIA_INTELLIGENCE_GATE } from './publication';
import { CALIFORNIA_SNAPSHOT, type CaliforniaInsuranceSnapshot } from './snapshot';

export function buildCaliforniaInsuranceJsonLd(
  snapshot: CaliforniaInsuranceSnapshot = CALIFORNIA_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${CALIFORNIA_INTELLIGENCE_GATE.path}`;
  const actions = Object.entries(snapshot.enforcement.action_counts);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: CALIFORNIA_INTELLIGENCE_GATE.title,
      description: CALIFORNIA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'California insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'California insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Acquired DMHC enforcement action rows',
      description:
        'Official DMHC Office of Enforcement action rows from the CHHS datastore. Coverage is Knox-Keene / DMHC, not the complete California insurer universe.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Department of Managed Health Care',
        url: 'https://www.dmhc.ca.gov/',
      },
      temporalCoverage: `${snapshot.enforcement.date_min}/${snapshot.enforcement.date_max}`,
      isAccessibleForFree: true,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'DMHC enforcement action classes in the acquired extract',
      description: 'Source-native action classes. Not a ranking.',
      numberOfItems: actions.length,
      itemListElement: actions.map(([name, count], i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${name} — ${Number(count).toLocaleString('en-US')} rows`,
      })),
    },
  ];
}

export function caJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
