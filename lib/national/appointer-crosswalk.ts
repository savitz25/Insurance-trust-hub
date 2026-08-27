/**
 * INS-NAT-FINAL-003 — Appointing-entity → legal-insurer crosswalk contract.
 * CONFIRMED bridges only. Digit coincidence and names never identity.
 */

import {
  CARRIER_RELATIONSHIP_TYPE,
  classifyFlAppointingToNational,
  classifyTxAppointingToNational,
  legalInsurerProvisionalKey,
  mayTraverseRegulatoryEvidence,
  parseAppointingEntityKey,
} from './legal-insurer-identity';
import type { IdentityConfidence } from './types';

export const CROSSWALK_TASK = 'INS-NAT-FINAL-003';
export const CROSSWALK_TRANSFORM = 'ins-nat-final-003.v1';
export const CROSSWALK_SOURCE_DATASET = 'appointer_naic_crosswalk';
export const CROSSWALK_OBSERVED_AT = '2026-08-27T00:00:00.000Z';

export const TX_MATCH_BASIS =
  'exact Texas TDI reported NAIC ID + exact official NAIC LOC CoCode';

export const FL_DIGIT_COINCIDENCES = [
  '10003',
  '10005',
  '10006',
  '10015',
  '10017',
  '10023',
  '21040',
  '24180',
  '24830',
  '25186',
  '26271',
  '29300',
  '31062',
  '32301',
  '60016',
  '60111',
  '66001',
] as const;

export const TX_UNRESOLVED_IDS = [
  '14348',
  '16806',
  '38466',
  '62472',
  '70335',
  '91413',
  '95175',
] as const;

export const CONFIRMED_IDENTITY_SIGNALS_FORBIDDEN = [
  'normalized_company_name',
  'address',
  'phone',
  'email',
  'brand_regex',
  'website_domain',
] as const;

export function confirmedMappingUsesNameAddressContactBrand(): false {
  return false;
}

export function digitCoincidenceIsIdentity(): false {
  return false;
}

export function flDfsNumberIsNaic(): false {
  return false;
}

export function reviewRequiredGetsProductionBridge(): false {
  return false;
}

export function unresolvedGetsProductionBridge(): false {
  return false;
}

export function highConfidenceGetsProductionBridgeThisTask(): false {
  return false;
}

export function adverseEvidenceMayTraverse(bridge: IdentityConfidence): boolean {
  return mayTraverseRegulatoryEvidence(bridge);
}

export type CrosswalkRow = {
  state: 'FL' | 'TX';
  appointerProvisionalKey: string;
  rawStateIdentifier: string;
  sourceName: string;
  targetNaic: string | null;
  targetLegalInsurerKey: string | null;
  confidence: IdentityConfidence;
  matchBasis: string;
  source: string;
  sourceDate: string;
  status: 'BRIDGED' | 'UNRESOLVED_NAIC_CROSSWALK' | 'REVIEW_REQUIRED' | 'HOLD';
  holdReason: string | null;
};

export function classifyTxBridge(input: {
  txKey: string;
  officialCoCodes: ReadonlySet<string>;
  officialGroupCodes: ReadonlySet<string>;
  legalInsurerKeys: ReadonlySet<string>;
}): CrosswalkRow {
  const parsed = parseAppointingEntityKey(input.txKey);
  const mapping = classifyTxAppointingToNational({
    txNaicId: parsed.raw,
    officialCoCodes: input.officialCoCodes,
    officialGroupCodes: input.officialGroupCodes,
  });
  const base = {
    state: 'TX' as const,
    appointerProvisionalKey: input.txKey,
    rawStateIdentifier: parsed.raw,
    sourceName: 'Texas TDI bupb-23s9 NAIC ID + NAIC LOC-JUN-2026 COMPANY CODE',
    source: CROSSWALK_SOURCE_DATASET,
    sourceDate: CROSSWALK_OBSERVED_AT,
  };
  if (mapping.confidence === 'CONFIRMED' && mapping.targetKind === 'legal_insurer') {
    if (!input.legalInsurerKeys.has(mapping.targetKey)) {
      return {
        ...base,
        targetNaic: parsed.raw,
        targetLegalInsurerKey: mapping.targetKey,
        confidence: 'UNRESOLVED',
        matchBasis: TX_MATCH_BASIS,
        status: 'HOLD',
        holdReason: 'target_legal_insurer_missing_from_spine',
      };
    }
    return {
      ...base,
      targetNaic: parsed.raw,
      targetLegalInsurerKey: mapping.targetKey,
      confidence: 'CONFIRMED',
      matchBasis: TX_MATCH_BASIS,
      status: 'BRIDGED',
      holdReason: null,
    };
  }
  if (mapping.confidence === 'CONFIRMED' && mapping.targetKind === 'insurance_group') {
    return {
      ...base,
      targetNaic: null,
      targetLegalInsurerKey: null,
      confidence: 'REVIEW_REQUIRED',
      matchBasis: 'tdi_id_equals_official_group_code_hold_preferred_legal_insurer',
      status: 'HOLD',
      holdReason: 'group_target_held_legal_insurer_preferred',
    };
  }
  if (mapping.confidence === 'REVIEW_REQUIRED' || mapping.confidence === 'HIGH_CONFIDENCE') {
    return {
      ...base,
      targetNaic: null,
      targetLegalInsurerKey: null,
      confidence: mapping.confidence,
      matchBasis: mapping.reason,
      status: mapping.confidence === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'HOLD',
      holdReason: mapping.reason,
    };
  }
  return {
    ...base,
    targetNaic: null,
    targetLegalInsurerKey: null,
    confidence: 'UNRESOLVED',
    matchBasis: mapping.reason,
    status: 'UNRESOLVED_NAIC_CROSSWALK',
    holdReason: mapping.reason,
  };
}

export function classifyFlBridge(input: {
  flKey: string;
  officialCoCodes: ReadonlySet<string>;
}): CrosswalkRow {
  const parsed = parseAppointingEntityKey(input.flKey);
  const mapping = classifyFlAppointingToNational({
    appointingEntityNumber: parsed.raw,
    officialCoCodes: input.officialCoCodes,
  });
  const coincidence = FL_DIGIT_COINCIDENCES.includes(
    parsed.raw as (typeof FL_DIGIT_COINCIDENCES)[number]
  );
  const base = {
    state: 'FL' as const,
    appointerProvisionalKey: input.flKey,
    rawStateIdentifier: parsed.raw,
    sourceName: 'Florida DFS Appointing Entity Number (eAppoint bulk appointments)',
    source: 'florida_dfs_appointing_entity_number',
    sourceDate: CROSSWALK_OBSERVED_AT,
    targetNaic: null as string | null,
    targetLegalInsurerKey: null as string | null,
  };
  if (coincidence || mapping.confidence === 'REVIEW_REQUIRED') {
    return {
      ...base,
      confidence: 'REVIEW_REQUIRED',
      matchBasis: 'fl_dfs_digits_coincide_with_naic_cocode_no_official_crosswalk',
      status: 'REVIEW_REQUIRED',
      holdReason: 'digit_coincidence_is_not_identity',
    };
  }
  return {
    ...base,
    confidence: 'UNRESOLVED',
    matchBasis: 'no_official_record_with_dfs_appointing_entity_number_and_naic_cocode',
    status: 'UNRESOLVED_NAIC_CROSSWALK',
    holdReason: 'official_fl_crosswalk_fields_absent',
  };
}

export function productionBridgeAllowed(row: CrosswalkRow): boolean {
  return row.confidence === 'CONFIRMED' && row.status === 'BRIDGED' && Boolean(row.targetLegalInsurerKey);
}

export function crosswalkSourceRecordId(row: CrosswalkRow): string {
  return `${row.appointerProvisionalKey}|${row.targetLegalInsurerKey}`;
}

export function nameOnlyFlMatchIsConfirmed(): false {
  return false;
}

export { CARRIER_RELATIONSHIP_TYPE, legalInsurerProvisionalKey };
