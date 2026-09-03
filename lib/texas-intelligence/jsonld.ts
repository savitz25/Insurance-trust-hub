import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { TEXAS_INTELLIGENCE_GATE } from './publication';
import { TEXAS_SNAPSHOT, type TexasInsuranceSnapshot } from './snapshot';

export function buildTexasInsuranceJsonLd(
  snapshot: TexasInsuranceSnapshot = TEXAS_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${TEXAS_INTELLIGENCE_GATE.path}`;
  const types = Object.entries(snapshot.agencies.license_type_counts).slice(0, 12);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: TEXAS_INTELLIGENCE_GATE.title,
      description: TEXAS_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Texas insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Texas insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Acquired TDI agency license rows',
      description:
        'Official Texas Department of Insurance agency and business license rows from the Texas Open Data Portal. Coverage is TDI business licenses, not a person directory and not a complete authorized-company universe.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Texas Department of Insurance',
        url: 'https://www.tdi.texas.gov/',
      },
      temporalCoverage: snapshot.as_of,
      isAccessibleForFree: true,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'TDI agency license types in the acquired extract',
      description: 'Source-native license types. Not a ranking.',
      numberOfItems: types.length,
      itemListElement: types.map(([name, count], i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${name} — ${Number(count).toLocaleString('en-US')} rows`,
      })),
    },
  ];
}

export function txJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
