import accepted from './accepted-snapshot.json';

export type TennesseeInsuranceSnapshot = typeof accepted;

export const TENNESSEE_SNAPSHOT = accepted as TennesseeInsuranceSnapshot;

export const TN_STATE_INTEL_VERSION_CHECK = 'insurance-tn-state-intel-v1';

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function assertTennesseeInsurance(
  value: TennesseeInsuranceSnapshot = TENNESSEE_SNAPSHOT,
): TennesseeInsuranceSnapshot {
  if (value.version !== TN_STATE_INTEL_VERSION_CHECK) throw new Error(`Unexpected Tennessee contract ${value.version}`);
  if (value.fingerprint !== 'bb82b021809e2deaf5355dd8d30e5d751483f51cb708a9c77bf79fad8eed1bf8') {
    throw new Error('Tennessee insurance snapshot fingerprint drifted');
  }
  if (value.publication.path !== '/tennessee') throw new Error('path');
  if (value.source_as_of !== '2026-08-31') throw new Error('licensed-company source clock');
  if (value.retrieved_at.slice(0, 10) === value.source_as_of) throw new Error('retrieval is not the source date');

  const list = value.licensed_companies;
  if (list.raw_rows !== 2116 || list.blank_rows !== 1 || list.listed_rows !== 2115) throw new Error('licensed-company rows');
  if (list.rows_with_naic !== 2115 || list.placeholder_rows !== 72 || list.rows_with_exact_naic !== 2043) throw new Error('NAIC partition');
  if (list.rows_with_exact_naic + list.placeholder_rows !== list.rows_with_naic) throw new Error('placeholder partition');
  if (list.distinct_naic !== 2029 || list.naic_on_two_rows !== 14) throw new Error('distinct NAIC identities');
  if (Number(list.distinct_naic) === Number(list.raw_rows)) throw new Error('rows are not insurers');
  if (list.placeholder_naic !== '99999') throw new Error('placeholder code');
  const semantics = Object.values(list.semantics);
  if (semantics.length < 10 || semantics.some((flag) => flag !== true)) throw new Error('column semantics');
  if (Object.values(list.status_reasons).reduce((sum, n) => sum + n, 0) !== list.listed_rows) throw new Error('status partition');
  if (Object.values(list.company_types).reduce((sum, n) => sum + n, 0) !== list.listed_rows) throw new Error('type partition');
  if (!list.withheld_columns.includes('BUSINESS_PHONE') || !list.withheld_columns.includes('MAO_ADDRESS1')) throw new Error('withheld columns');

  const xw = value.naic_crosswalk.licensed_companies;
  if (xw.SOURCE_DISTINCT_NAIC !== list.distinct_naic) throw new Error('crosswalk source');
  if (xw.SOURCE_DISTINCT_NAIC !== xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES + xw.UNMATCHED_NAIC) throw new Error('crosswalk partition');
  if (xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES !== 2022 || xw.UNMATCHED_NAIC !== 7) throw new Error('crosswalk counts');
  if (xw.graph_write !== false || !xw.exact_match_is_not_profile_attachment) throw new Error('crosswalk is read-only');
  if (value.profile_attachments.EXACT_PROFILE_ATTACHMENTS !== 0) throw new Error('no profile attachments');

  const m = value.company_activity_updates;
  if (m.source_as_of !== '2026-08-31' || m.event_rows !== 83) throw new Error('monthly update events');
  if (!m.event_is_not_a_company || !m.not_a_second_company_census || !m.exact_naic_only) throw new Error('event semantics');

  const a = value.company_actions;
  if (a.list_date !== null) throw new Error('the actions archive prints no list date');
  if (a.index_lines !== 234 || a.linked_documents !== 235) throw new Error('company-action index');
  if (a.captions_published + a.captions_withheld !== a.index_lines) throw new Error('caption partition');
  if (!a.document_links_withheld || a.action_type_column !== 'NOT_PRINTED') throw new Error('action link / type handling');
  if (a.exact_attachments.EXACT_NAIC_ATTACHMENTS !== 0 || a.exact_attachments.NAME_ONLY_ATTACHMENTS !== 'UNSUPPORTED') {
    throw new Error('no adverse joins');
  }
  if (!a.standalone_events || !a.not_every_entry_is_punitive) throw new Error('action semantics');

  const e = value.company_examinations;
  if (e.listings !== 293 || e.pdfs_parsed !== false || e.exact_naic_attachments !== 0) throw new Error('examination index');
  if (!e.examination_is_not_a_score || e.name_only_attachment !== 'UNSUPPORTED') throw new Error('examination semantics');

  const p = value.producer_discipline;
  if (p.names_published_here !== false || p.attached_to_agency_or_insurer !== 0) throw new Error('producer discipline privacy');

  for (const roster of [value.agency_roster, value.producer_roster]) {
    if (roster.count !== null) throw new Error('bulk roster must stay unknown, not zero');
    if (roster.verification !== 'KNOWN') throw new Error('roster verification');
  }
  if (!value.agency_roster.existing_graph_is_not_tn_agency_census) throw new Error('existing graph is not a census');
  if (value.complaints.count !== null || value.complaints.tn_company_level_dataset !== 'NOT_ACQUIRED') throw new Error('complaints');
  if (!value.complaints.complaint_is_not_enforcement || !value.complaints.complaint_ratio_is_not_quality_score) throw new Error('complaint semantics');

  for (const [key, n] of Object.entries(value.expansion_ledger)) {
    if (typeof n === 'number' && n !== 0) throw new Error(`${key} must be 0`);
  }
  if (value.expansion_ledger.CLAIM_ELIGIBILITY_BROADENED !== false) throw new Error('claim eligibility frozen');
  if (value.capabilities.combined_tennessee_insurance_total !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_join !== 'UNSUPPORTED') throw new Error('no name-only adverse join');
  if (value.no_tennessee_local_routes !== true) throw new Error('no local routes');
  if (!value.no_trust_score || !value.no_paid_ranking) throw new Error('no ranking');
  return value;
}
