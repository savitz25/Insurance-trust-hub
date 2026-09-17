import accepted from './accepted-snapshot.json';

export type PennsylvaniaInsuranceSnapshot = typeof accepted;

export const PENNSYLVANIA_SNAPSHOT = accepted as PennsylvaniaInsuranceSnapshot;

export const PA_STATE_INTEL_VERSION_CHECK = 'insurance-pa-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return 'Search only';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertPennsylvaniaInsurance(
  value: PennsylvaniaInsuranceSnapshot = PENNSYLVANIA_SNAPSHOT,
): PennsylvaniaInsuranceSnapshot {
  if (value.version !== PA_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Pennsylvania contract ${value.version}`);
  }
  if (value.fingerprint !== '530c42b9bb39e86bf76160594c5b37a6b105a6742e4a11b7c364a828e2294239') {
    throw new Error('Pennsylvania insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/pennsylvania') throw new Error('path');
  if (value.company_lookup.distinct_naic !== 1722) throw new Error('licensed NAIC drifted');
  if (value.company_lookup.count !== 1724) throw new Error('letter rows drifted');
  if (value.producer_roster.count != null) throw new Error('do not invent producer count');
  if (value.agency_roster.count != null) throw new Error('do not invent agency count');
  if (value.surplus_lines.distinct_naic !== 233) throw new Error('surplus drifted');
  if (value.enforcement.enforcement_actions !== 3232) throw new Error('enforcement drifted');
  if (value.enforcement.market_conduct_actions !== 450) throw new Error('market conduct drifted');
  if (value.complaints.row_total !== 595) throw new Error('complaint rows drifted');
  if (value.financial_exams.document_rows !== 494) throw new Error('financial drifted');
  if (value.liquidation.document_rows !== 95) throw new Error('liquidation drifted');
  if (value.enforcement_attachment.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');
  if (value.expansion_ledger.GRAPH_WRITES !== 0) throw new Error('no graph writes');
  if (value.claim_eligibility.broadened !== false) throw new Error('claim frozen');
  if (value.no_pennsylvania_local_pages !== true) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  if (value.search_only_is_not_zero !== true) throw new Error('search-only is not zero');
  if (value.complaints.index_is_not_trust_score !== true) throw new Error('index != trust score');
  if (value.market_conduct.exam_is_not_discipline !== true) throw new Error('exam != discipline');
  if (value.financial_exams.financial_exam_is_not_market_conduct !== true) {
    throw new Error('financial != market conduct');
  }
  if (value.liquidation.liquidation_is_not_current_census !== true) {
    throw new Error('liquidation != census');
  }
  if (value.company_lookup.property_and_allied_lines_is_not_homeowners !== true) {
    throw new Error('allied lines != homeowners');
  }
  return value;
}
