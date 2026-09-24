import accepted from './accepted-snapshot.json';

export type GeorgiaInsuranceSnapshot = typeof accepted;

export const GEORGIA_SNAPSHOT = accepted as GeorgiaInsuranceSnapshot;

export const GA_STATE_INTEL_VERSION_CHECK = 'insurance-ga-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function assertGeorgiaInsurance(
  value: GeorgiaInsuranceSnapshot = GEORGIA_SNAPSHOT,
): GeorgiaInsuranceSnapshot {
  if (value.version !== GA_STATE_INTEL_VERSION_CHECK) {
    throw new Error(`Unexpected Georgia contract ${value.version}`);
  }
  if (value.fingerprint !== '64c082caedf4f9c15f12ee28df61f11fced3bb6c3728a864e313a8cc4cbd2608') {
    throw new Error('Georgia insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/georgia') throw new Error('path');
  if (value.populations.agency_roster !== 'NOT_ACQUIRED') throw new Error('agency roster');
  if (value.populations.producer_roster !== 'NOT_ACQUIRED') throw new Error('producer roster');
  if (value.populations.company_roster !== 'NOT_ACQUIRED') throw new Error('company roster');
  if (value.populations.verification !== 'KNOWN') throw new Error('verification');
  if (value.populations.existing_atlanta_hub_copy_is_not_oci_census !== true) {
    throw new Error('atlanta hub is not a census');
  }
  if (value.agency_structure.branch_licensing !== 'ELIMINATED') throw new Error('branch licensing');
  if (value.agency_structure.hb410_signed !== '2025-05-14') throw new Error('hb410 date');
  if (value.agency_structure.do_not_publish_current_branch_census !== true) {
    throw new Error('no current branch census');
  }
  if (value.receiverships.index_entities !== 7) throw new Error('index entities');
  if (value.receiverships.later_announcements !== 2) throw new Error('later announcements');
  if (value.receiverships.events.length !== 9) throw new Error('event rows');
  if (value.receiverships.exact_naic_attachments !== 0) throw new Error('naic attachments');
  if (value.receiverships.exact_agency_attachments !== 0) throw new Error('agency attachments');
  if (value.receiverships.order_dates_for_index_pdfs !== 'NOT_ACQUIRED') {
    throw new Error('index order dates stay unextracted');
  }
  if (value.mental_health_parity.company_level_orders !== 'NOT_ACQUIRED') {
    throw new Error('parity orders');
  }
  if (value.mental_health_parity.exact_naic_attachments !== 0) throw new Error('parity naic');
  if (value.mental_health_parity.examinations_described !== 22) throw new Error('parity exams');
  if (value.complaints.count != null) throw new Error('do not invent complaint census');
  if (value.complaints.public_dataset !== 'NOT_ACQUIRED') throw new Error('complaint dataset');
  if (value.complaints.intake !== 'KNOWN') throw new Error('complaint intake');
  if (value.expansion_ledger.GRAPH_WRITES !== 0) throw new Error('no graph writes');
  if (value.expansion_ledger.NET_NEW_PUBLIC_PROFILES !== 0) throw new Error('no new profiles');
  if (value.expansion_ledger.CLAIM_ELIGIBILITY_BROADENED !== false) throw new Error('claim frozen');
  if (value.no_georgia_local_routes !== true) throw new Error('no local routes');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  if (value.capabilities.serff !== 'NOT_ACQUIRED') throw new Error('serff');
  if (value.capabilities.historical_branch_census !== 'UNSUPPORTED') throw new Error('branch census');
  const indexNames = value.receiverships.events.filter((event) => event.list === 'receivership_index');
  if (indexNames.length !== 7) throw new Error('index grain');
  if (indexNames.some((event) => event.order_date != null)) throw new Error('do not invent index order dates');
  if (indexNames.some((event) => event.grain !== 'insurer')) throw new Error('receivership grain');
  return value;
}
