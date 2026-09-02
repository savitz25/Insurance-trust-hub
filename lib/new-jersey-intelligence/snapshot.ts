import accepted from './accepted-snapshot.json';

export type NewJerseyInsuranceSnapshot = typeof accepted;

export const NJ_SNAPSHOT_CONTRACT = 'insurance-nj-state-intel-v1' as const;

export const NEW_JERSEY_SNAPSHOT = accepted as NewJerseyInsuranceSnapshot;

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number): string {
  if (typeof value === 'number') return fmtInt(value);
  return value;
}
