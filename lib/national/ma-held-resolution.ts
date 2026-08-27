/**
 * MA-INS-002 — authoritative entity-type resolution for held Massachusetts NPNs.
 * Exact NPN only. Name/LLC/email/phone/address never create or merge entities.
 */

import { normalizeNpn } from './npn';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from './publication';

export const MA_INS_002_GATES = {
  heldValidNpn: 2089,
  malformedNpn: 1,
  malformedNpnRaw: '9950',
  malformedSourceRow: 9138,
  sourceSha256: 'B5DBEB1DCA9B0AF88FBC041927AFF6FCD150508B9995B19BF418B25476BE48BD',
} as const;

export type OfficialEntityClass = 'BUSINESS_ENTITY' | 'INDIVIDUAL' | 'OTHER_REGULATED_ENTITY' | 'UNKNOWN';

export type TypeEvidence = {
  source: string;
  table: string;
  field: string;
  entityTypeRaw: string;
  class: OfficialEntityClass;
  sourceDate?: string | null;
  authority: string;
};

export type HeldTypeDecision =
  | {
      confidence: 'CONFIRMED';
      class: 'BUSINESS_ENTITY' | 'INDIVIDUAL';
      entityKind: 'agency' | 'person';
      reason: string;
      evidence: TypeEvidence[];
    }
  | {
      confidence: 'REVIEW_REQUIRED';
      class: 'UNKNOWN';
      reason: 'REVIEW_REQUIRED_ENTITY_TYPE_CONFLICT' | string;
      evidence: TypeEvidence[];
    }
  | {
      confidence: 'UNRESOLVED';
      class: 'UNKNOWN' | 'OTHER_REGULATED_ENTITY';
      reason: string;
      evidence: TypeEvidence[];
    };

export function nameSuffixIsAuthoritativeType(): false {
  return false;
}
export function personalLookingNameIsAuthoritativeType(): false {
  return false;
}
export function padMalformedNpn(raw: string): null {
  void raw;
  return null;
}
export function absenceFromActiveFileMeansTerminated(): false {
  return false;
}
export function ma002WorksForPredicted(): 0 {
  return 0;
}
export function resolvedPersonIsIndexable(): false {
  void PUBLIC_PERSON_PROFILES_ENABLED;
  void mayPublishEntityKind;
  return false;
}
export function newAgencyAutoIndexed(): false {
  return false;
}

export function normalizeOfficialEntityType(raw: string | null | undefined): OfficialEntityClass {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'UNKNOWN';
  if (/^(individual|person)$/.test(s)) return 'INDIVIDUAL';
  if (/^(business|agency|firm|organization|company|entity|business_entity)$/.test(s)) {
    return 'BUSINESS_ENTITY';
  }
  if (/appointment|carrier|adjuster|title|tpa/.test(s) && !/producer|agency|individual/.test(s)) {
    return 'OTHER_REGULATED_ENTITY';
  }
  return 'UNKNOWN';
}

export function decideHeldEntityType(evidence: TypeEvidence[]): HeldTypeDecision {
  const usable = evidence.filter((e) => e.class === 'BUSINESS_ENTITY' || e.class === 'INDIVIDUAL');
  const other = evidence.filter((e) => e.class === 'OTHER_REGULATED_ENTITY');
  if (!usable.length) {
    if (other.length) {
      return {
        confidence: 'UNRESOLVED',
        class: 'OTHER_REGULATED_ENTITY',
        reason: 'other_regulated_entity_no_agency_person_mapping',
        evidence,
      };
    }
    return { confidence: 'UNRESOLVED', class: 'UNKNOWN', reason: 'no_authoritative_entity_type', evidence };
  }
  const classes = new Set(usable.map((e) => e.class));
  if (classes.has('BUSINESS_ENTITY') && classes.has('INDIVIDUAL')) {
    return {
      confidence: 'REVIEW_REQUIRED',
      class: 'UNKNOWN',
      reason: 'REVIEW_REQUIRED_ENTITY_TYPE_CONFLICT',
      evidence,
    };
  }
  if (classes.has('BUSINESS_ENTITY')) {
    return {
      confidence: 'CONFIRMED',
      class: 'BUSINESS_ENTITY',
      entityKind: 'agency',
      reason: 'exact_npn_official_business_type',
      evidence: usable,
    };
  }
  return {
    confidence: 'CONFIRMED',
    class: 'INDIVIDUAL',
    entityKind: 'person',
    reason: 'exact_npn_official_individual_type',
    evidence: usable,
  };
}

/** Staging tables with an official entity_type (or business-only extract). */
export const MA002_TYPE_SOURCES: Array<{
  table: string;
  source: string;
  authority: string;
  npnColumn: string;
  typeColumn: string | 'implied_business_extract';
  extractIsBusinessOnly: boolean;
}> = [
  {
    table: 'dfs_producers',
    source: 'florida_dfs',
    authority: 'Florida DFS licensee extract entity_type',
    npnColumn: 'npn',
    typeColumn: 'entity_type',
    extractIsBusinessOnly: false,
  },
  {
    table: 'vt_producers',
    source: 'vermont_dfr',
    authority: 'Vermont DFR licensee extract entity_type',
    npnColumn: 'npn',
    typeColumn: 'entity_type',
    extractIsBusinessOnly: false,
  },
  {
    table: 'ms_producers',
    source: 'mississippi_mid',
    authority: 'Mississippi MID licensee extract entity_type',
    npnColumn: 'npn',
    typeColumn: 'entity_type',
    extractIsBusinessOnly: false,
  },
  {
    table: 'ma_producers',
    source: 'massachusetts_doi_wave1',
    authority: 'MA DOI Wave-1 staging entity_type (if populated)',
    npnColumn: 'npn',
    typeColumn: 'entity_type',
    extractIsBusinessOnly: false,
  },
  {
    table: 'tdi_producers',
    source: 'texas_tdi_agencies',
    authority: 'TDI agencies-and-businesses extract (business-only official list)',
    npnColumn: 'npn',
    typeColumn: 'implied_business_extract',
    extractIsBusinessOnly: true,
  },
  {
    table: 'nj_producers',
    source: 'new_jersey_dobi',
    authority: 'NJ DOBI agency/business extract (business-only official list)',
    npnColumn: 'npn',
    typeColumn: 'implied_business_extract',
    extractIsBusinessOnly: true,
  },
  {
    table: 'nv_producers',
    source: 'nevada_doi',
    authority: 'Nevada DOI firm extract (business-only official list)',
    npnColumn: 'npn',
    typeColumn: 'implied_business_extract',
    extractIsBusinessOnly: true,
  },
  {
    table: 'nc_producers',
    source: 'north_carolina_doi',
    authority: 'NC DOI agency extract (business-only official list)',
    npnColumn: 'npn',
    typeColumn: 'implied_business_extract',
    extractIsBusinessOnly: true,
  },
  {
    table: 'odi_producers',
    source: 'ohio_odi',
    authority: 'Ohio ODI agency extract (business-only official list)',
    npnColumn: 'npn',
    typeColumn: 'implied_business_extract',
    extractIsBusinessOnly: true,
  },
];

export function evidenceFromStagingRow(input: {
  source: string;
  table: string;
  authority: string;
  extractIsBusinessOnly: boolean;
  typeColumn: string | 'implied_business_extract';
  entityTypeRaw?: string | null;
  sourceDate?: string | null;
}): TypeEvidence {
  if (input.extractIsBusinessOnly || input.typeColumn === 'implied_business_extract') {
    return {
      source: input.source,
      table: input.table,
      field: 'official_business_entity_extract',
      entityTypeRaw: input.entityTypeRaw || 'business',
      class: 'BUSINESS_ENTITY',
      sourceDate: input.sourceDate ?? null,
      authority: input.authority,
    };
  }
  const raw = String(input.entityTypeRaw || '');
  return {
    source: input.source,
    table: input.table,
    field: 'entity_type',
    entityTypeRaw: raw,
    class: normalizeOfficialEntityType(raw),
    sourceDate: input.sourceDate ?? null,
    authority: input.authority,
  };
}

export function cmsHitIsExplicitEntityType(): false {
  return false;
}

export function sbsBulkLookupUsed(): false {
  return false;
}

export function npnStillCanonical(npn: string | null, graphNpns: Set<string>): boolean {
  const n = normalizeNpn(npn);
  if (!n) return false;
  return graphNpns.has(n);
}
