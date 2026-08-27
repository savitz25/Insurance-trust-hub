/**
 * Texas TDI individual insurance-company appointments (bupb-23s9).
 * PERSON → APPOINTED_TO → Texas appointing entity keyed by official TDI NAIC ID.
 * Not FL DFS appointing-entity identity. Not employment. Not ASSOCIATED_WITH. Not LOA. Not Marketplace.
 */

import { compareLegalNames } from './names';
import { normalizeNpn } from './npn';
import { appointmentCurrency, type AppointmentCurrency } from './carrier-identity';
import { healthLoaImpliesMarketplace } from './loa';
import { carrierProvisionalKey } from './carrier-identity';
import {
  PERSON_CARRIER_APPOINTMENT_TYPE,
  PERSON_AGENCY_ASSOCIATION_TYPE,
  decidePersonAppointmentJoin,
} from './fl-individual-appointments';

export const TX_INDIVIDUAL_APPOINTMENT_SOURCE = {
  id: 'bupb-23s9',
  title: 'Active insurance company appointments for agents and adjusters',
  portal: 'https://data.texas.gov/dataset/Active-insurance-company-appointments-for-agents-a/bupb-23s9',
  csv: 'https://data.texas.gov/api/views/bupb-23s9/rows.csv?accessType=DOWNLOAD',
  regulator: 'Texas Department of Insurance',
  sourceDataset: 'texas_tdi_individual_appointments',
  sourceTable: 'tdi_individual_appointments_csv',
  /** Socrata rowsUpdatedAt unix from live view JSON. */
  rowsUpdatedAtUnix: 1787815500,
  citation: 'Tex. Ins. Code §§ 4001.201–4001.206; TDI FIN501; dataset bupb-23s9',
} as const;

export const TX_APPOINTING_ENTITY_SCHEME = 'tx_tdi_naic_id' as const;

export { PERSON_CARRIER_APPOINTMENT_TYPE, PERSON_AGENCY_ASSOCIATION_TYPE, decidePersonAppointmentJoin };

export function appointmentImpliesLoa(): false {
  return false;
}
export function appointmentImpliesMarketplace(): false {
  return healthLoaImpliesMarketplace();
}
export function appointmentImpliesEmployment(): false {
  return false;
}
export function appointmentJoinUsesName(): false {
  return false;
}
export function appointmentBecomesAssociatedWith(): false {
  return false;
}
export function txMergesWithFlDfsByName(): false {
  return false;
}

/** TDI column is NAIC ID of the appointing insurance company (or group). */
export function normalizeTxNaicId(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^(n\/?a|none|null|unknown|-)$/i.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (!/^\d{4,6}$/.test(digits)) return null;
  return digits;
}

export function txAppointingEntityKey(naicId: string): string {
  return `carrier:tx-tdi-naic:${naicId}`;
}

export function isFlDfsAppointingEntityKey(key: string): boolean {
  return key.startsWith('carrier:fl-dfs:');
}

export function txAndFlKeysAreDistinct(txNaicId: string, flAppointingNumber: string): boolean {
  return txAppointingEntityKey(txNaicId) !== carrierProvisionalKey(flAppointingNumber);
}

export type TxEntityDecision =
  | { confidence: 'CONFIRMED'; naicId: string; legalName: string; key: string; reason: string }
  | { confidence: 'REVIEW_REQUIRED'; naicId: string; legalName: string; reason: string }
  | { confidence: 'UNRESOLVED'; naicId: null; legalName: string; reason: string };

export function decideTxAppointingEntity(input: {
  naicId?: string | null;
  names: string[];
}): TxEntityDecision {
  const naicId = normalizeTxNaicId(input.naicId);
  const names = input.names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const legalName = selectTxEntityName(names);
  if (!naicId) {
    return { confidence: 'UNRESOLVED', naicId: null, legalName, reason: 'missing_naic_id' };
  }
  const unique = Array.from(new Set(names.map((n) => n.toUpperCase())));
  if (unique.length >= 2) {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (compareLegalNames(names[i], names[j]) === 'conflict') {
          return {
            confidence: 'REVIEW_REQUIRED',
            naicId,
            legalName,
            reason: 'same_naic_conflicting_names',
          };
        }
      }
    }
  }
  return {
    confidence: 'CONFIRMED',
    naicId,
    legalName,
    key: txAppointingEntityKey(naicId),
    reason: 'tdi_naic_id_unique_or_compatible_names',
  };
}

export function selectTxEntityName(names: string[]): string {
  const cleaned = names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!cleaned.length) return 'UNKNOWN TEXAS APPOINTING ENTITY';
  cleaned.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return cleaned[0]!;
}

export function txAppointmentSourceRecordId(input: {
  personNpn: string;
  naicId: string;
  appointmentType: string;
  activeDate: string | null;
}): string {
  return [
    input.personNpn,
    input.naicId,
    String(input.appointmentType || '').trim().toUpperCase(),
    input.activeDate || '',
  ].join('|');
}

/**
 * bupb-23s9 is "Active insurance company appointments".
 * No expiration/termination columns. Status is implied active by the extract.
 */
export function txAppointmentCurrency(input: {
  sourceIsActiveFile?: boolean;
  expirationDate?: string | null;
  status?: string | null;
  now?: Date;
}): AppointmentCurrency {
  if (input.expirationDate || input.status) {
    return appointmentCurrency({
      status: input.status,
      expirationDate: input.expirationDate,
      now: input.now,
    });
  }
  if (input.sourceIsActiveFile) return 'CURRENT';
  return 'UNKNOWN';
}
