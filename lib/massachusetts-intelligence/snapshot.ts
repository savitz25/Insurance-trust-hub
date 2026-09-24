import accepted from './accepted-snapshot.json';

export type MassachusettsInsuranceSnapshot = typeof accepted;

export const MASSACHUSETTS_SNAPSHOT = accepted as MassachusettsInsuranceSnapshot;

export const MA_STATE_INTEL_VERSION_CHECK = 'insurance-ma-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function assertMassachusettsInsurance(
  value: MassachusettsInsuranceSnapshot = MASSACHUSETTS_SNAPSHOT,
): MassachusettsInsuranceSnapshot {
  if (value.version !== MA_STATE_INTEL_VERSION_CHECK) throw new Error(`Unexpected Massachusetts contract ${value.version}`);
  if (value.fingerprint !== 'fe08b5e2b602f9a7b3af61ea1986b678fda98d53e00e1efbdaf060e4b4d88f17') {
    throw new Error('Massachusetts insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/massachusetts') throw new Error('path');
  if (value.source_as_of !== '2026-09-01') throw new Error('company-list source clock');
  if (value.retrieved_at === value.source_as_of) throw new Error('retrieval is not the source date');

  const list = value.licensed_or_approved;
  if (list.rows !== 2716 || list.distinct_naic !== 1693 || list.rows_missing_naic !== 1000) throw new Error('licensed-or-approved grain');
  if (list.rows_with_naic + list.rows_missing_naic !== list.rows) throw new Error('NAIC partition');
  if (list.naic_on_two_rows !== 23) throw new Error('two-row NAIC identities');
  if (Number(list.distinct_naic) === Number(list.rows)) throw new Error('rows are not insurers');
  if (!list.state_column_is_address_not_domicile || !list.surplus_lines_type_is_not_admitted) throw new Error('column semantics');

  const d = value.designations;
  const expected: Record<string, number> = {
    auto_liability_6g: 587,
    workers_comp_6e: 486,
    health_6b: 566,
    eligible_surplus_lines: 212,
    domestic_life: 16,
    domestic_pc: 49,
    fidelity_surety_4: 514,
  };
  for (const [key, rows] of Object.entries(expected)) {
    const layer = d[key as keyof typeof d];
    if (layer.rows !== rows || layer.distinct_naic !== rows) throw new Error(`${key} grain`);
    if (!layer.all_naic_on_licensed_or_approved_list) throw new Error(`${key} subset`);
    if (layer.source_as_of !== value.source_as_of) throw new Error(`${key} clock`);
  }
  if (value.designations_are_not_additive !== true) throw new Error('designations are never summed');
  if (!d.eligible_surplus_lines.eligible_is_not_admitted) throw new Error('surplus lines eligibility is not admitted status');

  const xw = value.naic_crosswalk.licensed_or_approved;
  if (xw.SOURCE_DISTINCT_NAIC !== list.distinct_naic) throw new Error('crosswalk source');
  if (xw.SOURCE_DISTINCT_NAIC !== xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES + xw.UNMATCHED_NAIC) throw new Error('crosswalk partition');
  if (xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES !== 1665 || xw.UNMATCHED_NAIC !== 28) throw new Error('crosswalk counts');
  if (xw.graph_write !== false || !xw.exact_match_is_not_profile_attachment) throw new Error('crosswalk is read-only');
  if (value.profile_attachments.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');

  const a = value.administrative_actions;
  if (a.observation_rows !== 319 || a.standalone_events !== 319) throw new Error('administrative-action rows');
  if (a.window_years[0] !== 2015 || a.pre_2015 !== 'REQUEST_ONLY') throw new Error('enforcement window');
  if (a.source_as_of !== null) throw new Error('the actions table prints no list date');
  if (!a.allegation_is_not_finding || !a.settlement_agreement_is_informal_resolution) throw new Error('finality semantics');
  if (!a.fine_restitution_not_summed || !a.licensee_names_not_republished) throw new Error('fine / name handling');
  if (a.exact_attachments.EXACT_NAIC_ATTACHMENTS !== 0 || a.exact_attachments.EXACT_MA_LICENSE_ATTACHMENTS !== 0) throw new Error('no adverse joins');
  if (a.exact_attachments.NAME_ONLY_ATTACHMENTS !== 'UNSUPPORTED') throw new Error('name-only joins');
  if (Object.values(a.disposition_classes).reduce((sum, n) => sum + n, 0) !== a.observation_rows) throw new Error('disposition partition');
  if (!a.terms['Settlement Agreement'] || !a.terms['Consent Agreement'] || !a.terms['Administrative Decision']) throw new Error('DOI terms');

  if (value.hearing_decisions.separate_from_administrative_actions !== true || value.hearing_decisions.pdfs_parsed !== false) throw new Error('hearing index grain');
  if (value.market_conduct.exact_naic_attachments !== 0 || value.market_conduct.pdfs_parsed !== false) throw new Error('market-conduct index grain');

  for (const roster of [value.agency_roster, value.producer_roster]) {
    if (roster.count !== null) throw new Error('bulk roster must stay unknown, not zero');
    if (roster.coverage !== 'NOT_ACQUIRED / PAID_OR_REQUEST' || roster.verification !== 'KNOWN') throw new Error('roster coverage');
  }
  if (!value.agency_roster.existing_graph_is_not_ma_agency_census) throw new Error('existing credentials are not a census');
  if (value.complaints.count !== null || value.complaints.provider_level_rows !== 'NOT_ACQUIRED') throw new Error('complaints');
  if (!value.complaints.annual_statement_is_not_a_denominator) throw new Error('2,000 complaints is not a denominator');

  const ledger = value.expansion_ledger;
  for (const [key, n] of Object.entries(ledger)) {
    if (typeof n === 'number' && n !== 0) throw new Error(`${key} must be 0`);
  }
  if (ledger.CLAIM_ELIGIBILITY_BROADENED !== false) throw new Error('claim eligibility frozen');
  if (value.capabilities.combined_massachusetts_insurance_total !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_join !== 'UNSUPPORTED') throw new Error('no name-only adverse join');
  if (value.no_massachusetts_local_routes !== true) throw new Error('no local routes');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  return value;
}
