import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { TENNESSEE_INTELLIGENCE_GATE } from './publication';
import { TENNESSEE_SNAPSHOT, fmtInt, type TennesseeInsuranceSnapshot } from './snapshot';

export function buildTennesseeInsuranceJsonLd(
  snapshot: TennesseeInsuranceSnapshot = TENNESSEE_SNAPSHOT,
): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${TENNESSEE_INTELLIGENCE_GATE.path}`;
  const list = snapshot.licensed_companies;
  const tdci = {
    '@type': 'GovernmentOrganization',
    name: 'Tennessee Department of Commerce & Insurance',
    url: snapshot.regulator.insurance_url,
  };
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: TENNESSEE_INTELLIGENCE_GATE.title,
      description: TENNESSEE_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Tennessee insurance company and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Tennessee insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Tennessee TDCI licensed insurance companies and regulatory indexes',
      description:
        'Official TDCI List of Licensed Insurance Companies keyed by NAIC company code, with source-native company type and status, plus the Insurance Activities Monthly Update, the Insurance Company Actions Archive index and the Company Examinations Archive index. Company types are never summed. Agency and producer bulk rosters were not acquired. No Trust Score.',
      url,
      creator: tdci,
      isAccessibleForFree: true,
      temporalCoverage: snapshot.source_as_of,
      variableMeasured: [
        `${fmtInt(list.distinct_naic)} distinct NAIC codes on ${fmtInt(list.listed_rows)} listed rows (${list.list_statement})`,
        `${fmtInt(list.placeholder_rows)} reinsurer and captive rows print the placeholder NAIC ${list.placeholder_naic}`,
        `${fmtInt(snapshot.company_activity_updates.event_rows)} company-activity events (${snapshot.company_activity_updates.asterisk_statement})`,
        `${fmtInt(snapshot.company_actions.index_lines)} Insurance Company Actions Archive lines, unattached`,
        `${fmtInt(snapshot.company_examinations.listings)} company examination listings`,
        'Agency and producer bulk rosters were not acquired',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Tennessee insurance official research paths',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'List of Licensed Insurance Companies', url: snapshot.regulator.licensed_companies_url },
        { '@type': 'ListItem', position: 2, name: 'Insurance Company Actions Archive', url: snapshot.regulator.company_actions_url },
        { '@type': 'ListItem', position: 3, name: 'Company Examinations Archive', url: snapshot.regulator.company_examinations_url },
        { '@type': 'ListItem', position: 4, name: 'Verify an insurance license', url: snapshot.regulator.verify_license_url },
        { '@type': 'ListItem', position: 5, name: 'File an insurance complaint', url: snapshot.regulator.complaint_url },
      ],
    },
  ];
}

export function tnJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
