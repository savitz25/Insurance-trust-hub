import accepted from './accepted-snapshot.json';

export type NevadaInsuranceSnapshot = typeof accepted;

export const NEVADA_SNAPSHOT = accepted as NevadaInsuranceSnapshot;

export const NV_STATE_INTEL_VERSION_CHECK = 'insurance-nv-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function assertNevadaInsurance(value: NevadaInsuranceSnapshot = NEVADA_SNAPSHOT): NevadaInsuranceSnapshot {
  if (value.version !== NV_STATE_INTEL_VERSION_CHECK) throw new Error(`Unexpected Nevada contract ${value.version}`);
  if (value.fingerprint !== '633d2f8bbcde1f817532ccf3c02e9ba0deda879ed4ebac79046736acbcf19c55') {
    throw new Error('Nevada insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/nevada') throw new Error('path');
  if (value.source_as_of !== null) throw new Error('no single Nevada source clock');
  if (value.retrieved_at.slice(0, 10) !== '2026-09-25') throw new Error('retrieval clock');

  // Regulator-stated census: NDOI's words and clock, never our count, never summed.
  const census = value.market_report_census;
  if (census.figures_as_of_month !== '2024-10' || !census.regulator_statement_not_our_count) throw new Error('census clock');
  const lic = census.licensees;
  if (lic.individual_licensees !== 250551 || lic.agency_licensees !== 16810 || lic.captive_licensees !== 147) throw new Error('licensee figures');
  if (lic.individual_resident + lic.individual_non_resident !== lic.individual_licensees) throw new Error('individual partition');
  if (lic.agency_resident + lic.agency_non_resident !== lic.agency_licensees) throw new Error('agency partition');
  if (lic.republished_as_combined_total !== false || !lic.report_total_excludes_listed_captives) throw new Error('no combined licensee total');
  const co = census.companies;
  if (co.licensed_domestic_and_foreign_insurers !== 1652 || co.captive_insurers !== 147 || co.surplus_lines_insurers_approximate !== 160) {
    throw new Error('company figures');
  }
  if (!co.never_summed || !co.surplus_lines_is_non_admitted) throw new Error('company figures stay separate');

  // Rosters: unknown, not zero.
  for (const roster of [value.legal_companies, value.agency_roster, value.producer_roster]) {
    if (roster.count !== null) throw new Error('bulk roster must stay unknown, not zero');
    if (roster.verification !== 'KNOWN') throw new Error('verification');
  }
  if (!value.agency_roster.existing_directory_is_not_ndoi_census) throw new Error('existing directory is not a census');
  if (value.legal_companies.nevada_credentials_in_national_graph !== 0 || !value.legal_companies.national_spine_is_not_nevada_authority) {
    throw new Error('national spine is not Nevada authority');
  }
  if (value.license_lookup.surplus_lines_visible !== false) throw new Error('surplus lines are not in the lookup');
  if (value.producer_roster.person_names_published_here !== false) throw new Error('producer privacy');

  // Authority instruments stay source-native.
  const auth = value.company_authority;
  if (!auth.instruments_never_collapsed_to_licensed || !auth.risk_retention_registration_is_not_certificate_of_authority) {
    throw new Error('authority instruments');
  }
  if (!auth.company_type_is_not_product_offer || auth.workers_comp_authority_lens !== 'NOT_ACQUIRED') throw new Error('product lens');

  // Enforcement: the one listed order, standalone, no invented list date.
  const e = value.enforcement;
  if (e.list_date !== null || e.listed_orders !== 1 || e.orders.length !== 1) throw new Error('enforcement listing');
  const order = e.orders[0];
  if (order.cause_number !== '26.0028' || order.listed_date !== '2026-06-26' || order.order_type_as_printed !== 'Consent Agreement and Order') {
    throw new Error('order fields');
  }
  if (order.exact_attachment !== null || e.exact_attachments.EXACT_NAIC_ATTACHMENTS !== 0 || e.exact_attachments.NAME_ONLY_ATTACHMENTS !== 'UNSUPPORTED') {
    throw new Error('no adverse joins');
  }
  if (order.identifiers_printed.naic.length || order.identifiers_printed.npn.length) throw new Error('order prints no NAIC / NPN');

  const m = value.mhpaea_reports;
  if (m.company_reports !== 17 || m.rows.length !== 17 || m.pdfs_parsed !== false || m.exact_naic_attachments !== 0) throw new Error('MHPAEA index');
  if (!m.draft_report_is_not_a_finding) throw new Error('MHPAEA semantics');

  // Complaint data: aggregates only; rows are not complaints; nothing attached, no names.
  const c = value.complaint_data;
  if (c.rows_2024 !== 6019 || c.years['2023'].complaint_reason_rows !== 5215 || c.years['2022'].complaint_reason_rows !== 4624) {
    throw new Error('complaint rows');
  }
  for (const [year, y] of Object.entries(c.years)) {
    const parts = [y.coverage_type, y.reason_category, y.disposition].map((part) => Object.values(part).reduce((sum, n) => sum + n, 0));
    if (parts.some((n) => n !== y.complaint_reason_rows)) throw new Error(`${year} complaint partitions`);
    if (!y.opened_first.startsWith(year) || !y.opened_last.startsWith(year)) throw new Error(`${year} opened clock`);
  }
  if (c.respondent_names_published_here !== false || c.exact_attachments !== 0 || c.name_only_attachment !== 'UNSUPPORTED') {
    throw new Error('complaint privacy / attachment');
  }
  if (!c.rows_are_not_complaints || !c.complaint_is_not_enforcement || !c.complaint_count_is_not_quality_score || !c.no_company_complaint_ranking) {
    throw new Error('complaint semantics');
  }
  if (value.serff.filings_ingested !== 0 || !value.serff.filings_are_not_ratings_or_prices) throw new Error('SERFF is capability only');

  for (const [key, n] of Object.entries(value.expansion_ledger)) {
    if (typeof n === 'number' && n !== 0) throw new Error(`${key} must be 0`);
  }
  if (value.expansion_ledger.CLAIM_ELIGIBILITY_BROADENED !== false) throw new Error('claim eligibility frozen');
  if (value.capabilities.combined_nevada_insurance_total !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_join !== 'UNSUPPORTED') throw new Error('no name-only adverse join');
  if (value.no_nevada_local_routes !== true) throw new Error('no local routes');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  return value;
}
