import accepted from './accepted-snapshot.json';

export type IllinoisInsuranceSnapshot = typeof accepted;

export const ILLINOIS_SNAPSHOT = accepted as IllinoisInsuranceSnapshot;

export const IL_STATE_INTEL_VERSION_CHECK = 'insurance-il-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return 'Search only';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertIllinoisInsurance(
  value: IllinoisInsuranceSnapshot = ILLINOIS_SNAPSHOT,
): IllinoisInsuranceSnapshot {
  if (value.version !== IL_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Illinois contract ${value.version}`);
  }
  if (value.fingerprint !== '3085ccfe7ec30c038fafcfb3e70a11609eeba91a9918c9efe14ceb7f0ef634aa') {
    throw new Error('Illinois insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/illinois') throw new Error('path');
  if (value.company_lookup.count != null) throw new Error('do not invent current company count');
  if (value.producer_roster.count != null) throw new Error('do not invent producer count');
  if (value.agency_roster.count != null) throw new Error('do not invent agency count');
  if (value.complaints.count != null) throw new Error('do not invent complaint count');
  if (value.directors_orders.observation_rows !== 2896) throw new Error('order observations drifted');
  if (value.directors_orders.distinct_ids !== 2896) throw new Error('order ids drifted');
  if (value.enforcement_attachment.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');
  if (value.expansion_ledger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) throw new Error('no canonical writes');
  if (value.claim_eligibility.broadened !== false) throw new Error('claim frozen');
  if (value.no_illinois_local_pages !== true) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  if (value.search_only_is_not_zero !== true) throw new Error('search-only is not zero');
  if (value.directors_orders.order_is_not_conviction !== true) throw new Error('order != conviction');
  if (value.complaints.orders_are_not_complaints !== true) throw new Error('orders != complaints');
  return value;
}
