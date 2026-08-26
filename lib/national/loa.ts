/**
 * Official lines of authority / qualifications.
 *
 * License class, LOA, appointment type, and consumer category stay separate.
 * Official regulator text is preserved; normalized family is derived only.
 * Health/Life LOA never implies Marketplace or Medicare certification.
 */

import {
  CLASSIFICATION_REGISTRY,
  registryLookupKey,
} from './classification/registry';
import { classifyLoa, type LoaCapability } from '../dfs/loa';

export const MEDICARE_INFERENCE_POLICY =
  'Health/Life LOA does not imply Medicare certification';
export const MARKETPLACE_INFERENCE_POLICY =
  'Health LOA does not imply ACA Marketplace registration';
export const APPOINTMENT_TYCL_POLICY =
  'Florida appointment TYCL is appointment type, not a line of authority';
export const CLASS_VS_LOA_POLICY =
  'License type/class is a credential fact, not an LOA observation';

export type SourceFieldRole =
  | 'CREDENTIAL_CLASS'
  | 'OFFICIAL_LOA'
  | 'APPOINTMENT_TYPE'
  | 'CONSUMER_CATEGORY'
  | 'UNKNOWN_NOT_LOA';

export type LoaNormalizedFamily =
  | 'LIFE'
  | 'HEALTH'
  | 'PROPERTY'
  | 'CASUALTY'
  | 'PROPERTY_CASUALTY'
  | 'PERSONAL_LINES'
  | 'VARIABLE'
  | 'SURPLUS'
  | 'COMMERCIAL'
  | 'TITLE'
  | 'CREDIT'
  | 'LIMITED_LINES'
  | 'OTHER_RECOGNIZED'
  | 'UNMAPPED';

export type LoaStatusToken = 'active' | 'inactive' | 'expired' | 'terminated' | 'UNKNOWN';
export type LoaCurrency = 'CURRENT' | 'HISTORICAL' | 'UNKNOWN';
export type LoaAttribution = 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'REVIEW_REQUIRED' | 'UNRESOLVED';
export type ConsumerFilterReadiness =
  | 'DIRECT_OFFICIAL_MAPPING'
  | 'DERIVED_HIGH_CONFIDENCE_MAPPING'
  | 'NOT_SUPPORTED';

export type LoaExtractInput = {
  jurisdiction: string;
  sourceDataset: string;
  licenseTypes?: string[] | null;
  qualifications?: string[] | null;
  linesOfAuthority?: string[] | null;
  appointmentType?: string | null;
  appointmentTypeDesc?: string | null;
  licenseStatus?: string | null;
  loaStatusByText?: Record<string, string | null | undefined> | null;
};

export type ExtractedLoa = {
  officialText: string;
  officialCode: string | null;
  fieldRole: 'OFFICIAL_LOA';
  families: LoaNormalizedFamily[];
  consumerGroup: string | null;
  loaStatus: LoaStatusToken;
  attribution: LoaAttribution;
};

export type SkippedLoaTerm = {
  officialText: string;
  fieldRole: SourceFieldRole;
  reason: string;
};

export type LoaExtractResult = {
  observations: ExtractedLoa[];
  skipped: SkippedLoaTerm[];
};

const DATASET_JURISDICTION: Record<string, string> = {
  florida_dfs: 'FL',
  florida_dfs_appointments: 'FL',
  texas_tdi: 'TX',
  ohio_odi: 'OH',
  vermont_dfr: 'VT',
  nevada_doi: 'NV',
  mississippi_mid: 'MS',
};

/** Fields that are appointment type, never LOA. */
const APPOINTMENT_FIELDS = new Set([
  'appointment_type',
  'appointmenttypedesc',
  'appointment_type_desc',
  'tycl',
  'license tycl',
  'appointment tycl',
]);

export function sourceFieldRole(args: {
  jurisdiction: string;
  sourceDataset: string;
  field: string;
}): SourceFieldRole {
  const jur = String(args.jurisdiction || '').trim().toUpperCase().slice(0, 2);
  const ds = String(args.sourceDataset || '').trim().toLowerCase();
  const field = String(args.field || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    ds.includes('appointment') ||
    APPOINTMENT_FIELDS.has(field) ||
    field.includes('appointment')
  ) {
    return 'APPOINTMENT_TYPE';
  }
  if (field === 'consumer_group' || field === 'consumer_category' || field === 'specialty') {
    return 'CONSUMER_CATEGORY';
  }
  if (jur === 'FL' && (field === 'lines_of_authority' || field === 'license_tycl_desc' || field === 'license_class')) {
    return 'CREDENTIAL_CLASS';
  }
  if (field === 'license_types' || field === 'license_type' || field === 'license_class' || field === 'firm_license_type') {
    return 'CREDENTIAL_CLASS';
  }
  if (field === 'qualifications' || field === 'qualification' || field === 'loa_name' || field === 'loa') {
    return 'OFFICIAL_LOA';
  }
  return 'UNKNOWN_NOT_LOA';
}

export function isRegistryCredentialClass(
  jurisdiction: string,
  sourceDataset: string,
  raw: string
): boolean {
  const text = String(raw || '').trim();
  if (!text) return false;
  const key = registryLookupKey(jurisdiction, sourceDataset, text);
  return CLASSIFICATION_REGISTRY.has(key);
}

export function normalizeLoaStatus(raw: string | null | undefined): LoaStatusToken {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'UNKNOWN';
  if (/expired|lapsed/.test(s)) return 'expired';
  if (/terminat/.test(s)) return 'terminated';
  if (/inactive|revoked|suspended|cancelled|canceled/.test(s)) return 'inactive';
  if (/^active$|^valid$|^approved$|^current$|^licensed$/.test(s)) return 'active';
  return 'UNKNOWN';
}

export function loaCurrency(status: string | null | undefined): LoaCurrency {
  const n = normalizeLoaStatus(status);
  if (n === 'expired' || n === 'inactive' || n === 'terminated') return 'HISTORICAL';
  if (n === 'active') return 'CURRENT';
  return 'UNKNOWN';
}

export function loaAppearsCurrent(status: string | null | undefined): boolean {
  return loaCurrency(status) === 'CURRENT';
}

/** Always false: CMS Marketplace participation is a separate evidence source. */
export function healthLoaImpliesMarketplace(_officialText?: string): false {
  return false;
}

/** Always false: Medicare-certified agent is a separate evidence source. */
export function healthOrLifeLoaImpliesMedicare(_officialText?: string): false {
  return false;
}

/** Always false: specialty LOA does not rewrite entity classification. */
export function loaChangesEntityClassification(): false {
  return false;
}

export function carrierAppointmentImpliesMarketplace(): false {
  return false;
}

const FAMILY_RULES: Array<{ family: LoaNormalizedFamily; re: RegExp }> = [
  { family: 'VARIABLE', re: /variable/i },
  { family: 'SURPLUS', re: /surplus/i },
  { family: 'TITLE', re: /\btitle\b/i },
  { family: 'CREDIT', re: /\bcredit\b/i },
  { family: 'COMMERCIAL', re: /commercial/i },
  { family: 'PERSONAL_LINES', re: /personal\s*lines|personal lines prop/i },
  { family: 'PROPERTY_CASUALTY', re: /property\s*(and|&)\s*casualty|p\s*&\s*c|mga\s*-?\s*p\s*&\s*c/i },
  { family: 'PROPERTY', re: /\bproperty\b/i },
  { family: 'CASUALTY', re: /\bcasualty\b/i },
  { family: 'HEALTH', re: /health|accident|sickness|disability|\bhmo\b/i },
  { family: 'LIFE', re: /\blife\b|annuit/i },
  {
    family: 'LIMITED_LINES',
    re: /limited\s*lines|travel|self-?service storage|portable electronic|rental car|pre-?need|crop/i,
  },
];

export function normalizedFamilies(officialText: string): LoaNormalizedFamily[] {
  const s = String(officialText || '').trim();
  if (!s) return [];
  if (/adjuster|underwriter/i.test(s)) return ['OTHER_RECOGNIZED'];
  const found: LoaNormalizedFamily[] = [];
  const add = (f: LoaNormalizedFamily) => {
    if (!found.includes(f)) found.push(f);
  };
  for (const rule of FAMILY_RULES) {
    if (rule.re.test(s)) add(rule.family);
  }
  if (found.includes('PROPERTY_CASUALTY')) {
    return found.filter((f) => f !== 'PROPERTY' && f !== 'CASUALTY');
  }
  if (found.includes('PROPERTY') && found.includes('CASUALTY')) {
    return ['PROPERTY_CASUALTY', ...found.filter((f) => f !== 'PROPERTY' && f !== 'CASUALTY')];
  }
  if (found.length === 0) return ['UNMAPPED'];
  return found;
}

export function consumerGroupFromFamilies(families: LoaNormalizedFamily[]): string | null {
  const usable = families.filter((f) => f !== 'UNMAPPED');
  if (!usable.length) return null;
  return usable.join(',');
}

/** Derived only — never a replacement for official_text. Graph helper; may be a single capability tag. */
export function consumerGroupFromOfficialLoa(officialText: string): string | null {
  const cap: LoaCapability = classifyLoa(officialText);
  if (cap === 'other') return null;
  return cap;
}

export function observationKey(
  credentialId: string,
  sourceDataset: string,
  officialText: string
): string {
  return `${credentialId}|${sourceDataset}|${officialText.trim().toUpperCase()}`;
}

function uniqueTerms(values: string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values || []) {
    const t = String(v || '').trim();
    if (!t) continue;
    const k = t.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function classSet(values: string[] | null | undefined): Set<string> {
  return new Set(uniqueTerms(values).map((t) => t.toUpperCase()));
}

/**
 * Extract official LOA observations from recognized source fields only.
 * Does not treat license class, appointment TYCL, or consumer tags as LOA.
 */
export function extractOfficialLoas(input: LoaExtractInput): LoaExtractResult {
  const jurisdiction = String(input.jurisdiction || '').trim().toUpperCase().slice(0, 2);
  const sourceDataset = String(input.sourceDataset || '').trim().toLowerCase();
  const observations: ExtractedLoa[] = [];
  const skipped: SkippedLoaTerm[] = [];
  const seen = new Set<string>();

  const skip = (officialText: string, fieldRole: SourceFieldRole, reason: string) => {
    const t = officialText.trim();
    if (!t) return;
    skipped.push({ officialText: t, fieldRole, reason });
  };

  const consider = (
    text: string,
    field: string,
    attributionIfLoa: LoaAttribution
  ) => {
    const officialText = text.trim();
    if (!officialText) return;
    const role = sourceFieldRole({ jurisdiction, sourceDataset, field });
    if (role === 'APPOINTMENT_TYPE') {
      skip(officialText, role, 'appointment_type_not_loa');
      return;
    }
    if (role === 'CREDENTIAL_CLASS') {
      skip(officialText, role, 'credential_class_not_loa');
      return;
    }
    if (role === 'CONSUMER_CATEGORY') {
      skip(officialText, role, 'consumer_category_not_loa');
      return;
    }
    if (role !== 'OFFICIAL_LOA') {
      skip(officialText, role, 'unrecognized_source_field');
      return;
    }
    if (classSet(input.licenseTypes).has(officialText.toUpperCase())) {
      skip(officialText, 'CREDENTIAL_CLASS', 'qualification_duplicates_license_type');
      return;
    }
    if (isRegistryCredentialClass(jurisdiction, sourceDataset, officialText)) {
      skip(officialText, 'CREDENTIAL_CLASS', 'registry_credential_class');
      return;
    }
    const k = officialText.toUpperCase();
    if (seen.has(k)) return;
    seen.add(k);
    const families = normalizedFamilies(officialText);
    const statusRaw =
      input.loaStatusByText?.[officialText] ??
      input.loaStatusByText?.[k] ??
      null;
    const loaStatus = statusRaw
      ? normalizeLoaStatus(statusRaw)
      : 'UNKNOWN';
    observations.push({
      officialText,
      officialCode: null,
      fieldRole: 'OFFICIAL_LOA',
      families,
      consumerGroup: consumerGroupFromFamilies(families),
      loaStatus,
      attribution: attributionIfLoa,
    });
  };

  for (const t of uniqueTerms(input.licenseTypes)) {
    consider(t, 'license_types', 'CONFIRMED');
  }
  for (const t of uniqueTerms(input.linesOfAuthority)) {
    consider(t, 'lines_of_authority', 'CONFIRMED');
  }
  if (input.appointmentType) consider(input.appointmentType, 'appointment_type', 'CONFIRMED');
  if (input.appointmentTypeDesc) {
    consider(input.appointmentTypeDesc, 'appointment_type_desc', 'CONFIRMED');
  }

  const loaAttribution: LoaAttribution =
    jurisdiction === 'TX' || jurisdiction === 'VT' ? 'CONFIRMED' : 'HIGH_CONFIDENCE';
  for (const t of uniqueTerms(input.qualifications)) {
    consider(t, 'qualifications', loaAttribution);
  }

  return { observations, skipped };
}

export function executeEligible(obs: ExtractedLoa): boolean {
  return obs.attribution === 'CONFIRMED' || obs.attribution === 'HIGH_CONFIDENCE';
}

export const CONSUMER_FILTER_READINESS: Record<
  string,
  { readiness: ConsumerFilterReadiness; note: string }
> = {
  Life: {
    readiness: 'DIRECT_OFFICIAL_MAPPING',
    note: 'Official Life / annuity LOA text. Jurisdiction-specific.',
  },
  Health: {
    readiness: 'DIRECT_OFFICIAL_MAPPING',
    note: 'Official Health / Accident / HMO LOA text is health authority only — not Marketplace, not Medicare.',
  },
  'Home / Property': {
    readiness: 'DERIVED_HIGH_CONFIDENCE_MAPPING',
    note: 'Derived from Property, Property and Casualty, or Personal Lines official terms. No dedicated Homeowners LOA in current extracts.',
  },
  'Auto / Casualty': {
    readiness: 'DERIVED_HIGH_CONFIDENCE_MAPPING',
    note: 'Derived from Casualty, Property and Casualty, or Personal Lines. No dedicated Auto LOA in current extracts.',
  },
  'Personal Lines': {
    readiness: 'DIRECT_OFFICIAL_MAPPING',
    note: 'Official Personal Lines qualification / LOA name.',
  },
  Commercial: {
    readiness: 'NOT_SUPPORTED',
    note: 'No dedicated Commercial official LOA term in FL/TX/OH/VT extracts.',
  },
  Variable: {
    readiness: 'DIRECT_OFFICIAL_MAPPING',
    note: 'Official Variable Life / Variable Annuity LOA text when present.',
  },
  Surplus: {
    readiness: 'DIRECT_OFFICIAL_MAPPING',
    note: 'Official surplus qualification text only — Surplus Lines Agency license class is not an LOA.',
  },
  Marketplace: {
    readiness: 'NOT_SUPPORTED',
    note: MARKETPLACE_INFERENCE_POLICY,
  },
  Medicare: {
    readiness: 'NOT_SUPPORTED',
    note: MEDICARE_INFERENCE_POLICY,
  },
};

export function datasetJurisdiction(sourceDataset: string): string | null {
  return DATASET_JURISDICTION[sourceDataset] ?? null;
}

export function preserveOfficialText(raw: string): string {
  return String(raw || '').trim();
}
