import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { ILLINOIS_INTELLIGENCE_GATE } from './publication';
import { ILLINOIS_SNAPSHOT, type IllinoisInsuranceSnapshot } from './snapshot';

export function buildIllinoisInsuranceJsonLd(
  snapshot: IllinoisInsuranceSnapshot = ILLINOIS_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${ILLINOIS_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: ILLINOIS_INTELLIGENCE_GATE.title,
      description: ILLINOIS_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Illinois insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Illinois insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: "IDOI Director's Orders search-index observations",
      description:
        "Official Illinois Department of Insurance Director's Orders application search-index rows. An order is not a conviction, not a unique company, and not a complaint.",
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Illinois Department of Insurance',
        url: 'https://idoi.illinois.gov/',
      },
      isAccessibleForFree: true,
      variableMeasured: [
        `${snapshot.directors_orders.observation_rows} Director's Orders observations`,
        'Current IDOI company universe remains search-only',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Illinois insurance official research paths',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'IDOI Company Lookup',
          url: snapshot.regulators.company_lookup,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'SBS producer and agency lookup',
          url: snapshot.regulators.sbs_lookup,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: "IDOI Director's Orders",
          url: snapshot.regulators.directors_orders,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'IDOI Help Center',
          url: snapshot.regulators.help_center,
        },
      ],
    },
  ];
}

export function ilJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
