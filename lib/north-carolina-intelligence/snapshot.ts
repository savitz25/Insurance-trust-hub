import accepted from './accepted-snapshot.json';

export type NorthCarolinaInsuranceSnapshot = typeof accepted;

export const NORTH_CAROLINA_SNAPSHOT = accepted as NorthCarolinaInsuranceSnapshot;

export const NC_STATE_INTEL_VERSION_CHECK = 'insurance-nc-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return 'Search only';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertNorthCarolinaInsurance(
  value: NorthCarolinaInsuranceSnapshot = NORTH_CAROLINA_SNAPSHOT,
): NorthCarolinaInsuranceSnapshot {
  if (value.version !== NC_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected North Carolina contract ${value.version}`);
  }
  if (value.fingerprint !== 'a3abc66b4595a426fe6a3969b396f24cd9ecfaf3189411cf1a7ea0db9b2feab0') {
    throw new Error('North Carolina insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/north-carolina') throw new Error('path');
  if (value.company_lookup.count != null) throw new Error('do not invent company census');
  if (value.agency_roster.count != null) throw new Error('do not invent agency count');
  if (value.producer_roster.count != null) throw new Error('do not invent producer count');
  if (value.surplus_lines.count != null) throw new Error('do not invent surplus census');
  if (value.complaints.count != null) throw new Error('do not invent complaint census');
  if (value.licensing_actions.document_rows !== 2874) throw new Error('licensing actions drifted');
  if (value.licensing_actions.producer_rows !== 1717) throw new Error('producer actions drifted');
  if (value.licensing_actions.business_entity_rows !== 255) throw new Error('BE actions drifted');
  if (value.licensing_actions.adjuster_rows !== 72) throw new Error('adjuster actions drifted');
  if (value.licensing_actions.unique_matters != null) throw new Error('unique matters must stay null');
  if (value.market_conduct.document_rows !== 138) throw new Error('market exams drifted');
  if (value.financial_exams.document_rows !== 158) throw new Error('financial exams drifted');
  if (value.market_share.homeowners_multiple_peril_rows !== 199) throw new Error('homeowners drifted');
  if (value.market_share.federal_flood_rows !== 25) throw new Error('federal flood drifted');
  if (value.market_share.private_flood_rows !== 125) throw new Error('private flood drifted');
  if (value.market_share.workers_compensation_rows !== 423) throw new Error('workers comp drifted');
  if (value.receiverships.named_current_estates !== 6) throw new Error('receivership estates drifted');
  if (value.attachments.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');
  if (value.expansion_ledger.GRAPH_WRITES !== 0) throw new Error('no graph writes');
  if (value.claim_eligibility.broadened !== false) throw new Error('claim frozen');
  if (value.no_north_carolina_local_pages !== true) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  if (value.agency_roster.business_entity_license_has_no_line_of_authority !== true) {
    throw new Error('BE license has no LOA');
  }
  if (value.market_share.company_line_is_not_agency_product !== true) {
    throw new Error('company line != agency product');
  }
  if (value.financial_exams.financial_exam_is_not_market_conduct !== true) {
    throw new Error('financial != market conduct');
  }
  if (value.licensing_actions.licensing_action_is_not_complaint !== true) {
    throw new Error('action != complaint');
  }
  return value;
}
