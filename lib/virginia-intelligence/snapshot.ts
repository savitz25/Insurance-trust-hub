import accepted from './accepted-snapshot.json';
import { CANONICAL_VA_SNAPSHOT_FINGERPRINT, VA_STATE_INTEL_VERSION } from './publication';

export type VirginiaInsuranceSnapshot = typeof accepted;
export const VIRGINIA_SNAPSHOT = accepted as VirginiaInsuranceSnapshot;

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function assertVirginiaInsurance(
  value: VirginiaInsuranceSnapshot = VIRGINIA_SNAPSHOT,
): VirginiaInsuranceSnapshot {
  if (value.version !== VA_STATE_INTEL_VERSION) {
    throw new Error(`Unexpected Virginia contract ${value.version}`);
  }
  if (value.fingerprint !== CANONICAL_VA_SNAPSHOT_FINGERPRINT) {
    throw new Error('Virginia insurance snapshot fingerprint drifted');
  }
  if (value.statistical_report.distinct_naic !== 1546) {
    throw new Error('2025 statistical-report distinct NAIC drifted');
  }
  if (value.statistical_report.not_current_authorization !== true) {
    throw new Error('Statistical report must remain not current authorization');
  }
  if (value.statistical_report.premium_is_not_quality !== true) {
    throw new Error('Premium must not be quality');
  }
  if (value.regulatory_actions.observation_rows !== 124) {
    throw new Error('Regulatory action rows drifted');
  }
  if (value.regulatory_actions.distinct_cases !== 79) {
    throw new Error('Regulatory action cases drifted');
  }
  if (value.regulatory_actions.action_is_not_conviction !== true) {
    throw new Error('Regulatory action must not mean conviction');
  }
  if (value.market_conduct.observation_rows !== 117) {
    throw new Error('Market conduct rows drifted');
  }
  if (value.market_conduct.examination_is_not_violation !== true) {
    throw new Error('Market conduct exam must not mean violation');
  }
  if (value.current_company_verification.coverage !== 'OPEN_SEARCH_ONLY') {
    throw new Error('Current company verification must remain search-only');
  }
  if (value.producer_roster.count != null || value.agency_roster.count != null) {
    throw new Error('Fake producer/agency count');
  }
  if (value.naic_crosswalk.CROSSWALK_STATUS !== 'EXECUTED') {
    throw new Error('NAIC crosswalk missing');
  }
  if (value.naic_crosswalk.spine_legal_insurers !== 6185) {
    throw new Error('Spine size drifted');
  }
  if (value.naic_crosswalk.read_only !== true || value.naic_crosswalk.graph_write !== false) {
    throw new Error('Crosswalk must stay read-only');
  }
  if (value.expansion_ledger.NET_NEW_CANONICAL_LEGAL_INSURERS !== 0) {
    throw new Error('Do not mint legal insurers');
  }
  if (value.expansion_ledger.NET_NEW_PUBLIC_PROFILES !== 0) {
    throw new Error('Do not mint profiles');
  }
  if (value.expansion_ledger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) {
    throw new Error('Do not write graph enrichment');
  }
  if (value.expansion_ledger.NET_NEW_CANONICAL_AGENCIES !== 0) {
    throw new Error('Do not mint agencies');
  }
  if (value.expansion_ledger.NET_NEW_CANONICAL_PERSONS !== 0) {
    throw new Error('Do not mint persons');
  }
  if (value.expansion_ledger.EXACT_PROFILE_ATTACHMENTS !== 0) {
    throw new Error('Do not attach profiles');
  }
  const statUnmatched = value.naic_crosswalk.statistical_report.unmatched_naic;
  const actUnmatched = value.naic_crosswalk.regulatory_actions.unmatched_naic;
  const mcUnmatched = value.naic_crosswalk.market_conduct.unmatched_naic;
  if (!statUnmatched.includes('15791') || !actUnmatched.includes('15791')) {
    throw new Error('15791 must appear in both statistical and regulatory unmatched sets');
  }
  const union = [...new Set([...statUnmatched, ...actUnmatched, ...mcUnmatched])].sort();
  if (union.length !== 5) {
    throw new Error('High-yield unmatched NAIC union must be 5 unique IDs');
  }
  if (statUnmatched.length + actUnmatched.length + mcUnmatched.length !== 6) {
    throw new Error('Layer unmatched count sum must remain 6');
  }
  if (value.expansion_ledger.UNIQUE_UNMATCHED_NAIC_IDS_ACROSS_HIGH_YIELD_LAYERS !== 5) {
    throw new Error('Unique unmatched union drifted');
  }
  if (value.expansion_ledger.LAYER_UNMATCHED_COUNT_SUM === value.expansion_ledger.UNIQUE_UNMATCHED_NAIC_IDS_ACROSS_HIGH_YIELD_LAYERS) {
    throw new Error('Layer unmatched sum must not equal unique union');
  }
  if (value.expansion_ledger.EXACT_NAIC_MATCH_OBSERVATIONS !== 1727) {
    throw new Error('Exact-match observation aggregate drifted');
  }
  if (value.expansion_ledger.EXACT_NAIC_CROSSWALKS !== 1727) {
    throw new Error('EXACT_NAIC_CROSSWALKS aggregate drifted');
  }
  if (value.expansion_ledger.EXACT_NAIC_CROSSWALKS_GRAIN !== 'sum_of_layer_specific_exact_match_counts') {
    throw new Error('EXACT_NAIC_CROSSWALKS grain must remain a layer-observation sum');
  }
  if (value.expansion_ledger.EXACT_NAIC_CROSSWALKS_NOT_UNIQUE_NAIC_IDS !== true) {
    throw new Error('EXACT_NAIC_CROSSWALKS must not be unique NAIC IDs');
  }
  if (value.expansion_ledger.UNMATCHED_UNION_EXCLUDES_FINANCIAL_EXAMS !== true) {
    throw new Error('Financial-exam unmatched IDs must stay out of the high-yield union');
  }
  if (value.claim_eligibility.broadened !== false) {
    throw new Error('Claim eligibility must stay unchanged');
  }
  if (value.no_trust_score !== true || value.no_paid_ranking !== true) {
    throw new Error('Trust Score / ranking forbidden');
  }
  if (value.publication.path !== '/virginia' || value.no_virginia_county_pages !== true) {
    throw new Error('Statewide /virginia only');
  }
  if (value.period_end !== '2025-12-31' || value.reported_as_of !== '2026-06-01') {
    throw new Error('Statistical-report clocks drifted');
  }
  if (value.identity.company_is_not_agency !== true || value.identity.company_is_not_producer !== true) {
    throw new Error('Company/agency/producer grains collapsed');
  }
  const combined =
    value.statistical_report.distinct_naic +
    value.regulatory_actions.observation_rows +
    value.market_conduct.observation_rows;
  if (JSON.stringify(value).includes(`virginiaInsuranceCompanies":${combined}`)) {
    throw new Error('Combined Virginia insurance-company total leaked');
  }
  return value;
}
