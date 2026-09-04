import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { WASHINGTON_INTELLIGENCE_GATE } from './publication';
import { WASHINGTON_SNAPSHOT, type WashingtonInsuranceSnapshot } from './snapshot';

export function buildWashingtonInsuranceJsonLd(
  snapshot: WashingtonInsuranceSnapshot = WASHINGTON_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${WASHINGTON_INTELLIGENCE_GATE.path}`;
  const a = snapshot.annual_aggregates;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: WASHINGTON_INTELLIGENCE_GATE.title,
      description: WASHINGTON_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Washington insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Washington insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'OIC 2025 annual-report regulated-entity aggregates',
      description:
        'Dated Washington Office of the Insurance Commissioner annual-report counts of insurance and risk/non-risk bearing entities. Not a live company roster and not a ranking.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Washington Office of the Insurance Commissioner',
        url: 'https://www.insurance.wa.gov/',
      },
      temporalCoverage: '2025',
      isAccessibleForFree: true,
      variableMeasured: [
        `${a.regulated_entities} regulated entities (annual-report aggregate)`,
        `${a.domestic} domestic`,
        `${a.foreign} foreign`,
        `${a.alien} alien`,
      ],
    },
  ];
}

export function waJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
