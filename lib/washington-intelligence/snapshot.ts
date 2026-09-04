import accepted from './accepted-snapshot.json';

export type WashingtonInsuranceSnapshot = typeof accepted;

export const WASHINGTON_SNAPSHOT = accepted as WashingtonInsuranceSnapshot;

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtHero(value: string | number | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'number') return fmtInt(value);
  return value;
}

export function assertWashingtonInsurance(
  value: WashingtonInsuranceSnapshot = WASHINGTON_SNAPSHOT,
): WashingtonInsuranceSnapshot {
  if (value.version !== WA_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Washington contract ${value.version}`);
  }
  if (value.fingerprint !== '17128d3a8dac4ea1457b5a02269fe25de2b1312e6dfa9bb553a8af9c06ea66ac') {
    throw new Error('Washington insurance snapshot fingerprint drifted');
  }
  if (value.annual_aggregates.regulated_entities !== 2924) {
    throw new Error('OIC regulated-entity aggregate drifted');
  }
  if (value.annual_aggregates.domestic !== 263 || value.annual_aggregates.foreign !== 2590 || value.annual_aggregates.alien !== 71) {
    throw new Error('OIC domestic/foreign/alien split drifted');
  }
  if (value.annual_aggregates.not_a_live_roster !== true) {
    throw new Error('Annual aggregate must remain not a live roster');
  }
  if (value.producer_roster.WA_PRODUCER_BULK_ROSTER !== 'SOURCE_USE_RESTRICTED / SEARCH_ONLY') {
    throw new Error('Producer roster restriction drifted');
  }
  if (value.agency_roster.WA_AGENCY_BULK_ROSTER !== 'SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY') {
    throw new Error('Agency roster access drifted');
  }
  if (value.producer_roster.count != null || value.agency_roster.count != null) {
    throw new Error('Do not invent producer or agency counts');
  }
  if (value.expansion_ledger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Do not mint canonical organizations from this closeout');
  }
  if (value.no_washington_county_pages !== true) {
    throw new Error('Washington county pages are forbidden');
  }
  return value;
}

const WA_STATE_INTEL_VERSION_CHECK = 'insurance-wa-state-intel-v1';
