-- EA-INS-ROADMAP-001 — additive identifier schemes and internal load targets.
-- Registers hios_issuer_id and cms_medicare_contract_id on national_entity_identifiers.
-- Does not apply itself. Does not publish. Does not store contact names or phone numbers.
-- Re-running this file drops and recreates the scheme check, then skips existing tables.

alter table national_entity_identifiers
  drop constraint if exists national_entity_identifiers_scheme_check;
alter table national_entity_identifiers
  add constraint national_entity_identifiers_scheme_check
  check (scheme in (
    'naic_cocode',
    'naic_group_code',
    'fein',
    'fl_dfs_appointing_entity_number',
    'fl_oir_company_code',
    'tx_tdi_naic_id',
    'cms_medicare_contract_id',
    'cms_hios_issuer_id',
    'hios_issuer_id',
    'npn',
    'nj_dobi_reference',
    'nj_crib_company_number',
    'serff_tracking_number'
  ));

comment on column national_entity_identifiers.scheme is
  'Exact identifier schemes only. hios_issuer_id is the CMS MLR bridge issuer id and is not a NAIC CoCode. cms_medicare_contract_id keys Part C/D contract history and is not a NAIC CoCode. cms_hios_issuer_id remains the marketplace issuer scheme. fl_oir_company_code remains allowed.';

create table if not exists insurance_review_queue (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  source_family text not null,
  review_key text not null,
  hold_reason text not null,
  publication_allowed boolean not null default false,
  match_status text not null,
  identifier_scheme text,
  identifier_value text,
  legal_name text,
  jurisdiction text,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  raw_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_dataset, review_key),
  constraint insurance_review_queue_publication_closed
    check (publication_allowed = false)
);

comment on table insurance_review_queue is
  'Held source rows. publication_allowed stays false. OCR-only and multi-entity market-conduct rows stay here. Contact names and phone numbers are omitted.';

create table if not exists insurance_identifier_bridges (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  bridge_key text not null,
  from_scheme text not null,
  from_value text not null,
  to_scheme text not null,
  to_value text not null,
  naic_group_code text,
  jurisdiction text not null,
  publication_allowed boolean not null default false,
  match_status text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  raw_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_dataset, bridge_key),
  constraint insurance_identifier_bridges_exact
    check (match_status = 'EXACT'),
  constraint insurance_identifier_bridges_hios_naic
    check (
      from_scheme = 'hios_issuer_id'
      and to_scheme = 'naic_cocode'
      and from_value ~ '^[0-9]{5}$'
      and to_value ~ '^[0-9]{5}$'
      and from_value <> to_value
    ),
  constraint insurance_identifier_bridges_publication_closed
    check (publication_allowed = false)
);

comment on table insurance_identifier_bridges is
  'Exact CMS MLR 2024 HIOS-to-NAIC rows. hios_issuer_id is not stored as naic_cocode. Blank and unresolved NAIC rows stay on the review queue.';

create table if not exists insurance_source_roster_rows (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  roster_key text not null,
  identifier_scheme text not null,
  identifier_value text not null,
  population text not null,
  legal_name text not null,
  jurisdiction text not null,
  publication_allowed boolean not null default false,
  match_status text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  raw_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_dataset, roster_key),
  constraint insurance_source_roster_rows_exact_naic
    check (
      identifier_scheme = 'naic_cocode'
      and identifier_value ~ '^[0-9]{5}$'
      and identifier_value <> '13064'
      and identifier_value <> '18711'
      and match_status = 'EXACT'
      and population in ('foreign', 'domestic')
    ),
  constraint insurance_source_roster_rows_publication_closed
    check (publication_allowed = false)
);

comment on table insurance_source_roster_rows is
  'Exact NAIC roster attachments. NAIC 13064 stays quarantined. NAIC 18711 stays unresolved. Hyphenated AA ids are normalized on the review queue.';

create table if not exists insurance_cms_contract_actions (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  contract_id text not null,
  identifier_scheme text not null default 'cms_medicare_contract_id',
  issue_id text not null,
  action_type text not null,
  date_sent text not null,
  issue_type text not null,
  issue_topic text not null,
  parent_organization text,
  all_contracts_terminated boolean not null,
  shared_with text not null default '',
  in_repo_static_cms_json boolean not null,
  publication_allowed boolean not null default false,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (contract_id, issue_id),
  constraint insurance_cms_contract_actions_identity
    check (
      identifier_scheme = 'cms_medicare_contract_id'
      and contract_id ~ '^[A-Z][0-9]{4}$'
      and issue_id ~ '^[0-9]+$'
      and action_type in ('AD_HOC_CAP', 'WARNING_LETTER')
    ),
  constraint insurance_cms_contract_actions_publication_closed
    check (publication_allowed = false)
);

comment on table insurance_cms_contract_actions is
  'CMS Part C/D CAP and warning-letter history keyed by cms_medicare_contract_id. Contact names and phone numbers are omitted.';

alter table insurance_review_queue enable row level security;
alter table insurance_review_queue force row level security;
alter table insurance_identifier_bridges enable row level security;
alter table insurance_identifier_bridges force row level security;
alter table insurance_source_roster_rows enable row level security;
alter table insurance_source_roster_rows force row level security;
alter table insurance_cms_contract_actions enable row level security;
alter table insurance_cms_contract_actions force row level security;

drop policy if exists "Service role manages insurance review queue" on insurance_review_queue;
drop policy if exists "Service role manages insurance identifier bridges" on insurance_identifier_bridges;
drop policy if exists "Service role manages insurance source roster rows" on insurance_source_roster_rows;
drop policy if exists "Service role manages insurance cms contract actions" on insurance_cms_contract_actions;

create policy "Service role manages insurance review queue"
  on insurance_review_queue for all to service_role using (true) with check (true);
create policy "Service role manages insurance identifier bridges"
  on insurance_identifier_bridges for all to service_role using (true) with check (true);
create policy "Service role manages insurance source roster rows"
  on insurance_source_roster_rows for all to service_role using (true) with check (true);
create policy "Service role manages insurance cms contract actions"
  on insurance_cms_contract_actions for all to service_role using (true) with check (true);

revoke all on table insurance_review_queue from anon, authenticated, public;
revoke all on table insurance_identifier_bridges from anon, authenticated, public;
revoke all on table insurance_source_roster_rows from anon, authenticated, public;
revoke all on table insurance_cms_contract_actions from anon, authenticated, public;

grant all on table insurance_review_queue to service_role;
grant all on table insurance_identifier_bridges to service_role;
grant all on table insurance_source_roster_rows to service_role;
grant all on table insurance_cms_contract_actions to service_role;
