import accepted from './accepted-snapshot.json';

export type OhioInsuranceSnapshot = typeof accepted;

export const OHIO_SNAPSHOT = accepted as OhioInsuranceSnapshot;

export const OH_STATE_INTEL_VERSION_CHECK = 'insurance-oh-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return 'Search only';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertOhioInsurance(
  value: OhioInsuranceSnapshot = OHIO_SNAPSHOT,
): OhioInsuranceSnapshot {
  if (value.version !== OH_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Ohio contract ${value.version}`);
  }
  if (value.fingerprint !== '37736ead0d717acbaa8b3cfdcfa43f7b14b5dae985a158dadb6f6d545ebb25bc') {
    throw new Error('Ohio insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/ohio') throw new Error('path');
  if (value.authorized_companies.distinct_naic !== 1738) throw new Error('authorized NAIC drifted');
  if (value.authorized_companies.rows !== 1738) throw new Error('authorized rows drifted');
  if (value.authorized_companies.rows_missing_naic !== 0) throw new Error('missing NAIC');
  if (value.domestic_insurers.distinct_naic !== 237) throw new Error('domestic drifted');
  if (value.agency_roster.union_distinct_npn !== 23922) throw new Error('agency union drifted');
  if (value.agency_roster.residence_overlap_npn !== 0) throw new Error('residence overlap');
  if (value.line_of_authority.life.union_distinct_npn !== 16306) throw new Error('life LOA drifted');
  if (value.line_of_authority.accident_and_health.union_distinct_npn !== 16132) {
    throw new Error('A&H LOA drifted');
  }
  if (value.journal.document_rows !== 496) throw new Error('journal drifted');
  if (value.journal.unique_matters != null) throw new Error('unique matters must stay null');
  if (value.journal.agency_action_rows != null) throw new Error('agency journal grain unsplit');
  if (value.journal.company_action_rows != null) throw new Error('company journal grain unsplit');
  if (value.financial_data.rows != null) throw new Error('do not invent financial census');
  if (value.complaints.intake_is_not_census !== true) throw new Error('complaint intake');
  if (value.producer_roster.complete_census_published !== false) throw new Error('producer census');
  if (value.attachments.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');
  if (value.expansion_ledger.GRAPH_WRITES !== 0) throw new Error('no graph writes');
  if (value.claim_eligibility.broadened !== false) throw new Error('claim frozen');
  if (value.no_ohio_local_intelligence_routes !== true) throw new Error('no local intel routes');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  if (value.line_of_authority.no_homeowners_loa !== true) throw new Error('no homeowners LOA');
  if (value.line_of_authority.no_auto_loa !== true) throw new Error('no auto LOA');
  if (value.consumer_product_loa.homeowners.status !== 'UNSUPPORTED') throw new Error('SQA-009 homeowners');
  if (value.consumer_product_loa.auto.status !== 'UNSUPPORTED') throw new Error('SQA-009 auto');
  if (value.consumer_product_loa.flood.status !== 'UNSUPPORTED') throw new Error('flood');
  if (value.authorized_companies.authorized_is_not_domestic !== true) throw new Error('authorized ≠ domestic');
  if (value.journal.journal_is_not_complete_adverse_census !== true) {
    throw new Error('journal incompleteness');
  }
  return value;
}
