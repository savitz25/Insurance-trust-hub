import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { NEW_YORK_INTELLIGENCE_GATE } from './publication';
import { NEW_YORK_SNAPSHOT, type NewYorkInsuranceSnapshot } from './snapshot';

export function nyJsonLdHasForbiddenRatings(nodes: Record<string, unknown>[]): boolean {
  const blob = JSON.stringify(nodes);
  return blob.includes('aggregateRating') || blob.includes('ratingValue');
}

export function buildNewYorkInsuranceJsonLd(
  snapshot: NewYorkInsuranceSnapshot = NEW_YORK_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${NEW_YORK_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: NEW_YORK_INTELLIGENCE_GATE.title,
      description: NEW_YORK_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'New York insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'New York insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'New York DFS Insurance Company Directory',
      description: `DFS Insurance Company Search list-all directory (${snapshot.company_directory.directory_rows} rows / ${snapshot.company_directory.distinct_naic} distinct NAIC). Directory presence is not current writing authority and not a ranking.`,
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'New York State Department of Financial Services',
        url: 'https://www.dfs.ny.gov/',
      },
      temporalCoverage: snapshot.snapshot_as_of,
      isAccessibleForFree: true,
    },
  ];
}
