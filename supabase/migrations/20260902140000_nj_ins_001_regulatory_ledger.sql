-- NJ-INS-001 — reusable insurance regulatory-document / multi-party evidence ledger.
-- Additive, internal-only. No public projection, no NJ-only silo tables, no provider/RLS weakening.
-- Does not alter bail-bond publication firewall or Florida examination architecture.

-- Identifier schemes used by exact NJ joins. NPN and DOBI reference are not NAIC CoCodes.
alter table national_entity_identifiers
  drop constraint if exists national_entity_identifiers_scheme_check;
alter table national_entity_identifiers
  add constraint national_entity_identifiers_scheme_check
  check (scheme in (
    'naic_cocode',
    'naic_group_code',
    'fein',
    'fl_dfs_appointing_entity_number',
    'tx_tdi_naic_id',
    'cms_medicare_contract_id',
    'cms_hios_issuer_id',
    'npn',
    'nj_dobi_reference'
  ));

create table if not exists insurance_source_coverage (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  source_family text not null,
  source_year integer,
  source_page text not null,
  source_url text not null,
  source_hash text check (source_hash is null or source_hash ~ '^[a-f0-9]{64}$'),
  coverage_state text not null check (coverage_state in (
    'ACQUIRED_COMPLETE','ACQUIRED_CURRENT_SNAPSHOT','ACQUIRED_PARTIAL_HISTORY',
    'PARTIAL_SOURCE_COVERAGE','SOURCE_NOT_ACQUIRED','SOURCE_ACCESS_BLOCKED',
    'SOURCE_AVAILABLE_BY_REQUEST','SOURCE_UNVERIFIED'
  )),
  retrieved_at timestamptz,
  source_as_of date,
  http_status integer,
  notes text,
  raw_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_dataset, source_family, source_url)
);

comment on table insurance_source_coverage is
  'Official source-year acquisition state. A missing year is SOURCE_NOT_ACQUIRED, never a zero-enforcement finding.';

create table if not exists insurance_source_occurrences (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  source_family text not null,
  source_year integer,
  source_url text not null,
  index_location text not null,
  order_number text,
  respondent_caption text not null,
  action_date date,
  document_url text,
  acquisition_state text not null check (acquisition_state in (
    'DOCUMENT_DOWNLOADED','INDEX_ONLY','DOCUMENT_UNAVAILABLE','HTTP_404','SKIPPED_EXISTING_HASH'
  )),
  occurrence_fingerprint text not null check (occurrence_fingerprint ~ '^[a-f0-9]{64}$'),
  raw_value jsonb not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_dataset, occurrence_fingerprint)
);

comment on table insurance_source_occurrences is
  'Index-row occurrences. Order numbers are event identifiers, never entity identifiers.';

create table if not exists insurance_regulatory_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_document_id text not null,
  order_number text,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  document_type text,
  source_url text,
  byte_length bigint not null default 0 check (byte_length >= 0),
  source_status text not null default 'CURRENT' check (source_status in (
    'CURRENT','RESCINDED','SUPERSEDED','UNKNOWN'
  )),
  text_extraction_state text not null default 'NOT_ATTEMPTED' check (text_extraction_state in (
    'EXTRACTED','IMAGE_ONLY','NOT_ATTEMPTED','FAILED','UNAVAILABLE'
  )),
  public_eligibility text not null default 'internal_only' check (public_eligibility in (
    'internal_only','review_required','public_candidate'
  )),
  raw_metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (canonical_document_id),
  unique (content_hash)
);

create table if not exists insurance_regulatory_event_parties (
  id uuid primary key default gen_random_uuid(),
  evidence_record_identifier text not null,
  source_dataset text not null,
  party_type text not null,
  legal_name text not null,
  role_in_order text not null default 'respondent',
  naic_cocode text,
  naic_group_code text,
  npn text,
  state_reference text,
  match_status text not null check (match_status in (
    'EXACT','HIGH_CONFIDENCE','REVIEW_REQUIRED','CONFLICT','UNRESOLVED',
    'UNSAFE_REJECTED','INTERNAL_ONLY_INDIVIDUAL'
  )),
  match_method text,
  entity_id uuid references national_entities(id) on delete set null,
  public_eligibility text not null default 'internal_only' check (public_eligibility in (
    'internal_only','review_required','public_candidate'
  )),
  raw_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_ins_reg_parties_natural
  on insurance_regulatory_event_parties (
    source_dataset, evidence_record_identifier, legal_name, party_type,
    coalesce(naic_cocode, ''), coalesce(npn, ''), coalesce(state_reference, '')
  );

comment on table insurance_regulatory_event_parties is
  'Separately typed respondents. Amounts stay on the event, not copied onto every party. Individuals remain internal-only.';

comment on table insurance_regulatory_documents is
  'Canonical document inventory keyed by content hash. Examinations are not enforcement.';

alter table insurance_source_coverage enable row level security;
alter table insurance_source_coverage force row level security;
alter table insurance_source_occurrences enable row level security;
alter table insurance_source_occurrences force row level security;
alter table insurance_regulatory_documents enable row level security;
alter table insurance_regulatory_documents force row level security;
alter table insurance_regulatory_event_parties enable row level security;
alter table insurance_regulatory_event_parties force row level security;

drop policy if exists "Service role manages insurance source coverage" on insurance_source_coverage;
drop policy if exists "Service role manages insurance source occurrences" on insurance_source_occurrences;
drop policy if exists "Service role manages insurance regulatory documents" on insurance_regulatory_documents;
drop policy if exists "Service role manages insurance regulatory event parties" on insurance_regulatory_event_parties;

create policy "Service role manages insurance source coverage"
  on insurance_source_coverage for all to service_role using (true) with check (true);
create policy "Service role manages insurance source occurrences"
  on insurance_source_occurrences for all to service_role using (true) with check (true);
create policy "Service role manages insurance regulatory documents"
  on insurance_regulatory_documents for all to service_role using (true) with check (true);
create policy "Service role manages insurance regulatory event parties"
  on insurance_regulatory_event_parties for all to service_role using (true) with check (true);

revoke all on table insurance_source_coverage from anon, authenticated, public;
revoke all on table insurance_source_occurrences from anon, authenticated, public;
revoke all on table insurance_regulatory_documents from anon, authenticated, public;
revoke all on table insurance_regulatory_event_parties from anon, authenticated, public;

grant all on table insurance_source_coverage to service_role;
grant all on table insurance_source_occurrences to service_role;
grant all on table insurance_regulatory_documents to service_role;
grant all on table insurance_regulatory_event_parties to service_role;
