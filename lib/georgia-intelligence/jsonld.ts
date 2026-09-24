import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { GEORGIA_INTELLIGENCE_GATE } from './publication';
import { GEORGIA_SNAPSHOT, type GeorgiaInsuranceSnapshot } from './snapshot';

export function buildGeorgiaInsuranceJsonLd(
  snapshot: GeorgiaInsuranceSnapshot = GEORGIA_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${GEORGIA_INTELLIGENCE_GATE.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: GEORGIA_INTELLIGENCE_GATE.title,
      description: GEORGIA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Georgia insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Georgia insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Georgia OCI receivership index and licensing-structure notes',
      description:
        'Official OCI receivership-index company pages since September 2010, plus two later receivership announcements. Agency, producer, and company bulk rosters remain unacquired. Sircon verification is search-only. No Trust Score and no NAIC attachments.',
      url,
      creator: {
        '@type': 'GovernmentOrganization',
        name: 'Georgia Office of the Commissioner of Insurance and Safety Fire',
        url: 'https://oci.georgia.gov/',
      },
      isAccessibleForFree: true,
      variableMeasured: [
        `${snapshot.receiverships.index_entities} companies on the OCI receivership index since September 2010`,
        `${snapshot.receiverships.later_announcements} later receivership announcements stored separately`,
        'Agency, producer, and company bulk rosters were not acquired',
        'Exact NAIC attachments: 0',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Georgia insurance official research paths',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'OCI license lookup',
          url: snapshot.regulator.lookup_url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Sircon for Georgia',
          url: snapshot.regulator.sircon_url,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'OCI agency licensing and renewals',
          url: snapshot.regulator.agency_licensing_url,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'OCI receiverships',
          url: snapshot.regulator.receiverships_url,
        },
        {
          '@type': 'ListItem',
          position: 5,
          name: 'File a consumer insurance complaint',
          url: snapshot.regulator.complaints_url,
        },
      ],
    },
  ];
}

export function gaJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
