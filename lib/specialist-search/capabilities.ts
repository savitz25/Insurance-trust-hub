import type { SpecialistSearchCapability } from './contract';

export const INSURANCE_SEARCH_CAPABILITIES: SpecialistSearchCapability[] = [
  { key: 'identity', label: 'Agency, producer and legal-insurer identity', supportState: 'KNOWN', coverage: 'Acquired national graph extracts', sourceSystems: ['state DOI sources', 'NIPR-derived source extracts', 'NAIC/OIR sources'], limitations: ['Entity classes remain separate.', 'Research identity does not imply a published profile.'] },
  { key: 'fl_credentials', label: 'Florida credential observations', supportState: 'KNOWN', coverage: 'Accepted Florida DFS extracts', sourceSystems: ['Florida DFS'], limitations: ['Credential jurisdiction is not service territory.', 'License class text is not a national LOA taxonomy.'] },
  { key: 'appointments', label: 'Appointment evidence', supportState: 'PARTIAL', coverage: 'Indexed state/source relationships only', sourceSystems: ['state appointment sources'], limitations: ['Not a national census.', 'Appointment is not employment, ownership, or endorsement.'] },
  { key: 'marketplace', label: 'CMS Marketplace observations', supportState: 'PARTIAL', coverage: 'Acquired plan-year observations', sourceSystems: ['CMS'], limitations: ['Not a state license.', 'Plan year must be preserved.'] },
  { key: 'tx_insurers', label: 'Texas authorized-company universe', supportState: 'NOT_ACQUIRED', coverage: 'No complete acquired roster', sourceSystems: ['Texas TDI'], limitations: ['Missing roster is not zero.'] },
  { key: 'nj_insurers', label: 'New Jersey surplus-lines eligible universe', supportState: 'NOT_ACQUIRED', coverage: 'No complete acquired roster', sourceSystems: ['New Jersey DOBI'], limitations: ['Missing roster is not zero.'] },
  { key: 'ca_insurers', label: 'California admitted-insurer universe', supportState: 'NOT_ACQUIRED', coverage: 'No complete acquired roster', sourceSystems: ['California DOI'], limitations: ['Missing roster is not zero.'] },
  { key: 'co_insurers', label: 'Colorado current authorized-insurer universe', supportState: 'NOT_ACQUIRED', coverage: '2025 statistical-report directory is not a live roster', sourceSystems: ['Colorado DOI'], limitations: ['Missing roster is not zero.', 'Annual market participants are not currently authorized unless the source says so.'] },
  { key: 'co_agencies', label: 'Colorado licensed-agency roster', supportState: 'NOT_ACQUIRED', coverage: 'No complete acquired roster', sourceSystems: ['Colorado DOI', 'Sircon'], limitations: ['Search-only is not zero.'] },
  { key: 'or_agencies', label: 'Oregon licensed-agency roster', supportState: 'NOT_ACQUIRED', coverage: 'No complete acquired roster', sourceSystems: ['Oregon DFR', 'NAIC SBS'], limitations: ['Search-only is not zero.', 'Agency is not producer.', 'Directory rows are not the license census.'] },
  { key: 'or_complaints', label: 'Oregon DFR 2025 insurer complaint tables', supportState: 'PARTIAL', coverage: 'Name-only 2025 line-of-insurance tables', sourceSystems: ['Oregon DFR'], limitations: ['Complaint is not a violation.', 'DFR Complaint Index is not a Trust Score.', 'Names are not NAIC attachments.'] },
  { key: 'service_territory', label: 'Agency or insurer service territory', supportState: 'UNSUPPORTED', coverage: 'Credential, domicile and directory geography do not establish service', sourceSystems: [], limitations: ['Do not infer service from credential jurisdiction, office, domicile, appointment county, or ZIP listing.'] },
];

export function capabilityFor(key: string) {
  return INSURANCE_SEARCH_CAPABILITIES.find((item) => item.key === key);
}
