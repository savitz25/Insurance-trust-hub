/**
 * ASK-SEARCH-INSURANCE-001.1 — discovery legitimacy gate.
 *
 * Fail-closed consumer-facing insurance entity check.
 * Uses existing public providers fields only (name, specialties, license type).
 * Name patterns are QA signals combined with missing insurance-name evidence —
 * never the sole gate without that pairing.
 *
 * Does not mutate the providers table.
 */

import type { Provider as DbProvider } from '@/types/supabase';
import { extractDbaFromName } from '@/lib/dfs/agency-display';

/** Positive insurance-business name tokens (aligned with places-fp-gate). */
export const INSURANCE_NAME_RE =
  /\b(insurance|assurance|ins\.?|agency|agencies|broker|brokers|underwrit\w*|adjusters?|adjusting|public\s+adjust\w*|risk|benefits|medicare|medicaid|annuit\w*|surety|p\s*&\s*c|property\s*(?:and|&)\s*casualty|financial\s+services|fin\.?\s*services)\b/i;

/**
 * Incidental primary-business name patterns (QA).
 * Source: lib/enrichment/places-fp-gate.ts dealer/realty/contractor/bank signals,
 * plus common medical/employer tokens observed in DOI business inventories.
 */
export const INCIDENTAL_PRIMARY_BUSINESS_RE =
  /\b(bmw|mercedes|toyota|honda|ford|chevrolet|chevy|nissan|hyundai|kia|volkswagen|vw\b|lexus|acura|infiniti|audi|porsche|subaru|mazda|dodge|chrysler|jeep|ram\b|buick|gmc\b|cadillac|autonation|motors?\b|motorcars?|auto\s*group|automotive|car\s*deal|dealership|motorcycle|harley|realty|real\s*estate|realtor|re\/max|remax|keller\s*williams|coldwell|sotheby|century\s*21|property\s*management|air\s*conditioning|hvac|heating|cooling|roofing|plumbing|electric(?:al)?|contractor|construction|remodel|pest\s*control|landscap|hospital|clinic|medical\s*(?:center|group|associates)|dental|orthop(?:a)?edic|chiropract|pharmacy|supermarket|grocery|restaurant|hotel|motel|university|school\s*district|credit\s*union|bancorp|savings\s*and\s*loan)\b/i;

/** Captive / carrier-local agency names — still legitimate for discovery. */
export const CARRIER_LOCAL_AGENCY_RE =
  /\b(state\s*farm|allstate|farmers|nationwide|progressive|geico|liberty\s*mutual|american\s*family|erie\s*insurance|auto[- ]?owners)\b/i;

const CONSUMER_AGENCY_SPECIALTIES = new Set([
  'Agency',
  'Independent Agency',
  'Property & Casualty',
  'Personal Lines',
  'Health',
  'Life',
]);

const TITLE_SPECIALTY = 'Title';
const ADJUSTER_SPECIALTY = 'Public Adjuster';

export type LegitimacyBucket =
  | 'CLEAR_INSURANCE_AGENCY_OR_BROKERAGE'
  | 'INSURANCE_RELATED_BUT_AMBIGUOUS'
  | 'INCIDENTAL_LICENSE_HOLDER'
  | 'NON_INSURANCE_BUSINESS'
  | 'TITLE_OR_ADJUSTER_ONLY'
  | 'INSUFFICIENT_EVIDENCE';

export type LegitimacyDecision = {
  ok: boolean;
  bucket: LegitimacyBucket;
  reason:
    | null
    | 'incidental_license_holder'
    | 'title_or_adjuster_only'
    | 'unsupported_license_class'
    | 'insufficient_insurance_business_evidence';
  signals: string[];
};

function licenseTypeBlob(row: DbProvider): string {
  const parts: string[] = [];
  for (const lic of row.license_info?.licenses ?? []) {
    if (lic.type) parts.push(lic.type);
    if (lic.notes) parts.push(lic.notes);
  }
  return parts.join(' | ');
}

function specialtySet(row: DbProvider): Set<string> {
  return new Set((row.specialties ?? []).map((s) => String(s).trim()).filter(Boolean));
}

function hasConsumerAgencySpecialty(specs: Set<string>): boolean {
  for (const s of specs) {
    if (CONSUMER_AGENCY_SPECIALTIES.has(s)) return true;
  }
  return false;
}

function isTitleOrAdjusterOnly(specs: Set<string>): boolean {
  if (specs.size === 0) return false;
  const relevant = [...specs].filter(
    (s) =>
      s === TITLE_SPECIALTY ||
      s === ADJUSTER_SPECIALTY ||
      CONSUMER_AGENCY_SPECIALTIES.has(s)
  );
  if (relevant.length === 0) return false;
  const hasConsumer = relevant.some((s) => CONSUMER_AGENCY_SPECIALTIES.has(s));
  const hasTitleOrAdj = relevant.some(
    (s) => s === TITLE_SPECIALTY || s === ADJUSTER_SPECIALTY
  );
  return hasTitleOrAdj && !hasConsumer;
}

function excludedLicenseClass(blob: string): boolean {
  if (!blob.trim()) return false;
  // Warranty / title-firm / adjuster / TPA / insurer classes are not
  // consumer-facing insurance agencies for Ask Universal Search.
  return /(?:automobile\s*warranty|auto\s*warranty|home\s*warranty|motor\s*vehicle\s*damage|vehicle\s*service\s*contract|title\s*ins(?:urance)?\s*agency|title\s*agency|escrow\s*only|public\s*adjust|third\s*party\s*admin|\btpa\b|reinsur|surplus\s*lines\s*insurer|(?:^|[^a-z])insurer(?:[^a-z]|$)|appraiser)/i.test(
    blob
  );
}

/**
 * Display / DBA name used for insurance-vs-incidental signals.
 * Prefer DBA when present (DFS often stores LEGAL DBA TRADE).
 */
export function legitimacyDisplayName(name: string): string {
  const { dba, legalName } = extractDbaFromName(name || '');
  if (dba) return dba;
  return legalName || name || '';
}

export function hasInsuranceNameEvidence(name: string): boolean {
  const display = legitimacyDisplayName(name);
  const full = name || '';
  return (
    INSURANCE_NAME_RE.test(display) ||
    INSURANCE_NAME_RE.test(full) ||
    CARRIER_LOCAL_AGENCY_RE.test(display) ||
    CARRIER_LOCAL_AGENCY_RE.test(full)
  );
}

export function hasIncidentalPrimaryBusinessName(name: string): boolean {
  const display = legitimacyDisplayName(name);
  const full = name || '';
  return INCIDENTAL_PRIMARY_BUSINESS_RE.test(display) || INCIDENTAL_PRIMARY_BUSINESS_RE.test(full);
}

/**
 * Evaluate whether a verified provider is a defensible consumer-facing
 * insurance agency/brokerage for Ask Universal Search discovery.
 */
export function evaluateDiscoveryLegitimacy(row: DbProvider): LegitimacyDecision {
  const signals: string[] = [];
  const name = row.name || '';
  const display = legitimacyDisplayName(name);
  const specs = specialtySet(row);
  const licBlob = licenseTypeBlob(row);
  const insuranceName = hasInsuranceNameEvidence(name);
  const incidentalName = hasIncidentalPrimaryBusinessName(name);
  const consumerSpec = hasConsumerAgencySpecialty(specs);

  if (insuranceName) signals.push('insurance_name');
  if (incidentalName) signals.push('incidental_primary_business_name');
  if (consumerSpec) signals.push('consumer_agency_specialty');
  if (specs.has(TITLE_SPECIALTY)) signals.push('title_specialty');
  if (specs.has(ADJUSTER_SPECIALTY)) signals.push('public_adjuster_specialty');

  if (isTitleOrAdjusterOnly(specs)) {
    return {
      ok: false,
      bucket: 'TITLE_OR_ADJUSTER_ONLY',
      reason: 'title_or_adjuster_only',
      signals,
    };
  }

  if (excludedLicenseClass(licBlob)) {
    signals.push('excluded_license_class_text');
    // Automobile/home warranty firms are licensed incidental sellers, not
    // general insurance agencies — even when DFS stamped Agency specialties.
    const warrantyOrTitle = /warranty|title\s*ins|title\s*agency|escrow|adjust/i.test(
      licBlob
    );
    return {
      ok: false,
      bucket: warrantyOrTitle
        ? /title|escrow|adjust/i.test(licBlob)
          ? 'TITLE_OR_ADJUSTER_ONLY'
          : 'INCIDENTAL_LICENSE_HOLDER'
        : 'NON_INSURANCE_BUSINESS',
      reason: warrantyOrTitle
        ? /title|escrow|adjust/i.test(licBlob)
          ? 'title_or_adjuster_only'
          : 'incidental_license_holder'
        : 'unsupported_license_class',
      signals,
    };
  }

  // Incidental license holders: primary business name is non-insurance AND
  // the display/legal name lacks insurance-agency tokens. Specialty tags alone
  // are insufficient because DFS promote stamps Agency/Independent Agency on
  // every business entity.
  if (incidentalName && !insuranceName) {
    return {
      ok: false,
      bucket: 'INCIDENTAL_LICENSE_HOLDER',
      reason: 'incidental_license_holder',
      signals,
    };
  }

  if (insuranceName || (consumerSpec && !incidentalName)) {
    return {
      ok: true,
      bucket: insuranceName
        ? 'CLEAR_INSURANCE_AGENCY_OR_BROKERAGE'
        : 'INSURANCE_RELATED_BUT_AMBIGUOUS',
      reason: null,
      signals,
    };
  }

  // No insurance name and no clear specialty → insufficient for Ask discovery
  if (!consumerSpec) {
    return {
      ok: false,
      bucket: 'INSUFFICIENT_EVIDENCE',
      reason: 'insufficient_insurance_business_evidence',
      signals,
    };
  }

  // consumerSpec but somehow reached here with incidental cleared
  return {
    ok: true,
    bucket: 'INSURANCE_RELATED_BUT_AMBIGUOUS',
    reason: null,
    signals,
  };
}

/** Deterministic sample indices into a sorted id list. */
export function deterministicSampleIndexes(length: number, sampleSize: number): number[] {
  if (length <= 0) return [];
  const n = Math.min(sampleSize, length);
  if (n === length) return Array.from({ length }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.floor((i * length) / n));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}
