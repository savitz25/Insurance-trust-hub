-- NJ-INS-001C — expand occurrence acquisition states. Additive. Internal-only.
-- Does not drop prior values. Does not weaken RLS.

alter table insurance_source_occurrences
  drop constraint if exists insurance_source_occurrences_acquisition_state_check;
alter table insurance_source_occurrences
  add constraint insurance_source_occurrences_acquisition_state_check
  check (acquisition_state in (
    'DOCUMENT_DOWNLOADED',
    'INDEX_ONLY',
    'DOCUMENT_UNAVAILABLE',
    'HTTP_404',
    'SKIPPED_EXISTING_HASH',
    'DOWNLOADED_HASH_VERIFIED',
    'EXISTING_HASH_VERIFIED',
    'HTTP_404_SOURCE_UNAVAILABLE',
    'HTTP_410_SOURCE_REMOVED',
    'NON_PDF_RESPONSE',
    'TIMEOUT',
    'REDIRECT_FAILURE',
    'VALIDATION_FAILURE',
    'SOURCE_ACCESS_BLOCKED',
    'INDEX_ONLY_NO_DOCUMENT'
  ));

comment on column insurance_source_occurrences.acquisition_state is
  'Per-occurrence document acquisition. Duplicate URLs/hashes do not delete other occurrences. Index rows survive unavailable documents.';
