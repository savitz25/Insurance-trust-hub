import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { MINNESOTA_INTELLIGENCE_GATE } from './publication';
import { MINNESOTA_SNAPSHOT, type MinnesotaInsuranceSnapshot } from './snapshot';

export function buildMinnesotaInsuranceJsonLd(snapshot: MinnesotaInsuranceSnapshot = MINNESOTA_SNAPSHOT): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${MINNESOTA_INTELLIGENCE_GATE.path}`;
  const s = snapshot;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: MINNESOTA_INTELLIGENCE_GATE.title,
      description: MINNESOTA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Minnesota insurance regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Minnesota insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Minnesota Department of Commerce insurance regulatory capability',
      description:
        'Capability record for Commerce Insurance Division license lookup, CARDS enforcement and financial documents, SERFF filing access and complaint intake. Company, agency and producer bulk rosters were not acquired. No combined Minnesota insurance total. No Trust Score.',
      url,
      creator: { '@type': 'GovernmentOrganization', name: s.regulator.name, url: s.regulator.home_url },
      isAccessibleForFree: true,
      variableMeasured: [
        'Company, agency and producer verification are search-only',
        'Company, agency and producer bulk rosters were not acquired',
        'CARDS enforcement index was not acquired',
        'Financial examination metadata index was not acquired',
        'SERFF filings were not ingested',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Minnesota insurance official research paths',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Commerce license lookup', url: s.regulator.license_lookup_url },
        { '@type': 'ListItem', position: 2, name: 'Insurer licensing', url: s.regulator.company_licensing_url },
        { '@type': 'ListItem', position: 3, name: 'Sircon Minnesota producer and agency portal', url: s.regulator.sircon_url },
        { '@type': 'ListItem', position: 4, name: 'Insurance financial reporting and examinations', url: s.regulator.financial_reporting_url },
        { '@type': 'ListItem', position: 5, name: 'Insurance Division consumer help', url: s.regulator.complaint_url },
      ],
    },
  ];
}

export function mnJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
