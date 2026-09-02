import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { NEW_JERSEY_INTELLIGENCE_GATE } from './publication';
import { NEW_JERSEY_SNAPSHOT, type NewJerseyInsuranceSnapshot } from './snapshot';

export function buildNewJerseyInsuranceJsonLd(
  snapshot: NewJerseyInsuranceSnapshot = NEW_JERSEY_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${NEW_JERSEY_INTELLIGENCE_GATE.path}`;
  const s = snapshot;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: NEW_JERSEY_INTELLIGENCE_GATE.title,
      description: NEW_JERSEY_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'New Jersey insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'New Jersey insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'New Jersey insurance authorization, enforcement, examination, and market snapshot',
      description: NEW_JERSEY_INTELLIGENCE_GATE.description,
      url,
      variableMeasured: [
        `${s.authorization.admitted} admitted legal insurers with exact NAIC`,
        `${s.enforcement.events} NJDOBI enforcement events in the acquired corpus`,
        `${s.enforcement.unique_orders} unique orders`,
      ],
    },
  ];
}

export function njJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
