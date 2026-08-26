/**
 * Versioned classification registry.
 * Key: jurisdiction + sourceDataset + normalized raw type.
 * Overlay only — never rewrite source license_class / TYCL / license_type.
 */

import type { LicenseNamespace } from '../credential-namespace';
import {
  CLASSIFICATION_REGISTRY_VERSION,
  type ClassificationConfidence,
  type ClassificationEntry,
  type DenominatorEligibility,
  type InsuranceRole,
  type ProductClass,
} from './types';

export function normalizeRawType(raw: string | null | undefined): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function registryLookupKey(
  jurisdiction: string,
  sourceDataset: string,
  rawType: string | null | undefined
): string {
  return [
    String(jurisdiction || '').trim().toUpperCase().slice(0, 2),
    String(sourceDataset || '').trim().toLowerCase(),
    normalizeRawType(rawType),
  ].join('|');
}

type Spec = {
  ns: LicenseNamespace;
  role: InsuranceRole;
  product: ProductClass;
  elig: DenominatorEligibility;
  core: boolean;
  conf: ClassificationConfidence;
  source: string;
  notes: string;
};

const REGISTRY = new Map<string, ClassificationEntry>();

function put(
  jurisdiction: string,
  sourceDataset: string,
  rawTypes: string[],
  spec: Spec
): void {
  for (const raw of rawTypes) {
    const rawTypeNormalized = normalizeRawType(raw);
    const key = registryLookupKey(jurisdiction, sourceDataset, raw);
    const entry: ClassificationEntry = {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      jurisdiction,
      sourceDataset,
      rawTypeNormalized,
      licenseNamespace: spec.ns,
      insuranceRole: spec.role,
      productClass: spec.product,
      denominatorEligibility: spec.elig,
      coreAgencyEligible: spec.core,
      confidence: spec.conf,
      officialSource: spec.source,
      notes: spec.notes,
    };
    REGISTRY.set(key, entry);
  }
}

const FL_SRC = 'florida_dfs';
const TX_SRC = 'texas_tdi';
const OH_SRC = 'ohio_odi';
const NV_SRC = 'nevada_doi';
const VT_SRC = 'vermont_dfr';
const MS_SRC = 'mississippi_mid';

put('FL', FL_SRC, ['AGENCY LICENSE'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'CONFIRMED',
  source: 'Fla. Stat. 626.015, 626.112; DFS Agency License / insurance agency business location',
  notes: 'Retail insurance agency location for general lines, life, or health agents.',
});

put('FL', FL_SRC, ['MANAGING GENERAL AGENT'], {
  ns: 'producer',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Fla. Stat. 626.015(16) managing general agent',
  notes: 'Wholesale/MGA is specialty, not the core retail-agency denominator.',
});

put('FL', FL_SRC, ['REINSURANCE INTERMEDIARY BROKER', 'REINSURANCE INTERMEDIARY MANAGER'], {
  ns: 'other',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'Fla. Stat. 626.7492 reinsurance intermediaries',
  notes: 'Reinsurance intermediary is specialty wholesale, not a consumer retail agency.',
});

put(
  'FL',
  FL_SRC,
  [
    'PORTABLE ELECTRONICS OR EYEWEAR - AGENT',
    'NON-RES PORTABLE ELECTRONICS OR EYEWEAR - AGENT',
    'PORTABLE ELECTRONICS OR EYEWEAR LEAD - AGENT',
    'NON-RES PORTABLE ELECTRONICS OR EYEWEAR LEAD-AGENT',
    'IN-TRANSIT & STORAGE PERS PROP',
    'CREDIT',
    'NONRESIDENT CREDIT INSURANCE AGENT',
    'RESIDENT TRAVEL INSURANCE',
    'NON-RESIDENT TRAVEL INSURANCE',
    'RESIDENT MOTOR VEHICLE RENTAL',
    'NON RESIDENT MOTOR VEHICLE RENTAL',
  ],
  {
    ns: 'limited_lines',
    role: 'ancillary_distributor',
    product: 'ancillary_distribution',
    elig: 'ancillary_only',
    core: false,
    conf: 'CONFIRMED',
    source: 'Fla. Stat. 626.321 limited licenses and registration',
    notes: 'Limited-line retail/vendor licenses. Store kiosks are locations, not core agencies.',
  }
);

put('FL', FL_SRC, ['SERVICE WARRANTY', 'AUTOMOBILE WARRANTY', 'HOME WARRANTY'], {
  ns: 'warranty',
  role: 'warranty_association',
  product: 'warranty_service',
  elig: 'warranty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Fla. Stat. ch. 634 warranty associations / service warranty',
  notes: 'Warranty associations are not insurance agencies.',
});

put('FL', FL_SRC, ['TITLE INS AGENCY - CORP OR FIRM', 'NONRESIDENT TITLE AGENCY'], {
  ns: 'title',
  role: 'title_agency',
  product: 'title',
  elig: 'title_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Fla. Stat. 626.8417 et seq. title agencies',
  notes: 'Title agencies are retained as a specialty class, not core P&C/life agencies.',
});

put('FL', FL_SRC, ['PUBLIC ADJUSTING FIRM', 'INDEPENDENT ADJUSTING FIRM'], {
  ns: 'adjuster',
  role: 'claims_adjuster',
  product: 'claims_service',
  elig: 'claims_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Fla. Stat. 626.854 public adjuster; 626.8548 all-lines adjuster; 626.112 adjusting firms',
  notes: 'Adjusting firms are claims service, not producer agencies.',
});

put('FL', FL_SRC, ['BAIL BOND AGENCY LICENSE'], {
  ns: 'bail_bond',
  role: 'bail_agency',
  product: 'bail',
  elig: 'bail_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Fla. Stat. ch. 648 bail bond agents and agencies',
  notes: 'Bail is retained but never core-agency denominator.',
});

put('TX', TX_SRC, ['General Lines Agency', 'Life Agency', 'Pers Lines Prop and Cas Agency'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'CONFIRMED',
  source: 'TDI agency license classes; NIPR TX General Lines / Life / Personal Lines P&C; TIC 4051/4054',
  notes: 'Core Texas producer agencies.',
});

put('TX', TX_SRC, ['County Mutual Agency', 'LI Agy Not Exceeding $25,000'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'HIGH_CONFIDENCE',
  source: 'TDI county mutual / small life agency classes',
  notes: 'Still producer-agency distribution; high confidence pending any TDI glossary caveat.',
});

put('TX', TX_SRC, ['Surplus Lines Agency', 'Managing General Agency', 'Specialty Insurance Agency'], {
  ns: 'surplus_lines',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'TDI surplus lines / MGA / specialty insurance agency classes; TIC 981 / 4053',
  notes: 'Specialty Insurance Agency is a distinct TDI class, not General Lines. Surplus namespace used for surplus; MGA/specialty share specialty product class.',
});

put('TX', TX_SRC, ['Managing General Agency'], {
  ns: 'producer',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'TDI Managing General Agency; TIC MGA provisions',
  notes: 'MGA is specialty wholesale.',
});

put('TX', TX_SRC, ['Reinsurance Broker', 'Reinsurance Manager', 'Risk Manager Agency'], {
  ns: 'other',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'TDI reinsurance intermediary / risk manager agency classes',
  notes: 'Not consumer retail agencies.',
});

put('TX', TX_SRC, ['Life Stlmnt Broker', 'Life Stlmnt Provider', 'Life Stlmnt LE Estimator'], {
  ns: 'other',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'TDI life settlement license classes',
  notes: 'Life/viatical settlement is specialty, not a core insurance agency.',
});

put('TX', TX_SRC, ['Limited Lines Agency', 'Pre-Need Agency'], {
  ns: 'limited_lines',
  role: 'ancillary_distributor',
  product: 'ancillary_distribution',
  elig: 'ancillary_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'TDI Limited Lines Agency; TIC 4055; pre-need funeral insurance agency',
  notes: 'Limited lines and pre-need are ancillary distribution.',
});

put('TX', TX_SRC, ['Title Agency', 'Title Direct Operations'], {
  ns: 'title',
  role: 'title_agency',
  product: 'title',
  elig: 'title_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'TDI title agencies and direct operations; TIC 2651',
  notes: 'Title is a specialty class.',
});

put('TX', TX_SRC, ['Adjuster', 'Public Insurance Adjuster'], {
  ns: 'adjuster',
  role: 'claims_adjuster',
  product: 'claims_service',
  elig: 'claims_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'TDI adjuster / public insurance adjuster; TIC 4101; 28 TAC 19.602',
  notes: 'Adjusters are claims service, not producer agencies.',
});

put('TX', TX_SRC, ['Discount Hthcare Prgm Oper Reg'], {
  ns: 'other',
  role: 'unknown',
  product: 'out_of_scope',
  elig: 'out_of_scope',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'TDI discount health care program operator registration',
  notes: 'Discount health programs are not insurance agencies.',
});

put('OH', OH_SRC, [''], {
  ns: 'other',
  role: 'unknown',
  product: 'unknown',
  elig: 'unknown_pending_classification',
  core: false,
  conf: 'UNRESOLVED',
  source: 'ODI business-entity mailing list; empty class when no per-type report joined',
  notes: 'Empty Ohio class remains unknown. Do not assume major-lines. Do not infer from legal name or from FL/TX/VT class.',
});

put('OH', OH_SRC, ['Major Lines'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type “Major Lines”; https://insurance.ohio.gov/agents-and-agencies/business-entity/major-lines--business-entity; ORC 3905.06',
  notes: 'Ordinary producer business entity. LOAs (life, A&H, property, casualty, personal, variable) are qualifications, not a different agency class.',
});

put(
  'OH',
  OH_SRC,
  [
    'Limited Lines',
    'Limited Lines Portable Electronics',
    'Limited Lines Self-Service Storage',
  ],
  {
    ns: 'limited_lines',
    role: 'ancillary_distributor',
    product: 'ancillary_distribution',
    elig: 'ancillary_only',
    core: false,
    conf: 'CONFIRMED',
    source: 'ODI mailing-list Licensing Type limited-lines family; https://insurance.ohio.gov/agents-and-agencies/business-entity/limited-lines-business-entity; OAC 3901-5-09',
    notes: 'Credit, crop, funeral, portable electronics, rental car, self-service storage, travel. Not core agencies.',
  }
);

put('OH', OH_SRC, ['Managing General Agent'], {
  ns: 'producer',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type “Managing General Agent”; INS3250 MGA application',
  notes: 'MGA is specialty wholesale, not the core retail-agency denominator.',
});

put('OH', OH_SRC, ['Surplus Lines'], {
  ns: 'surplus_lines',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type “Surplus Lines”; ODI surplus lines business-entity page',
  notes: 'Surplus lines specialty.',
});

put('OH', OH_SRC, ['Title', 'Title Insurance Marketing Rep'], {
  ns: 'title',
  role: 'title_agency',
  product: 'title',
  elig: 'title_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type Title / Title Insurance Marketing Rep',
  notes: 'Title is a specialty class, not a core P&C/life agency.',
});

put('OH', OH_SRC, ['Surety Bail Bond'], {
  ns: 'bail_bond',
  role: 'bail_agency',
  product: 'bail',
  elig: 'bail_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type “Surety Bail Bond”; ODI surety bail bond business-entity page',
  notes: 'Bail is retained but never core-agency denominator.',
});

put('OH', OH_SRC, ['Public Insurance Adjuster', 'Public Insurance Adjuster Agent'], {
  ns: 'adjuster',
  role: 'claims_adjuster',
  product: 'claims_service',
  elig: 'claims_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type public insurance adjuster; NIPR Ohio public insurance adjuster',
  notes: 'Claims service, not a producer agency.',
});

put('OH', OH_SRC, ['Third Party Administrator'], {
  ns: 'tpa',
  role: 'tpa',
  product: 'tpa',
  elig: 'tpa_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type “Third Party Administrator”',
  notes: 'TPA is administration, not a retail agency.',
});

put(
  'OH',
  OH_SRC,
  ['Reinsurance Intermediary Broker', 'Reinsurance Intermediary Manager', 'Viatical Settlement Broker'],
  {
    ns: 'other',
    role: 'specialty_producer',
    product: 'specialty_insurance',
    elig: 'specialty_only',
    core: false,
    conf: 'CONFIRMED',
    source: 'ODI mailing-list Licensing Types for reinsurance intermediaries and viatical settlement brokers',
    notes: 'Specialty wholesale / life settlement. Not core retail agencies.',
  }
);

put('OH', OH_SRC, ['Navigator'], {
  ns: 'other',
  role: 'unknown',
  product: 'out_of_scope',
  elig: 'out_of_scope',
  core: false,
  conf: 'CONFIRMED',
  source: 'ODI mailing-list Licensing Type “Navigator”',
  notes: 'ACA navigator is not an insurance agency.',
});

put('OH', OH_SRC, ['Temporary'], {
  ns: 'other',
  role: 'unknown',
  product: 'unknown',
  elig: 'unknown_pending_classification',
  core: false,
  conf: 'REVIEW_REQUIRED',
  source: 'ODI mailing-list Licensing Type “Temporary”',
  notes: 'Temporary licenses are not confirmed core agencies.',
});

put('NV', NV_SRC, ['Resident Producer Firm', 'Non-Resident Producer Firm'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'CONFIRMED',
  source: 'NRS 683A producer of insurance; business organization license; DRLP',
  notes: 'Role is core producer firm. Current extract has no NPN: identity stays provisional.',
});

put('NV', NV_SRC, ['Resident Surplus Lines Broker', 'Non-Resident Surplus Lines Broker'], {
  ns: 'surplus_lines',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'NRS surplus lines broker firm types',
  notes: 'Specialty, not core retail agency.',
});

put('NV', NV_SRC, ['Resident Managing General Agency', 'Non-Resident Managing General Agency'], {
  ns: 'producer',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Nevada MGA firm license types',
  notes: 'MGA is specialty wholesale.',
});

put('NV', NV_SRC, ['Resident Insurance Consultant'], {
  ns: 'producer',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'Nevada insurance consultant firm type',
  notes: 'Consultant is advisory specialty, not a retail agency.',
});

put(
  'NV',
  NV_SRC,
  [
    'Non-Resident Reinsurance Intermediary Broker',
    'Resident Reinsurance Intermediary Broker',
    'Non-Resident Reinsurance Intermediary Manager',
    'Resident Reinsurance Intermediary Manager',
    'Non-Resident Provider of Viatical Settlements',
    'Resident Provider of Viatical Settlements',
    'Non-Resident Broker of Viatical Settlements',
  ],
  {
    ns: 'other',
    role: 'specialty_producer',
    product: 'specialty_insurance',
    elig: 'specialty_only',
    core: false,
    conf: 'HIGH_CONFIDENCE',
    source: 'Nevada reinsurance intermediary / viatical firm types',
    notes: 'Specialty wholesale / life settlement.',
  }
);

put('NV', NV_SRC, ['Resident Title Agency', 'Non-Resident Title Agency', 'Non-Resident Title Plant'], {
  ns: 'title',
  role: 'title_agency',
  product: 'title',
  elig: 'title_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Nevada title agency / title plant firm types',
  notes: 'Title specialty.',
});

put(
  'NV',
  NV_SRC,
  [
    'Independent Adjuster',
    'Public Adjuster',
    'Resident Motor Vehicle Damage Appraiser',
    'Non Resident Motor Vehicle Damage Appraiser',
    'External Review Organization',
  ],
  {
    ns: 'adjuster',
    role: 'claims_adjuster',
    product: 'claims_service',
    elig: 'claims_only',
    core: false,
    conf: 'CONFIRMED',
    source: 'NRS 684A adjusters; Nevada appraiser / external review firm types',
    notes: 'Claims service, not producer agency.',
  }
);

put(
  'NV',
  NV_SRC,
  [
    'Resident Third Party Administrator',
    'Non-Resident Third Party Administrator',
    'Utilization Review',
  ],
  {
    ns: 'tpa',
    role: 'tpa',
    product: 'tpa',
    elig: 'tpa_only',
    core: false,
    conf: 'CONFIRMED',
    source: 'NRS 683A TPA certificate; utilization review',
    notes: 'TPA / UR are administration, not retail agencies.',
  }
);

put('NV', NV_SRC, ['Service Contract Provider'], {
  ns: 'warranty',
  role: 'warranty_association',
  product: 'warranty_service',
  elig: 'warranty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'NRS 690C service contracts',
  notes: 'Service-contract providers are warranty, not insurance agencies.',
});

put('NV', NV_SRC, ['Resident Bail Agency', 'Non-Resident General Agency for Bail'], {
  ns: 'bail_bond',
  role: 'bail_agency',
  product: 'bail',
  elig: 'bail_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Nevada bail agency firm types',
  notes: 'Bail is retained separately.',
});

put('NV', NV_SRC, ['Resident Motor Club Agency', 'Non-Resident Motor Club Agency'], {
  ns: 'other',
  role: 'ancillary_distributor',
  product: 'ancillary_distribution',
  elig: 'ancillary_only',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'NRS 696A motor clubs',
  notes: 'Motor clubs are not producer firms.',
});

put(
  'NV',
  NV_SRC,
  ['Resident Funeral Seller', 'Non-Resident Funeral Seller', 'Resident Cemetery Seller'],
  {
    ns: 'other',
    role: 'unknown',
    product: 'out_of_scope',
    elig: 'out_of_scope',
    core: false,
    conf: 'HIGH_CONFIDENCE',
    source: 'Nevada funeral / cemetery seller firm types',
    notes: 'Out of insurance-agency scope.',
  }
);

put('VT', VT_SRC, ['Insurance Producer'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'CONFIRMED',
  source: 'Vermont DFR Insurance Producer license class; 8 V.S.A. producer licensing',
  notes: 'Core producer. Business-entity vs individual is a separate entity-kind question.',
});

put('VT', VT_SRC, ['Limited Lines Producer', 'Portable Electronics'], {
  ns: 'limited_lines',
  role: 'ancillary_distributor',
  product: 'ancillary_distribution',
  elig: 'ancillary_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Vermont DFR limited lines / portable electronics classes',
  notes: 'Limited lines are ancillary.',
});

put('VT', VT_SRC, ['Adjuster-Property and Casualty'], {
  ns: 'adjuster',
  role: 'claims_adjuster',
  product: 'claims_service',
  elig: 'claims_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'Vermont DFR adjuster class',
  notes: 'Claims service.',
});

put('MS', MS_SRC, ['Insurance Producer Entity'], {
  ns: 'producer',
  role: 'core_producer_agency',
  product: 'core_agency',
  elig: 'core_agency_eligible',
  core: true,
  conf: 'CONFIRMED',
  source: 'Mississippi Insurance Department Insurance Producer Entity listing',
  notes: 'Role is core producer entity. Current extract has no NPN: identity stays provisional.',
});

/** Surplus Lines Agency should keep surplus namespace; rewrite after the grouped put. */
put('TX', TX_SRC, ['Surplus Lines Agency'], {
  ns: 'surplus_lines',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'CONFIRMED',
  source: 'TDI Surplus Lines Agency; TIC 981',
  notes: 'Surplus lines specialty.',
});

put('TX', TX_SRC, ['Specialty Insurance Agency'], {
  ns: 'limited_lines',
  role: 'specialty_producer',
  product: 'specialty_insurance',
  elig: 'specialty_only',
  core: false,
  conf: 'HIGH_CONFIDENCE',
  source: 'TDI Specialty Insurance Agency class (distinct from General Lines)',
  notes: 'Not treated as core general-lines agency.',
});

function unknownEntry(
  jurisdiction: string,
  sourceDataset: string,
  rawTypeNormalized: string,
  confidence: ClassificationConfidence,
  notes: string
): ClassificationEntry {
  return {
    registryVersion: CLASSIFICATION_REGISTRY_VERSION,
    jurisdiction,
    sourceDataset,
    rawTypeNormalized,
    licenseNamespace: 'other',
    insuranceRole: 'unknown',
    productClass: 'unknown',
    denominatorEligibility: 'unknown_pending_classification',
    coreAgencyEligible: false,
    confidence,
    officialSource: 'unmapped raw type; retain evidence, do not assume core agency',
    notes,
  };
}

/**
 * Heuristic fallback for unexpected raw strings.
 * Never used to fill empty Ohio classes. Never CONFIRMED.
 */
export function heuristicClassify(rawTypeNormalized: string): Omit<
  ClassificationEntry,
  'jurisdiction' | 'sourceDataset' | 'rawTypeNormalized'
> | null {
  const t = rawTypeNormalized;
  if (!t) return null;
  if (/BAIL/.test(t)) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'bail_bond',
      insuranceRole: 'bail_agency',
      productClass: 'bail',
      denominatorEligibility: 'bail_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: bail in raw type',
      notes: 'Heuristic only. Not used for empty Ohio rows.',
    };
  }
  if (/ADJUST/.test(t)) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'adjuster',
      insuranceRole: 'claims_adjuster',
      productClass: 'claims_service',
      denominatorEligibility: 'claims_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: adjuster in raw type',
      notes: 'Heuristic only.',
    };
  }
  if (/WARRANT|SERVICE CONTRACT/.test(t)) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'warranty',
      insuranceRole: 'warranty_association',
      productClass: 'warranty_service',
      denominatorEligibility: 'warranty_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: warranty/service contract in raw type',
      notes: 'Heuristic only.',
    };
  }
  if (/\bTITLE\b/.test(t)) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'title',
      insuranceRole: 'title_agency',
      productClass: 'title',
      denominatorEligibility: 'title_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: title in raw type',
      notes: 'Heuristic only.',
    };
  }
  if (/\bTPA\b|THIRD PARTY ADMIN|UTILIZATION REVIEW/.test(t)) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'tpa',
      insuranceRole: 'tpa',
      productClass: 'tpa',
      denominatorEligibility: 'tpa_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: TPA/UR in raw type',
      notes: 'Heuristic only.',
    };
  }
  if (
    /PORTABLE ELECTRONICS|TRAVEL INSURANCE|MOTOR VEHICLE RENTAL|LIMITED LINES|IN-TRANSIT|CREDIT INSURANCE/.test(
      t
    )
  ) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'limited_lines',
      insuranceRole: 'ancillary_distributor',
      productClass: 'ancillary_distribution',
      denominatorEligibility: 'ancillary_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: limited lines in raw type',
      notes: 'Heuristic only.',
    };
  }
  if (/SURPLUS/.test(t)) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'surplus_lines',
      insuranceRole: 'specialty_producer',
      productClass: 'specialty_insurance',
      denominatorEligibility: 'specialty_only',
      coreAgencyEligible: false,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: surplus in raw type',
      notes: 'Heuristic only.',
    };
  }
  if (
    /AGENCY LICENSE|GENERAL LINES|LIFE AGENCY|PERSONAL LINES|PRODUCER FIRM|INSURANCE PRODUCER|PRODUCER ENTITY/.test(
      t
    )
  ) {
    return {
      registryVersion: CLASSIFICATION_REGISTRY_VERSION,
      licenseNamespace: 'producer',
      insuranceRole: 'core_producer_agency',
      productClass: 'core_agency',
      denominatorEligibility: 'core_agency_eligible',
      coreAgencyEligible: true,
      confidence: 'HIGH_CONFIDENCE',
      officialSource: 'heuristic: core producer/agency phrasing in raw type',
      notes: 'Heuristic only. Never applied to empty Ohio class.',
    };
  }
  return null;
}

export function lookupClassification(input: {
  jurisdiction: string;
  sourceDataset: string;
  rawType: string | null | undefined;
}): ClassificationEntry {
  const jurisdiction = String(input.jurisdiction || '').trim().toUpperCase().slice(0, 2);
  const sourceDataset = String(input.sourceDataset || '').trim().toLowerCase();
  const rawTypeNormalized = normalizeRawType(input.rawType);
  const exact = REGISTRY.get(registryLookupKey(jurisdiction, sourceDataset, rawTypeNormalized));
  if (exact) return exact;

  const ohioEmpty = jurisdiction === 'OH' && sourceDataset === OH_SRC && !rawTypeNormalized;
  if (ohioEmpty) {
    return lookupClassification({
      jurisdiction: 'OH',
      sourceDataset: OH_SRC,
      rawType: '',
    });
  }

  if (jurisdiction === 'OH' && !rawTypeNormalized) {
    return unknownEntry(
      jurisdiction,
      sourceDataset,
      '',
      'UNRESOLVED',
      'Ohio empty class remains unknown. Name-based inference is forbidden.'
    );
  }

  const heuristic = heuristicClassify(rawTypeNormalized);
  if (heuristic && rawTypeNormalized) {
    return {
      ...heuristic,
      jurisdiction,
      sourceDataset,
      rawTypeNormalized,
    };
  }

  return unknownEntry(
    jurisdiction,
    sourceDataset,
    rawTypeNormalized,
    rawTypeNormalized ? 'REVIEW_REQUIRED' : 'UNRESOLVED',
    rawTypeNormalized
      ? 'Raw type not in registry v1.0.0; retained as unknown/review.'
      : 'Missing raw license class.'
  );
}

export function listRegistryEntries(): ClassificationEntry[] {
  return Array.from(REGISTRY.values());
}

export { REGISTRY as CLASSIFICATION_REGISTRY };
