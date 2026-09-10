import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { VIRGINIA_INTELLIGENCE_GATE } from './publication';
import { VIRGINIA_SNAPSHOT, type VirginiaInsuranceSnapshot } from './snapshot';

export function vaJsonLdHasForbiddenRatings(nodes: Record<string, unknown>[]): boolean {
  const blob = JSON.stringify(nodes);
  return blob.includes('aggregateRating') || blob.includes('ratingValue');
}

export function buildVirginiaInsuranceJsonLd(
  snapshot: VirginiaInsuranceSnapshot = VIRGINIA_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${VIRGINIA_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: VIRGINIA_INTELLIGENCE_GATE.title,
      description: VIRGINIA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Virginia insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Virginia insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Virginia SCC 2025 statistical-report company observations',
      description: `Dated Virginia Bureau of Insurance 2025 Insurance Company Statistical Report company-level observations (${snapshot.statistical_report.distinct_naic} distinct NAIC), year ended 2025-12-31, reported as of 2026-06-01. Not a live authorized-insurer roster and not a ranking.`,
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Virginia State Corporation Commission Bureau of Insurance',
        url: 'https://www.scc.virginia.gov/',
      },
      temporalCoverage: '2025',
      isAccessibleForFree: true,
    },
  ];
}
