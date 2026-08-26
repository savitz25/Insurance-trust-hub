/**
 * DFS appointing-entity identity for the national carrier spine.
 * Appointing Entity Number is a Florida DFS eAppoint identifier.
 * It is NOT assumed to be an NAIC company code (NAIC codes are 5-digit;
 * this field contains 5- and 6-digit values).
 */

import { compareLegalNames } from './names';
import type { IdentityConfidence } from './types';

export const CARRIER_IDENTITY_SCHEME = 'fl_dfs_appointing_entity_number';

export function normalizeAppointingEntityNumber(
  raw: string | null | undefined
): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^(n\/?a|none|null|unknown|-)$/i.test(s)) return null;
  return s;
}

export function carrierProvisionalKey(appointingEntityNumber: string): string {
  return `carrier:fl-dfs:${appointingEntityNumber}`;
}

export function isPlausibleNaicCompanyCode(num: string | null): boolean {
  if (!num) return false;
  return /^\d{5}$/.test(num);
}

export type CarrierIdentityDecision = {
  confidence: IdentityConfidence;
  number: string | null;
  legalName: string;
  reason: string;
};

export function decideCarrierIdentity(input: {
  appointingEntityNumber?: string | null;
  names: string[];
}): CarrierIdentityDecision {
  const number = normalizeAppointingEntityNumber(input.appointingEntityNumber);
  const names = input.names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const legalName = selectCarrierLegalName(names);

  if (!number) {
    return {
      confidence: 'UNRESOLVED',
      number: null,
      legalName,
      reason: 'missing_appointing_entity_number',
    };
  }

  const unique = Array.from(new Set(names.map((n) => n.toUpperCase())));
  if (unique.length >= 2) {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (compareLegalNames(names[i], names[j]) === 'conflict') {
          return {
            confidence: 'REVIEW_REQUIRED',
            number,
            legalName,
            reason: 'same_number_conflicting_names',
          };
        }
      }
    }
  }

  return {
    confidence: 'CONFIRMED',
    number,
    legalName,
    reason: 'dfs_appointing_entity_number_unique_or_compatible_names',
  };
}

export function selectCarrierLegalName(names: string[]): string {
  const cleaned = names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!cleaned.length) return 'UNKNOWN APPOINTING ENTITY';
  cleaned.sort((a, b) => {
    const len = b.length - a.length;
    if (len !== 0) return len;
    return a.localeCompare(b);
  });
  return cleaned[0]!;
}

export type AppointmentCurrency = 'CURRENT' | 'HISTORICAL' | 'UNKNOWN';

export function appointmentCurrency(input: {
  status?: string | null;
  expirationDate?: string | null;
  now?: Date;
}): AppointmentCurrency {
  const now = input.now ?? new Date();
  const s = String(input.status || '').toLowerCase();
  if (/terminat|cancel|inactiv|revok|suspend|lapsed/.test(s)) return 'HISTORICAL';
  if (/expir/.test(s)) return 'HISTORICAL';
  if (input.expirationDate) {
    const d = new Date(`${input.expirationDate}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.getTime() < now.getTime()) return 'HISTORICAL';
  }
  if (/active|valid|current/.test(s)) return 'CURRENT';
  if (!s && input.expirationDate) {
    const d = new Date(`${input.expirationDate}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.getTime() >= now.getTime()) return 'UNKNOWN';
  }
  return 'UNKNOWN';
}
