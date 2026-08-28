/**
 * FL-INS-003 — DFS appointer → OIR / NAIC identity bridge.
 * CONFIRMED same-record (or unique official two-step) only.
 * Names, digits, address, phone, brand never create APPOINTER_RESOLVES_TO.
 */
import { legalInsurerProvisionalKey, normalizeNaicCompanyCode } from './legal-insurer-identity';
import { carrierProvisionalKey } from './carrier-identity';
import { normalizeFlOirCompanyCode } from './fl-oir-company';

export const FL_APPOINTER_BRIDGE_TASK = 'FL-INS-003';
export const APPOINTER_RESOLVES_TO = 'APPOINTER_RESOLVES_TO' as const;

export function dfsNumberIsNaic(): false {
  return false;
}
export function dfsNumberIsFlCompanyCode(): false {
  return false;
}
export function nameOnlyCreatesBridge(): false {
  return false;
}
export function addressOnlyCreatesBridge(): false {
  return false;
}
export function phoneOnlyCreatesBridge(): false {
  return false;
}
export function digitCoincidenceCreatesBridge(): false {
  return false;
}
export function reviewRequiredCreatesCanonicalBridge(): false {
  return false;
}
export function highConfidenceCreatesCanonicalBridge(): false {
  return false;
}
export function nonInsurerAppointerAttachesToLegalInsurer(): false {
  return false;
}
export function agencyAppointedByShortcutToLegalInsurer(): false {
  return false;
}
export function countyInferenceFromAppointment(): false {
  return false;
}

export type FlAppointerBridge =
  | {
      action: 'bridge';
      confidence: 'CONFIRMED';
      fromKey: string;
      toKey: string;
      matchBasis: string;
    }
  | {
      action: 'hold';
      confidence: 'HIGH_CONFIDENCE' | 'REVIEW_REQUIRED' | 'UNRESOLVED';
      fromKey: string | null;
      toKey: string | null;
      reason: string;
    };

function feinDigits(raw: string | null | undefined): string | null {
  const d = String(raw || '').replace(/\D/g, '');
  return /^\d{9}$/.test(d) ? d : null;
}

export function decideFlAppointerBridge(input: {
  dfsAppointingEntityNumber?: string | null;
  sameRecordNaic?: string | null;
  sameRecordFlCompanyCode?: string | null;
  flCodeAlreadyConfirmedToNaic?: string | null;
  dfsFein?: string | null;
  oirFein?: string | null;
  feinUniqueToOneLegalInsurer?: boolean;
  feinUniqueToOneDfsAppointer?: boolean;
  legalInsurerKeys: ReadonlySet<string>;
  nameOnlyNaic?: string | null;
  digitCoincidenceNaic?: string | null;
  candidateCount?: number;
}): FlAppointerBridge {
  const dfs = String(input.dfsAppointingEntityNumber || '').trim();
  const fromKey = dfs ? carrierProvisionalKey(dfs) : null;
  if (!dfs || !fromKey) {
    return { action: 'hold', confidence: 'UNRESOLVED', fromKey: null, toKey: null, reason: 'missing_dfs_appointing_entity_number' };
  }
  if ((input.candidateCount || 1) > 1) {
    return { action: 'hold', confidence: 'REVIEW_REQUIRED', fromKey, toKey: null, reason: 'multi_target_bridge' };
  }

  const sameNaic = normalizeNaicCompanyCode(input.sameRecordNaic);
  if (sameNaic) {
    const toKey = legalInsurerProvisionalKey(sameNaic);
    if (input.legalInsurerKeys.has(toKey)) {
      return {
        action: 'bridge',
        confidence: 'CONFIRMED',
        fromKey,
        toKey,
        matchBasis: 'exact_same_record_dfs_appointing_entity_number_and_naic_cocode',
      };
    }
    return { action: 'hold', confidence: 'REVIEW_REQUIRED', fromKey, toKey, reason: 'same_record_naic_absent_from_spine' };
  }

  const sameFl = normalizeFlOirCompanyCode(input.sameRecordFlCompanyCode);
  const chainNaic = normalizeNaicCompanyCode(input.flCodeAlreadyConfirmedToNaic);
  if (sameFl && chainNaic) {
    const toKey = legalInsurerProvisionalKey(chainNaic);
    if (input.legalInsurerKeys.has(toKey)) {
      return {
        action: 'bridge',
        confidence: 'CONFIRMED',
        fromKey,
        toKey,
        matchBasis: 'exact_same_record_dfs_appointing_and_fl_oir_company_code_confirmed_to_naic',
      };
    }
  }

  const dfsFein = feinDigits(input.dfsFein);
  const oirFein = feinDigits(input.oirFein);
  if (dfsFein && oirFein && dfsFein === oirFein) {
    if (input.feinUniqueToOneLegalInsurer && input.feinUniqueToOneDfsAppointer && chainNaic) {
      const toKey = legalInsurerProvisionalKey(chainNaic);
      if (input.legalInsurerKeys.has(toKey)) {
        return {
          action: 'bridge',
          confidence: 'CONFIRMED',
          fromKey,
          toKey,
          matchBasis: 'exact_official_unique_fein_two_step_dfs_oir_naic',
        };
      }
    }
    return {
      action: 'hold',
      confidence: 'HIGH_CONFIDENCE',
      fromKey,
      toKey: null,
      reason: 'fein_present_but_not_unique_or_naic_unconfirmed',
    };
  }

  if (input.nameOnlyNaic) {
    return { action: 'hold', confidence: 'REVIEW_REQUIRED', fromKey, toKey: null, reason: 'name_only_not_identity' };
  }
  if (input.digitCoincidenceNaic) {
    return {
      action: 'hold',
      confidence: 'REVIEW_REQUIRED',
      fromKey,
      toKey: legalInsurerProvisionalKey(input.digitCoincidenceNaic),
      reason: 'digit_coincidence_not_identity',
    };
  }
  return { action: 'hold', confidence: 'UNRESOLVED', fromKey, toKey: null, reason: 'no_official_same_record_cross_identifier' };
}
