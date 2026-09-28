export const MICHIGAN_INSURANCE_GATE = {
  path: '/michigan',
  robotsIndex: true,
  title: 'Michigan Insurance Licensing & DIFS Regulatory Evidence | InsuranceTrustHub',
  description: 'Verify Michigan insurers, agencies, producers and appointments with DIFS. Research bounded final decisions and the official company examination index by exact identifiers. Independent research without rankings.',
} as const;

export const DIFS_SOURCES = {
  locatorFaq: 'https://www.michigan.gov/difs/difs-locator-faq',
  regulatedEntities: 'https://www.michigan.gov/difs/industry/insurance/regulated-insurance-entities',
  insurer: 'https://difs.state.mi.us/locators?searchtype=InsCompany',
  agency: 'https://difs.state.mi.us/locators?searchtype=InsAgency',
  producer: 'https://difs.state.mi.us/locators?searchtype=InsAgent',
  appointedProducers: 'https://difs.state.mi.us/locators?searchtype=InsAgent',
  appointments: 'https://www.michigan.gov/difs/industry/licensing-ins/agncy-ins/related/appointments-cancellations',
  decisions: 'https://www.michigan.gov/difs/legal/hearings-decisions/final-decisions',
  marketExams: 'https://www.michigan.gov/difs/industry/insurance-mkt-regulation/company-examinations',
  marketRegulation: 'https://www.michigan.gov/difs/industry/insurance-mkt-regulation',
  complaints: 'https://www.michigan.gov/difs/consumers/complaint/file-a-paper-complaint',
  complaintStatistics: 'https://www.michigan.gov/difs/complaint-statistics',
  reports: 'https://www.michigan.gov/difs/news-and-outreach/reports',
} as const;
