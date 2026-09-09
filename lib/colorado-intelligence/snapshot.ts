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
  if (value.fingerprint !== '1d94a9a07a60f94e2a32e7a7666d4568fd79f0dcfe3963f348841ea7db11f668') {
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
  if (value.surplus_lines.eligible_identities !== 247) {
    throw new Error('Surplus-lines eligible identities drifted');
  }
  if (value.surplus_lines.naic_cocode_identities !== 215 || value.surplus_lines.alien_aa_identities !== 32) {
    throw new Error('Surplus-lines NAIC/alien split drifted');
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
