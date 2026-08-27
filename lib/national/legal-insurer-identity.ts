/**
 * INS-NAT-FINAL-002 — National legal-insurer / group / brand identity contract.
 *
 * Appointing entities (FL DFS, TX TDI) stay distinct until a CONFIRMED
 * official-identifier crosswalk. Names never merge. Brands never replace
 * legal insurers. Groups never replace member companies.
 */

import { compareLegalNames } from './names';
import type { IdentityConfidence, NationalEntityKind } from './types';
import { CARRIER_REGISTRY, matchCarrierByReportedName } from '../carriers/registry';
import {
  carrierProvisionalKey,
  isPlausibleNaicCompanyCode,
} from './carrier-identity';
import { txAppointingEntityKey, normalizeTxNaicId } from './tx-individual-appointments';

export const CARRIER_IDENTITY_FOUNDATION_TASK = 'INS-NAT-FINAL-002';

/** Official NAIC CoCode is five digits. FL DFS numbers are not CoCodes. */
export function normalizeNaicCompanyCode(
  raw: string | null | undefined
): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^(n\/?a|none|null|unknown|-)$/i.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (!/^\d{5}$/.test(digits)) return null;
  return digits;
}

/**
 * Pad 1–5 digit strings to five digits for HIGH_CONFIDENCE candidate lookup only.
 * Never promotes a padded value to CONFIRMED CoCode identity by itself.
 */
export function padCandidateToCoCode(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!/^\d{1,5}$/.test(digits)) return null;
  return digits.padStart(5, '0');
}

/** NAIC group codes are 1–5 digits. Canonical form strips leading zeros. */
export function normalizeNaicGroupCode(
  raw: string | null | undefined
): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^(n\/?a|none|null|unknown|-)$/i.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (!/^\d{1,5}$/.test(digits)) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return String(n);
}

export const IDENTIFIER_SCHEME = {
  NAIC_COCODE: 'naic_cocode',
  NAIC_GROUP_CODE: 'naic_group_code',
  FEIN: 'fein',
  FL_DFS_APPOINTING: 'fl_dfs_appointing_entity_number',
  TX_TDI_NAIC_ID: 'tx_tdi_naic_id',
  CMS_CONTRACT_ID: 'cms_medicare_contract_id',
  CMS_HIOS_ISSUER_ID: 'cms_hios_issuer_id',
} as const;

export type IdentifierScheme =
  (typeof IDENTIFIER_SCHEME)[keyof typeof IDENTIFIER_SCHEME];

export const CARRIER_RELATIONSHIP_TYPE = {
  MEMBER_OF_GROUP: 'MEMBER_OF_GROUP',
  USES_BRAND: 'USES_BRAND',
  APPOINTER_RESOLVES_TO: 'APPOINTER_RESOLVES_TO',
} as const;

export type CarrierRelationshipType =
  (typeof CARRIER_RELATIONSHIP_TYPE)[keyof typeof CARRIER_RELATIONSHIP_TYPE];

export const CARRIER_ENTITY_KIND = {
  APPOINTER: 'carrier',
  LEGAL_INSURER: 'legal_insurer',
  INSURANCE_GROUP: 'insurance_group',
  CONSUMER_BRAND: 'consumer_brand',
} as const;

export type CarrierIdentityKind =
  (typeof CARRIER_ENTITY_KIND)[keyof typeof CARRIER_ENTITY_KIND];

export function legalInsurerProvisionalKey(cocode: string): string {
  return `legal-insurer:naic:${cocode}`;
}

export function insuranceGroupProvisionalKey(groupCode: string): string {
  return `insurance-group:naic:${groupCode}`;
}

export function consumerBrandProvisionalKey(slug: string): string {
  return `consumer-brand:${slug.toLowerCase().trim()}`;
}

export function parseAppointingEntityKey(key: string): {
  namespace: 'fl_dfs' | 'tx_tdi_naic' | 'unknown';
  raw: string;
} {
  if (key.startsWith('carrier:fl-dfs:')) {
    return { namespace: 'fl_dfs', raw: key.slice('carrier:fl-dfs:'.length) };
  }
  if (key.startsWith('carrier:tx-tdi-naic:')) {
    return { namespace: 'tx_tdi_naic', raw: key.slice('carrier:tx-tdi-naic:'.length) };
  }
  return { namespace: 'unknown', raw: key };
}

export const PUBLIC_COPY = {
  legalInsurer: 'Legal regulated insurer',
  naic: 'NAIC company code',
  group: 'Insurance group',
  brand: 'Consumer brand',
  appointer: 'Appointing entity reported by state regulator',
} as const;

export const FORBIDDEN_PUBLIC_PHRASES = ['parent company', 'same company'] as const;

export const NAIC_COMPANY_STATUS: Record<string, string> = {
  '0': 'conservatorship',
  '1': 'active',
  '4': 'receivership_or_rehabilitation',
  '6': 'liquidation_or_liquidated',
};

export type LegalInsurerDecision =
  | {
      confidence: 'CONFIRMED';
      cocode: string;
      legalName: string;
      key: string;
      kind: 'legal_insurer';
      reason: string;
    }
  | {
      confidence: 'REVIEW_REQUIRED';
      cocode: string | null;
      legalName: string;
      kind: 'legal_insurer';
      reason: string;
    }
  | {
      confidence: 'UNRESOLVED';
      cocode: null;
      legalName: string;
      kind: 'legal_insurer';
      reason: string;
    };

export function decideLegalInsurerIdentity(input: {
  cocode?: string | null;
  names: string[];
}): LegalInsurerDecision {
  const cocode = normalizeNaicCompanyCode(input.cocode);
  const names = input.names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const legalName = selectLongestName(names, 'UNKNOWN LEGAL INSURER');
  if (!cocode) {
    return {
      confidence: 'UNRESOLVED',
      cocode: null,
      legalName,
      kind: 'legal_insurer',
      reason: names.length ? 'name_only_not_confirmed' : 'missing_naic_cocode',
    };
  }
  if (namesHaveConflict(names)) {
    return {
      confidence: 'REVIEW_REQUIRED',
      cocode,
      legalName,
      kind: 'legal_insurer',
      reason: 'same_cocode_conflicting_names',
    };
  }
  return {
    confidence: 'CONFIRMED',
    cocode,
    legalName,
    key: legalInsurerProvisionalKey(cocode),
    kind: 'legal_insurer',
    reason: 'official_naic_cocode',
  };
}

export type GroupDecision =
  | {
      confidence: 'CONFIRMED';
      groupCode: string;
      groupName: string;
      key: string;
      kind: 'insurance_group';
      reason: string;
    }
  | {
      confidence: 'UNRESOLVED';
      groupCode: null;
      groupName: string;
      kind: 'insurance_group';
      reason: string;
    };

export function decideInsuranceGroupIdentity(input: {
  groupCode?: string | null;
  names: string[];
}): GroupDecision {
  const groupCode = normalizeNaicGroupCode(input.groupCode);
  const names = input.names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const groupName = selectLongestName(names, 'UNKNOWN INSURANCE GROUP');
  if (!groupCode) {
    return {
      confidence: 'UNRESOLVED',
      groupCode: null,
      groupName,
      kind: 'insurance_group',
      reason: names.length ? 'name_only_not_confirmed' : 'missing_naic_group_code',
    };
  }
  return {
    confidence: 'CONFIRMED',
    groupCode,
    groupName,
    key: insuranceGroupProvisionalKey(groupCode),
    kind: 'insurance_group',
    reason: 'official_naic_group_code',
  };
}

export type TxNationalMapping =
  | {
      confidence: 'CONFIRMED';
      txKey: string;
      targetKind: 'legal_insurer' | 'insurance_group';
      targetKey: string;
      reason: string;
    }
  | {
      confidence: 'HIGH_CONFIDENCE';
      txKey: string;
      targetKind: 'legal_insurer' | 'insurance_group';
      targetKey: string;
      reason: string;
    }
  | {
      confidence: 'REVIEW_REQUIRED';
      txKey: string;
      targetKind: null;
      targetKey: null;
      reason: string;
    }
  | {
      confidence: 'UNRESOLVED';
      txKey: string | null;
      targetKind: null;
      targetKey: null;
      reason: string;
    };

export function classifyTxAppointingToNational(input: {
  txNaicId?: string | null;
  officialCoCodes: ReadonlySet<string>;
  officialGroupCodes: ReadonlySet<string>;
}): TxNationalMapping {
  const raw = normalizeTxNaicId(input.txNaicId);
  if (!raw) {
    return {
      confidence: 'UNRESOLVED',
      txKey: null,
      targetKind: null,
      targetKey: null,
      reason: 'missing_tdi_naic_id',
    };
  }
  const txKey = txAppointingEntityKey(raw);
  const asCoCode = normalizeNaicCompanyCode(raw);
  const asGroup = normalizeNaicGroupCode(raw);
  const coHit = asCoCode ? input.officialCoCodes.has(asCoCode) : false;
  const groupHit = asGroup ? input.officialGroupCodes.has(asGroup) : false;

  if (raw.length === 6) {
    return {
      confidence: 'UNRESOLVED',
      txKey,
      targetKind: null,
      targetKey: null,
      reason: 'tdi_id_not_five_digit_cocode',
    };
  }

  if (raw.length === 5) {
    if (coHit && groupHit) {
      return {
        confidence: 'REVIEW_REQUIRED',
        txKey,
        targetKind: null,
        targetKey: null,
        reason: 'tdi_id_matches_both_cocode_and_group',
      };
    }
    if (coHit && asCoCode) {
      return {
        confidence: 'CONFIRMED',
        txKey,
        targetKind: 'legal_insurer',
        targetKey: legalInsurerProvisionalKey(asCoCode),
        reason: 'tdi_naic_id_equals_official_cocode',
      };
    }
    if (groupHit && asGroup) {
      return {
        confidence: 'CONFIRMED',
        txKey,
        targetKind: 'insurance_group',
        targetKey: insuranceGroupProvisionalKey(asGroup),
        reason: 'tdi_naic_id_equals_official_group_code',
      };
    }
    return {
      confidence: 'UNRESOLVED',
      txKey,
      targetKind: null,
      targetKey: null,
      reason: 'tdi_naic_id_not_in_official_naic_listing',
    };
  }

  // 4-digit TDI ID: could be unpadded CoCode or a group code.
  const padded = padCandidateToCoCode(raw);
  const paddedHit = padded ? input.officialCoCodes.has(padded) : false;
  if (paddedHit && groupHit) {
    return {
      confidence: 'REVIEW_REQUIRED',
      txKey,
      targetKind: null,
      targetKey: null,
      reason: 'four_digit_tdi_id_ambiguous_cocode_or_group',
    };
  }
  if (groupHit && asGroup) {
    return {
      confidence: 'HIGH_CONFIDENCE',
      txKey,
      targetKind: 'insurance_group',
      targetKey: insuranceGroupProvisionalKey(asGroup),
      reason: 'four_digit_tdi_id_matches_official_group_only',
    };
  }
  if (paddedHit && padded) {
    return {
      confidence: 'HIGH_CONFIDENCE',
      txKey,
      targetKind: 'legal_insurer',
      targetKey: legalInsurerProvisionalKey(padded),
      reason: 'four_digit_tdi_id_padded_matches_official_cocode',
    };
  }
  return {
    confidence: 'UNRESOLVED',
    txKey,
    targetKind: null,
    targetKey: null,
    reason: 'four_digit_tdi_id_not_in_official_naic_listing',
  };
}

export type FlNationalMapping =
  | {
      confidence: 'REVIEW_REQUIRED';
      flKey: string;
      targetKind: null;
      targetKey: null;
      reason: string;
      coincidentalCoCode: string | null;
    }
  | {
      confidence: 'UNRESOLVED';
      flKey: string | null;
      targetKind: null;
      targetKey: null;
      reason: string;
      coincidentalCoCode: string | null;
    };

export function classifyFlAppointingToNational(input: {
  appointingEntityNumber?: string | null;
  officialCoCodes: ReadonlySet<string>;
}): FlNationalMapping {
  const raw = String(input.appointingEntityNumber || '').trim();
  if (!raw) {
    return {
      confidence: 'UNRESOLVED',
      flKey: null,
      targetKind: null,
      targetKey: null,
      reason: 'missing_dfs_appointing_entity_number',
      coincidentalCoCode: null,
    };
  }
  const flKey = carrierProvisionalKey(raw);
  if (!isPlausibleNaicCompanyCode(raw)) {
    return {
      confidence: 'UNRESOLVED',
      flKey,
      targetKind: null,
      targetKey: null,
      reason: 'fl_dfs_number_is_not_naic_cocode',
      coincidentalCoCode: null,
    };
  }
  if (input.officialCoCodes.has(raw)) {
    return {
      confidence: 'REVIEW_REQUIRED',
      flKey,
      targetKind: null,
      targetKey: null,
      reason: 'fl_dfs_digits_coincide_with_naic_cocode_no_official_crosswalk',
      coincidentalCoCode: raw,
    };
  }
  return {
    confidence: 'UNRESOLVED',
    flKey,
    targetKind: null,
    targetKey: null,
    reason: 'fl_dfs_number_is_not_naic_cocode',
    coincidentalCoCode: null,
  };
}

export type CmsMappingClass =
  | 'exact_naic'
  | 'organization_name_only'
  | 'brand_only'
  | 'unresolved';

export type CmsOrgMapping = {
  class: CmsMappingClass;
  confidence: IdentityConfidence;
  contractId: string | null;
  organizationName: string;
  brandSlug: string | null;
  cocode: string | null;
  reason: string;
};

export function classifyCmsOrganization(input: {
  contractId?: string | null;
  organizationName?: string | null;
  hiosIssuerId?: string | null;
  /** Only when the CMS file itself publishes an NAIC CoCode. */
  naicCoCode?: string | null;
}): CmsOrgMapping {
  const organizationName = String(input.organizationName || '').replace(/\s+/g, ' ').trim();
  const contractId = String(input.contractId || '').trim().toUpperCase() || null;
  const officialCo = normalizeNaicCompanyCode(input.naicCoCode);
  if (officialCo) {
    return {
      class: 'exact_naic',
      confidence: 'CONFIRMED',
      contractId,
      organizationName,
      brandSlug: null,
      cocode: officialCo,
      reason: 'cms_file_contains_official_naic_cocode',
    };
  }
  const brand = matchCarrierByReportedName(organizationName || null);
  if (brand) {
    return {
      class: 'brand_only',
      confidence: 'REVIEW_REQUIRED',
      contractId,
      organizationName,
      brandSlug: brand.slug,
      cocode: null,
      reason: 'cms_org_name_matches_curated_consumer_brand',
    };
  }
  if (organizationName) {
    const hios = normalizeNaicCompanyCode(input.hiosIssuerId);
    return {
      class: hios ? 'organization_name_only' : 'organization_name_only',
      confidence: 'REVIEW_REQUIRED',
      contractId,
      organizationName,
      brandSlug: null,
      cocode: null,
      reason: hios
        ? 'hios_issuer_id_not_assumed_to_be_naic_cocode'
        : 'cms_organization_name_only',
    };
  }
  return {
    class: 'unresolved',
    confidence: 'UNRESOLVED',
    contractId,
    organizationName,
    brandSlug: null,
    cocode: null,
    reason: 'cms_org_has_no_naic_and_no_name',
  };
}

/** Adverse / regulatory evidence may attach only across a CONFIRMED bridge. */
export function mayTraverseRegulatoryEvidence(
  bridgeConfidence: IdentityConfidence
): boolean {
  return bridgeConfidence === 'CONFIRMED';
}

export function nameOnlyMatchIsConfirmed(): false {
  return false;
}

export function fuzzyMergeAllowed(): false {
  return false;
}

export function brandEqualsLegalInsurer(): false {
  return false;
}

export function groupEqualsLegalInsurer(): false {
  return false;
}

export function appointerEqualsLegalInsurerUntilResolved(): false {
  return false;
}

export function flDfsNumberEqualsNaic(): false {
  return false;
}

export function txNamespaceAssumedCoCode(): false {
  return false;
}

export function curatedBrandCount(): number {
  return CARRIER_REGISTRY.length;
}

export function unpublishedCarrierKinds(): ReadonlySet<NationalEntityKind> {
  return new Set<NationalEntityKind>([
    'carrier',
    'legal_insurer',
    'insurance_group',
    'consumer_brand',
  ]);
}

function namesHaveConflict(names: string[]): boolean {
  const unique = Array.from(new Set(names.map((n) => n.toUpperCase())));
  if (unique.length < 2) return false;
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (compareLegalNames(names[i], names[j]) === 'conflict') return true;
    }
  }
  return false;
}

function selectLongestName(names: string[], fallback: string): string {
  const cleaned = names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!cleaned.length) return fallback;
  cleaned.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return cleaned[0]!;
}
