import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { COLORADO_INTELLIGENCE_GATE } from './publication';
import { COLORADO_SNAPSHOT, type ColoradoInsuranceSnapshot } from './snapshot';

export function buildColoradoInsuranceJsonLd(
  snapshot: ColoradoInsuranceSnapshot = COLORADO_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${COLORADO_INTELLIGENCE_GATE.path}`;
  const d = snapshot.statistical_report.naic_companies_tab;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: COLORADO_INTELLIGENCE_GATE.title,
      description: COLORADO_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Colorado insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Colorado insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Colorado DOI 2025 statistical-report NAIC Companies directory',
      description:
        'Dated Colorado Division of Insurance 2025 statistical-report NAIC Companies directory rows as of December 31, 2025. Not a live authorized-insurer roster and not a ranking.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Colorado Division of Insurance',
        url: 'https://doi.colorado.gov/',
      },
      temporalCoverage: '2025-12-31',
      isAccessibleForFree: true,
      variableMeasured: [
        `${d.company_directory_rows} NAIC Companies directory rows (2025 statistical report)`,
        `${d.distinct_naic} distinct NAIC CoCodes on that tab`,
        `${snapshot.surplus_lines.eligible_identities} eligible non-admitted surplus-lines identities`,
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: origin,
    },
  ];
}

export function coJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
