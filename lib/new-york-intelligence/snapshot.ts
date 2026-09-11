import accepted from './accepted-snapshot.json';
import { CANONICAL_NY_SNAPSHOT_FINGERPRINT, NY_STATE_INTEL_VERSION } from './publication';

export type NewYorkInsuranceSnapshot = typeof accepted;
export const NEW_YORK_SNAPSHOT = accepted as NewYorkInsuranceSnapshot;

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function assertNewYorkInsurance(
  value: NewYorkInsuranceSnapshot = NEW_YORK_SNAPSHOT,
): NewYorkInsuranceSnapshot {
  if (value.version !== NY_STATE_INTEL_VERSION) {
    throw new Error(`Unexpected New York contract ${value.version}`);
  }
  if (value.fingerprint !== CANONICAL_NY_SNAPSHOT_FINGERPRINT) {
    throw new Error('New York insurance snapshot fingerprint drifted');
  }
  if (value.company_directory.directory_rows !== 1054) {
    throw new Error('DFS directory rows drifted');
  }
  if (value.company_directory.distinct_naic !== 1054) {
    throw new Error('DFS distinct NAIC drifted');
  }
  if (value.company_directory.rows_without_naic !== 0) {
    throw new Error('Directory rows without NAIC drifted');
  }
  if (value.company_directory.row_is_not_current_authorization !== true) {
    throw new Error('Directory must not mean current authorization');
  }
  if (value.current_authorization.count != null) {
    throw new Error('Do not invent a current authorized-insurer count');
  }
  if (value.enforcement_actions.observation_rows !== 147) {
    throw new Error('Enforcement rows drifted');
  }
  if (value.enforcement_actions.action_is_not_conviction !== true) {
    throw new Error('Enforcement action must not mean conviction');
  }
  if (value.enforcement_actions.naic_attached !== false) {
    throw new Error('Enforcement table must stay unattached without NAIC');
  }
  if (value.auto_complaints.observation_rows !== 128) {
    throw new Error('Auto complaint rows drifted');
  }
  if (value.auto_complaints.dfs_rank_is_not_trusthub_rank !== true) {
    throw new Error('DFS rank must not be TrustHub rank');
  }
  if (value.auto_complaints.ratio_is_not_trust_score !== true) {
    throw new Error('Complaint ratio must not be Trust Score');
  }
  if (value.health_complaints.observation_rows != null) {
    throw new Error('Do not invent a health complaint observation total');
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
  if (value.naic_crosswalk.company_directory.EXACT_EXISTING_LEGAL_INSURER_MATCHES !== 1051) {
    throw new Error('Directory spine matches drifted');
  }
  if (value.naic_crosswalk.company_directory.UNMATCHED_NAIC !== 3) {
    throw new Error('Directory unmatched NAIC drifted');
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
  if (value.claim_eligibility.broadened !== false) {
    throw new Error('Claim eligibility must stay unchanged');
  }
  if (value.no_trust_score !== true || value.no_paid_ranking !== true) {
    throw new Error('Trust Score / ranking forbidden');
  }
  if (value.publication.path !== '/new-york' || value.no_new_york_local_pages !== true) {
    throw new Error('Statewide /new-york only');
  }
  if (value.identity.company_is_not_agency !== true || value.identity.company_is_not_producer !== true) {
    throw new Error('Company/agency/producer grains collapsed');
  }
  if (value.identity.naic_is_not_group !== true) {
    throw new Error('NAIC must not equal group');
  }
  if (value.identity.name_only !== 'UNSAFE') {
    throw new Error('Name-only joins must remain unsafe');
  }
  if (value.grain_classification.company_directory !== 'VISIBLE_PUBLIC_METRIC') {
    throw new Error('Directory grain must be public');
  }
  if (value.market_conduct.examination_is_not_violation !== true) {
    throw new Error('Market conduct exam must not mean violation');
  }
  return value;
}
