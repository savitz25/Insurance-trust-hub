/**
 * Phase 20 — consumer license-data freshness (display only).
 * Does not invent dates. Trust gates still use the 365-day promotion window.
 */

export const PROFILE_FRESHNESS_DAYS = 90;

export type LicenseFreshness =
  | {
      kind: 'fresh';
      days: number;
      checkedAt: Date;
      badge: string;
      note: string;
    }
  | {
      kind: 'stale';
      days: number;
      checkedAt: Date;
      badge: string;
      note: string;
    }
  | { kind: 'unknown'; badge: null; note: string };

export function resolveLicenseFreshness(
  iso: string | null | undefined,
  now: Date = new Date()
): LicenseFreshness {
  if (!iso?.trim()) {
    return {
      kind: 'unknown',
      badge: null,
      note: 'No as-of date is on file. Re-check this license on the official state tool before you enroll.',
    };
  }
  const checkedAt = new Date(iso);
  if (Number.isNaN(checkedAt.getTime())) {
    return {
      kind: 'unknown',
      badge: null,
      note: 'No as-of date is on file. Re-check this license on the official state tool before you enroll.',
    };
  }
  const days = Math.floor((now.getTime() - checkedAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0 || days > 4000) {
    return {
      kind: 'unknown',
      badge: null,
      note: 'No as-of date is on file. Re-check this license on the official state tool before you enroll.',
    };
  }
  if (days <= PROFILE_FRESHNESS_DAYS) {
    return {
      kind: 'fresh',
      days,
      checkedAt,
      badge: 'Checked within 90 days',
      note: 'License data was checked recently. Status can still change — confirm on the official state tool.',
    };
  }
  return {
    kind: 'stale',
    days,
    checkedAt,
    badge: 'License data older than 90 days — re-check on official state tool',
    note: 'This research listing may be stale. Re-check license status on the official state tool before you enroll.',
  };
}
