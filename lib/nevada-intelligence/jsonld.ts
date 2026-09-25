import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { NEVADA_INTELLIGENCE_GATE } from './publication';
import { NEVADA_SNAPSHOT, fmtInt, type NevadaInsuranceSnapshot } from './snapshot';

export function buildNevadaInsuranceJsonLd(snapshot: NevadaInsuranceSnapshot = NEVADA_SNAPSHOT): Record<string, unknown>[] {
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${NEVADA_INTELLIGENCE_GATE.path}`;
  const s = snapshot;
  const c = s.market_report_census;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: NEVADA_INTELLIGENCE_GATE.title,
      description: NEVADA_INTELLIGENCE_GATE.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Nevada insurance regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Nevada insurance research', item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Nevada Division of Insurance consumer complaint data (aggregates) and regulatory context',
      description:
        'Aggregate counts of NDOI consumer complaint-reason rows for 2022-2024 by coverage type, reason category and disposition, the current NDOI Enforcements & Orders posting, the MHPAEA company-report index and NDOI-stated licensee and company figures. Rows are not complaints; respondent names are not republished and nothing is attached to an insurer or producer. Company, agency and producer bulk rosters were not acquired. No Trust Score.',
      url,
      temporalCoverage: `${s.complaint_data.period_start}/${s.complaint_data.period_end}`,
      creator: { '@type': 'GovernmentOrganization', name: 'Nevada Division of Insurance', url: s.regulator.home_url },
      isAccessibleForFree: true,
      variableMeasured: [
        `${fmtInt(s.complaint_data.rows_2024)} complaint-reason rows opened in 2024 (not complaints)`,
        `${s.enforcement.listed_orders} order on the current Enforcements & Orders posting`,
        `${s.mhpaea_reports.company_reports} MHPAEA company draft reports listed`,
        `NDOI states ${fmtInt(c.companies.licensed_domestic_and_foreign_insurers)} licensed domestic and foreign insurers (figures as of October 2024)`,
        'Company, agency and producer bulk rosters were not acquired',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Nevada insurance official research paths',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'NDOI company, agency and agent lookup', url: s.regulator.license_lookup_url },
        { '@type': 'ListItem', position: 2, name: 'NDOI Enforcements & Orders', url: s.regulator.enforcements_url },
        { '@type': 'ListItem', position: 3, name: 'NDOI consumer complaint reports', url: s.regulator.complaint_data_url },
        { '@type': 'ListItem', position: 4, name: 'File a complaint with NDOI', url: s.regulator.complaint_url },
        { '@type': 'ListItem', position: 5, name: 'SERFF Filing Access for Nevada', url: s.regulator.serff_url },
      ],
    },
  ];
}

export function nvJsonLdHasForbiddenRatings(data: unknown): boolean {
  return /aggregateRating|reviewRating|"ratingValue"|"reviewCount"/i.test(JSON.stringify(data));
}
