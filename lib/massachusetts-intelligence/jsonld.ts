import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { MASSACHUSETTS_INTELLIGENCE_GATE } from './publication';
import { MASSACHUSETTS_SNAPSHOT, fmtInt, type MassachusettsInsuranceSnapshot } from './snapshot';

export function buildMassachusettsInsuranceJsonLd(
  snapshot: MassachusettsInsuranceSnapshot = MASSACHUSETTS_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${MASSACHUSETTS_INTELLIGENCE_GATE.path}`;
  const list = snapshot.licensed_or_approved;
  const d = snapshot.designations;
  const doi = {
    '@type': 'GovernmentOrganization',
    name: 'Massachusetts Division of Insurance',
    url: 'https://www.mass.gov/orgs/division-of-insurance',
  };
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: MASSACHUSETTS_INTELLIGENCE_GATE.title,
      description: MASSACHUSETTS_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Massachusetts insurance market and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Massachusetts insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Massachusetts DOI company lists and administrative actions',
      description:
        'Official Division of Insurance Licensed or Approved Companies list and product/designation lists, keyed by NAIC company code, plus the DOI administrative-action tables since 2015. Lists are never summed. Agency and producer bulk rosters were not acquired. No Trust Score.',
      url,
      creator: doi,
      isAccessibleForFree: true,
      temporalCoverage: `${snapshot.source_as_of}`,
      variableMeasured: [
        `${fmtInt(list.distinct_naic)} distinct NAIC codes on ${fmtInt(list.rows)} Licensed or Approved Companies rows (${snapshot.licensed_or_approved.source_printed_date})`,
        `Auto Liability 6G: ${fmtInt(d.auto_liability_6g.rows)} companies`,
        `Workers' Compensation 6E: ${fmtInt(d.workers_comp_6e.rows)} companies`,
        `Health 6B: ${fmtInt(d.health_6b.rows)} companies`,
        `Eligible surplus lines: ${fmtInt(d.eligible_surplus_lines.rows)} companies`,
        `${fmtInt(snapshot.administrative_actions.observation_rows)} DOI administrative-action rows, ${snapshot.administrative_actions.window_years[0]}–${snapshot.administrative_actions.window_years[1]}`,
        'Agency and producer bulk rosters were not acquired',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Massachusetts insurance official research paths',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Massachusetts licensed insurance companies', url: snapshot.regulator.company_lists_url },
        { '@type': 'ListItem', position: 2, name: 'DOI administrative actions', url: snapshot.regulator.administrative_actions_url },
        { '@type': 'ListItem', position: 3, name: 'Find insurance agents, agencies and other licensees', url: snapshot.regulator.find_licensees_url },
        { '@type': 'ListItem', position: 4, name: 'Filing an insurance complaint', url: snapshot.regulator.complaint_url },
      ],
    },
  ];
}

export function maJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
