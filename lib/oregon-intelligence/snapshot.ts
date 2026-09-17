import accepted from './accepted-snapshot.json';

export type OregonInsuranceSnapshot = typeof accepted;

export const OREGON_SNAPSHOT = accepted as OregonInsuranceSnapshot;

export const OR_STATE_INTEL_VERSION_CHECK = 'insurance-or-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return 'Search only';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertOregonInsurance(
  value: OregonInsuranceSnapshot = OREGON_SNAPSHOT,
): OregonInsuranceSnapshot {
  if (value.version !== OR_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Oregon contract ${value.version}`);
  }
  if (value.fingerprint !== 'df48d2f563f81a90c12929a3eb7eb1e2e403e395e75913a595d671959dd00f3a') {
    throw new Error('Oregon insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/oregon') throw new Error('path');
  if (value.company_lookup.count != null) throw new Error('do not invent current company count');
  if (value.producer_roster.count != null) throw new Error('do not invent producer count');
  if (value.agency_roster.count != null) throw new Error('do not invent agency count');
  if (value.dfr_orders.document_rows !== 738) throw new Error('order documents drifted');
  if (value.dfr_orders.distinct_cases !== 726) throw new Error('order cases drifted');
  if (value.complaints.row_total !== 1309) throw new Error('complaint rows drifted');
  if (value.market_conduct.report_rows !== 27) throw new Error('mc drifted');
  if (value.financial_exams.report_rows !== 44) throw new Error('financial drifted');
  if (value.enforcement_attachment.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');
  if (value.expansion_ledger.GRAPH_WRITES !== 0) throw new Error('no graph writes');
  if (value.claim_eligibility.broadened !== false) throw new Error('claim frozen');
  if (value.no_oregon_local_pages !== true) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  if (value.search_only_is_not_zero !== true) throw new Error('search-only is not zero');
  if (value.complaints.index_is_not_trust_score !== true) throw new Error('index != trust score');
  if (value.market_conduct.exam_is_not_discipline !== true) throw new Error('exam != discipline');
  return value;
}
