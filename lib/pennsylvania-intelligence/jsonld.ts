import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { PENNSYLVANIA_INTELLIGENCE_GATE } from './publication';
import { PENNSYLVANIA_SNAPSHOT, type PennsylvaniaInsuranceSnapshot } from './snapshot';

export function buildPennsylvaniaInsuranceJsonLd(
  snapshot: PennsylvaniaInsuranceSnapshot = PENNSYLVANIA_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${PENNSYLVANIA_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: PENNSYLVANIA_INTELLIGENCE_GATE.title,
      description: PENNSYLVANIA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Pennsylvania insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Pennsylvania insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Pennsylvania Insurance Department licensed-company census and regulatory catalogs',
      description:
        'Official PID Licensed Company Search distinct NAIC identities, 2025 Complaint Comparison Tool insurer-line rows, Enforcement Actions documents, Market Conduct Actions, financial examination reports, surplus-lines companies, and liquidation/rehab/discharge catalog documents. A complaint is not a violation. PID Complaint Index is not a Trust Score. An exam is not discipline. Liquidation is not the current licensed-company census.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Pennsylvania Insurance Department',
        url: 'https://www.pa.gov/agencies/insurance',
      },
      isAccessibleForFree: true,
      variableMeasured: [
        `${snapshot.company_lookup.distinct_naic} PID licensed companies (distinct NAIC)`,
        `${snapshot.complaints.row_total} 2025 complaint comparison insurer-line rows`,
        `${snapshot.enforcement.enforcement_actions} Enforcement Actions documents`,
        'Agency and producer bulk rosters remain search-only',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Pennsylvania insurance official research paths',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'PID Licensed Company Search',
          url: snapshot.regulators.company_lookup,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'PID Complaint Comparison Tool',
          url: snapshot.regulators.complaints,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'PID Enforcement Actions Search',
          url: snapshot.regulators.enforcement,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'PID Licensed Individual Search',
          url: snapshot.regulators.producer_lookup,
        },
      ],
    },
  ];
}

export function paJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
