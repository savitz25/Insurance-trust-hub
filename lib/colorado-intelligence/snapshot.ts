import accepted from './accepted-snapshot.json';

export type ColoradoInsuranceSnapshot = typeof accepted;

export const COLORADO_SNAPSHOT = accepted as ColoradoInsuranceSnapshot;

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertColoradoInsurance(
  value: ColoradoInsuranceSnapshot = COLORADO_SNAPSHOT,
): ColoradoInsuranceSnapshot {
  if (value.version !== CO_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Colorado contract ${value.version}`);
  }
  if (value.fingerprint !== '1430467e59b9b5555643853c077369e9132b26f2a445eb34285d16124742ef89') {
    throw new Error('Colorado insurance snapshot fingerprint drifted');
  }
  if (value.statistical_report.naic_companies_tab.company_directory_rows !== 1839) {
    throw new Error('2025 NAIC Companies directory rows drifted');
  }
  if (value.statistical_report.naic_companies_tab.distinct_naic !== 1839) {
    throw new Error('2025 distinct NAIC drifted');
  }
  if (value.statistical_report.not_a_live_roster !== true) {
    throw new Error('Statistical report must remain not a live roster');
  }
  if (value.surplus_lines.eligible_identities !== 259) {
    throw new Error('Surplus-lines eligible identities drifted');
  }
  if (value.surplus_lines.naic_cocode_identities !== 225 || value.surplus_lines.alien_aa_identities !== 34) {
    throw new Error('Surplus-lines NAIC/alien split drifted');
  }
  if (value.surplus_lines.effective_through !== '2027-06-30') {
    throw new Error('Current surplus effective-through drifted');
  }
  if (value.surplus_lines.prior_2025_2026_list.effective_through !== '2026-06-30') {
    throw new Error('Historical surplus period must remain visible');
  }
  if (value.complaints.complaint_index_is_not_trusthub_score !== true) {
    throw new Error('Complaint Index must not be a TrustHub score');
  }
  if (value.complaints.standard_ratio_index.company_line_rows !== 415) {
    throw new Error('2025 standard complaint rows drifted');
  }
  if (value.complaints.annual.recoveries_total_usd !== 17607341) {
    throw new Error('official recoveries aggregate drifted');
  }
  if (value.complaints.annual.recoveries_displayed_pc_lh_subtotal_usd !== 17607088) {
    throw new Error('displayed P&C+L&H recoveries subtotal drifted');
  }
  if (value.complaints.annual.recoveries_unattributed_difference_usd !== 253) {
    throw new Error('unattributed recoveries difference drifted');
  }
  if (value.complaints.annual.recoveries_displayed_lines_do_not_equal_official_total !== true) {
    throw new Error('component recoveries must not be treated as reconciling to the official total');
  }
  if (value.expansion_ledger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) {
    throw new Error('read-only NAIC match is not enrichment');
  }
  if (value.naic_crosswalk.CROSSWALK_STATUS !== 'EXECUTED') {
    throw new Error('NAIC crosswalk must be executed');
  }
  if (value.producer_roster.CO_PRODUCER_BULK_ROSTER !== 'SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY') {
    throw new Error('Producer roster restriction drifted');
  }
  if (value.agency_roster.CO_AGENCY_BULK_ROSTER !== 'SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY') {
    throw new Error('Agency roster access drifted');
  }
  if (value.producer_roster.count != null || value.agency_roster.count != null) {
    throw new Error('Do not invent producer or agency counts');
  }
  if (value.authorized_insurers.count != null) {
    throw new Error('Do not invent a current authorized-insurer count');
  }
  if (value.expansion_ledger.NET_NEW_CANONICAL_LEGAL_INSURERS !== 0) {
    throw new Error('Do not mint canonical legal insurers from this closeout');
  }
  if (value.expansion_ledger.NET_NEW_CANONICAL_AGENCIES !== 0) {
    throw new Error('Do not mint canonical agencies from this closeout');
  }
  if (value.no_colorado_county_pages !== true || value.no_denver_route !== true) {
    throw new Error('Colorado county/Denver pages are forbidden');
  }
  return value;
}

const CO_STATE_INTEL_VERSION_CHECK = 'insurance-co-state-intel-v1';
