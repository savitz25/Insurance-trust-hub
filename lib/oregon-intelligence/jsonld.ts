import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { OREGON_INTELLIGENCE_GATE } from './publication';
import { OREGON_SNAPSHOT, type OregonInsuranceSnapshot } from './snapshot';

export function buildOregonInsuranceJsonLd(
  snapshot: OregonInsuranceSnapshot = OREGON_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${OREGON_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: OREGON_INTELLIGENCE_GATE.title,
      description: OREGON_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Oregon insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Oregon insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Oregon DFR 2025 insurer complaint tables and insurance-related administrative orders',
      description:
        'Official Oregon DFR 2025 complaint tables by line of insurance and AdminOrders documents in insurance-native DFRAction classes. A complaint is not a violation. An order document is not a unique case. DFR Complaint Index is not a Trust Score.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Oregon Division of Financial Regulation',
        url: 'https://dfr.oregon.gov/',
      },
      isAccessibleForFree: true,
      variableMeasured: [
        `${snapshot.complaints.row_total} 2025 DFR insurer-line complaint table rows`,
        `${snapshot.dfr_orders.document_rows} DFR insurance-related administrative-order documents`,
        'Current agency, producer, and authorized-insurer universes remain search-only',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Oregon insurance official research paths',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'NAIC SBS license lookup',
          url: snapshot.regulators.sbs_lookup,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'DFR complaint information',
          url: snapshot.regulators.complaints,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'DFR Notices and orders',
          url: snapshot.regulators.orders,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'DFR examination reports',
          url: snapshot.regulators.exams,
        },
      ],
    },
  ];
}

export function orJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
