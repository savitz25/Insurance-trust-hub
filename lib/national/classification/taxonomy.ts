/**
 * Classification constitution: what an InsuranceTrustHub insurance agency is.
 * Research coverage ≠ publication. Retain then classify; never delete official rows.
 */

import type {
  OfficialSourceSupport,
  ProductClass,
} from './types';

export const ENTITY_PRODUCT_PRIORITY: ProductClass[] = [
  'core_agency',
  'specialty_insurance',
  'title',
  'claims_service',
  'bail',
  'tpa',
  'warranty_service',
  'ancillary_distribution',
  'carrier',
  'out_of_scope',
  'unknown',
];

/** Mixed-credential rule: at least one qualifying core credential → count once as core. */
export const MIXED_CREDENTIAL_POLICY =
  'at_least_one_core_credential_counts_once_as_core_agency';

export const LOCATION_NETWORK_POLICY =
  'one_national_entity_per_confirmed_npn_not_one_agency_per_licensed_location';

export const CORE_AGENCY_DEFINITION = {
  is: [
    'A business entity licensed to transact ordinary life, health, property, casualty, or personal-lines insurance as a producer/agency (Fla. Stat. 626.015 insurance agency; TDI General Lines / Life / Personal Lines agency; NV Producer Firm; VT Insurance Producer; MS Insurance Producer Entity).',
    'Counted once nationally by confirmed NPN even if it holds many location licenses or mixed specialty credentials.',
  ],
  isNot: [
    'A warranty association, service-contract provider, or auto/home warranty seller (Fla. Stat. ch. 634; NRS 690C).',
    'A limited-lines retailer (portable electronics, travel, credit, motor-vehicle rental, in-transit storage) under Fla. Stat. 626.321 and peers.',
    'A public or independent adjuster / adjusting firm (Fla. Stat. 626.854 / 626.8548).',
    'A bail-bond agency (Fla. Stat. ch. 648; NV bail agency).',
    'A title agency or title direct operation.',
    'A TPA, utilization-review, or external-review organization.',
    'A motor club, funeral/cemetery seller, discount health program, or other out-of-scope licensee.',
    'An individual producer (separate entity kind; public profiles remain gated).',
    'One licensed store location of a national retailer.',
    'An Ohio row whose license class was not recovered from the official mailing list.',
  ],
};

export const SOURCE_OFFICIAL_SUPPORT: Record<string, OfficialSourceSupport> = {
  FL: {
    regulator: 'Florida Department of Financial Services, Division of Insurance Agent and Agency Services',
    citations: [
      'Fla. Stat. 626.015 (insurance agency, agent, limited lines insurance, MGA)',
      'Fla. Stat. 626.112 (agency license required for business location of general lines/life/health agents)',
      'Fla. Stat. 626.321 (limited licenses: portable electronics, travel, credit, motor vehicle rental, in-transit)',
      'Fla. Stat. 626.854 / 626.8548 (public adjuster / all-lines adjuster)',
      'Fla. Stat. ch. 634 (warranty associations)',
      'Fla. Stat. ch. 648 (bail bond agents/agencies)',
      'Fla. Stat. 626.8417 et seq. (title agencies)',
      'https://myfloridacfo.com/Division/Agents/',
      'Bulk valid-business licenses: https://licenseesearch.fldfs.com/BulkDownload',
    ],
    notes: 'Staging license class is DFS License TYCL Desc. Valid-business extract; 24 observed classes.',
  },
  TX: {
    regulator: 'Texas Department of Insurance',
    citations: [
      'https://tdi.texas.gov/agent/agentlists.html',
      'Open data 3yqc-fcdt Insurance agencies and businesses',
      'NIPR Texas business: General Lines, Life, Personal Lines P&C, Surplus Lines, MGA, Limited Lines',
      'Insurance Code ch. 4051 (property and casualty agents), 4054 (life/health), 4055 (limited lines), 4151/4101 (adjusters), 2651 (title)',
    ],
    notes: 'Staging license_type is TDI agency license class. 21 observed classes. Qualification rows were merged by license number at import.',
  },
  OH: {
    regulator: 'Ohio Department of Insurance',
    citations: [
      'https://insurance.ohio.gov/agents-and-agencies/business-entity/major-lines--business-entity',
      'ORC 3905.06 lines of authority (life, A&H, property, casualty, personal lines, variable)',
      'ODI also licenses limited lines, MGA, surplus lines, title, public insurance adjuster, surety bail bond, TPA, reinsurance intermediaries',
      'Mailing list: https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc',
    ],
    notes: 'Staging odi_producers.license_types and qualifications are empty for all 5,306 rows. Official class exists at ODI but was not imported. Remain UNKNOWN_PENDING_CLASSIFICATION. Do not infer class from legal name.',
  },
  NV: {
    regulator: 'Nevada Division of Insurance',
    citations: [
      'NRS 683A (producers of insurance; business organization license; DRLP)',
      'NRS 684A (adjusters)',
      'NRS 690C (service contracts)',
      'NRS 696A (motor clubs)',
      'https://doi.nv.gov/Licensing/',
    ],
    notes: 'Firm-by-license-type export has 33 firm types. NPN column is absent from current extract: role may be classified; identity remains provisional.',
  },
  VT: {
    regulator: 'Vermont Department of Financial Regulation',
    citations: [
      '8 V.S.A. insurance producer licensing',
      'DFR quarterly licensee list (license class + NPN)',
    ],
    notes: 'Insurance Producer is core. Limited Lines Producer and Portable Electronics are ancillary. One adjuster class observed.',
  },
  MS: {
    regulator: 'Mississippi Insurance Department',
    citations: [
      'MID Insurance Producer Entity listing',
      'Business-entity producer license with DRLP; one entity license covers locations',
    ],
    notes: 'All 10,643 staged rows are Insurance Producer Entity. NPN is absent from current extract: role classified as core; identity remains provisional.',
  },
};

export function pickPrimaryProductClass(classes: ProductClass[]): ProductClass {
  const set = new Set(classes);
  for (const p of ENTITY_PRODUCT_PRIORITY) {
    if (set.has(p)) return p;
  }
  return 'unknown';
}

export function strongestConfidence(
  values: Array<'CONFIRMED' | 'HIGH_CONFIDENCE' | 'REVIEW_REQUIRED' | 'UNRESOLVED'>
): 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'REVIEW_REQUIRED' | 'UNRESOLVED' {
  if (values.includes('UNRESOLVED')) return 'UNRESOLVED';
  if (values.includes('REVIEW_REQUIRED')) return 'REVIEW_REQUIRED';
  if (values.includes('HIGH_CONFIDENCE')) return 'HIGH_CONFIDENCE';
  if (values.includes('CONFIRMED')) return 'CONFIRMED';
  return 'UNRESOLVED';
}

/** Core-eligibility confidence: unknown/review never silently promote to core. */
export function coreEligibleFromMatches(
  matches: Array<{ coreAgencyEligible: boolean; confidence: string; productClass: ProductClass }>
): boolean {
  return matches.some(
    (m) =>
      m.coreAgencyEligible &&
      m.productClass === 'core_agency' &&
      (m.confidence === 'CONFIRMED' || m.confidence === 'HIGH_CONFIDENCE')
  );
}
