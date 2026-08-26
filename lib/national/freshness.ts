/**
 * Regulator status/dates and Trust Hub observation freshness are independent.
 * Stale Trust Hub observation must NEVER be rewritten as regulator expiration.
 */

import type { RegulatoryStatus } from './types';

export type CredentialFreshnessView = {
  regulatoryStatus: RegulatoryStatus;
  expirationDate: string | null;
  sourceObservedAt: string | null;
  ingestedAt: string;
  observationStale: boolean;
  regulatorExpiredByDate: boolean;
};

export function mapSourceStatus(raw: string | null | undefined): RegulatoryStatus {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return 'unknown';
  if (/revok/.test(s)) return 'revoked';
  if (/suspend/.test(s)) return 'suspended';
  if (/cancel|cancelled|canceled/.test(s)) return 'cancelled';
  if (/expir/.test(s)) return 'expired';
  if (/inactive|lapsed|terminat/.test(s)) return 'inactive';
  if (/active|valid|current|licensed/.test(s)) return 'active';
  return 'unknown';
}

export function isObservationStale(
  ingestedAt: string,
  now: Date,
  staleAfterDays = 365
): boolean {
  const d = new Date(ingestedAt);
  if (Number.isNaN(d.getTime())) return true;
  const ageMs = now.getTime() - d.getTime();
  return ageMs > staleAfterDays * 24 * 60 * 60 * 1000;
}

export function isRegulatorExpiredByDate(
  expirationDate: string | null | undefined,
  now: Date
): boolean {
  if (!expirationDate) return false;
  const d = new Date(`${expirationDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

export function credentialFreshnessView(input: {
  regulatoryStatus: RegulatoryStatus;
  expirationDate: string | null;
  sourceObservedAt: string | null;
  ingestedAt: string;
  now?: Date;
  staleAfterDays?: number;
}): CredentialFreshnessView {
  const now = input.now ?? new Date();
  return {
    regulatoryStatus: input.regulatoryStatus,
    expirationDate: input.expirationDate,
    sourceObservedAt: input.sourceObservedAt,
    ingestedAt: input.ingestedAt,
    observationStale: isObservationStale(
      input.ingestedAt,
      now,
      input.staleAfterDays ?? 365
    ),
    regulatorExpiredByDate: isRegulatorExpiredByDate(input.expirationDate, now),
  };
}
