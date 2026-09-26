import { createHash } from 'node:crypto';
import accepted from './accepted-snapshot.json';

export type MinnesotaInsuranceSnapshot = typeof accepted;

export const MINNESOTA_SNAPSHOT = accepted as MinnesotaInsuranceSnapshot;

export const MN_STATE_INTEL_VERSION_CHECK = 'insurance-mn-state-intel-v1';

export function minnesotaSnapshotFingerprint(value: MinnesotaInsuranceSnapshot = MINNESOTA_SNAPSHOT): string {
  const body = { ...value, fingerprint: '' };
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

export function assertMinnesotaInsurance(value: MinnesotaInsuranceSnapshot = MINNESOTA_SNAPSHOT): MinnesotaInsuranceSnapshot {
  if (value.version !== MN_STATE_INTEL_VERSION_CHECK) throw new Error(`Unexpected Minnesota contract ${value.version}`);
  if (value.fingerprint !== minnesotaSnapshotFingerprint(value)) throw new Error('Minnesota insurance snapshot fingerprint drifted');
  if (value.publication.path !== '/minnesota') throw new Error('path');
  if (value.source_as_of !== null) throw new Error('no single Minnesota source clock');
  if (!value.retrieved_at.startsWith('2026-09-26')) throw new Error('retrieval clock');

  for (const roster of [value.legal_companies, value.agency_roster, value.producer_roster]) {
    if (roster.count !== null) throw new Error('bulk roster must stay unknown, not zero');
    if (roster.verification !== 'KNOWN') throw new Error('verification');
  }
  if (!value.legal_companies.national_spine_is_not_minnesota_authority) throw new Error('national spine is not Minnesota authority');
  if (value.legal_companies.name_only_merge !== 'UNSUPPORTED') throw new Error('no name-only insurer merge');
  if (!value.agency_roster.existing_directory_is_not_commerce_census) throw new Error('directory is not a census');
  if (value.producer_roster.person_names_published_here !== false || !value.producer_roster.person_is_not_agency) {
    throw new Error('producer privacy and grain');
  }
  if (!value.company_authority.classes_not_collapsed || !value.company_authority.class_is_not_product_offer) {
    throw new Error('authority classes');
  }
  if (value.company_authority.product_line_authority !== 'NOT_ACQUIRED') throw new Error('product line');
  if (value.enforcement.rows.length !== 0 || value.enforcement.exact_naic_attachments !== 0 || value.enforcement.exact_npn_attachments !== 0) {
    throw new Error('enforcement index not acquired');
  }
  if (value.enforcement.name_only_attachment !== 'UNSUPPORTED' || !value.enforcement.complaint_is_not_finding) throw new Error('enforcement safety');
  if (value.financial_examinations.rows.length !== 0 || value.financial_examinations.exact_naic_attachments !== 0) throw new Error('exam index');
  if (!value.financial_examinations.exam_is_not_enforcement || !value.financial_examinations.exam_is_not_score) throw new Error('exam semantics');
  if (value.serff.filings_ingested !== 0 || !value.serff.filing_is_not_quote || !value.serff.filing_is_not_recommendation) throw new Error('SERFF');
  if (value.expansion_ledger.GRAPH_WRITES !== 0 || value.expansion_ledger.CLAIM_ELIGIBILITY_BROADENED !== false) throw new Error('ledger');
  if (value.capabilities.combined_minnesota_insurance_total !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_joins !== 'UNSUPPORTED') throw new Error('no name-only join');
  if (value.capabilities.company_bulk_roster !== 'NOT_ACQUIRED') throw new Error('company roster');
  if (value.capabilities.producer_bulk_roster !== 'NOT_ACQUIRED' || value.capabilities.agency_bulk_roster !== 'NOT_ACQUIRED') {
    throw new Error('person and agency rosters');
  }
  if (!value.no_minnesota_local_routes || !value.no_trust_score || !value.no_paid_ranking) throw new Error('publication safety');
  return value;
}
