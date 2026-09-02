-- NJ-INS-002 — IHC/SEH, residual-market, CRIB, and SERFF observation reuse.
-- Additive, internal-only. Reuses market_intelligence_observations and insurance_source_coverage.
-- No NJ-only silo tables. No public projection. No provider/RLS weakening.
-- Does not alter bail-bond publication firewall or Florida examination architecture.

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
    'nj_dobi_reference',
    'nj_crib_company_number',
    'serff_tracking_number'
  ));

alter table insurance_source_coverage
  drop constraint if exists insurance_source_coverage_coverage_state_check;
alter table insurance_source_coverage
  add constraint insurance_source_coverage_coverage_state_check
  check (coverage_state in (
    'ACQUIRED_COMPLETE','ACQUIRED_CURRENT_SNAPSHOT','ACQUIRED_PARTIAL_HISTORY',
    'PARTIAL_SOURCE_COVERAGE','SOURCE_NOT_ACQUIRED','SOURCE_ACCESS_BLOCKED',
    'SOURCE_AVAILABLE_BY_REQUEST','SOURCE_UNVERIFIED','OPEN_SEARCH_ONLY'
  ));

comment on column national_entity_identifiers.scheme is
  'Exact identifier schemes only. nj_crib_company_number is not a NAIC CoCode. serff_tracking_number identifies a filing, not an insurer. cms_hios_issuer_id is not a NAIC CoCode.';

create table if not exists insurance_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null,
  source_family text not null,
  event_key text not null,
  event_kind text not null,
  baseline_only boolean not null default true,
  alerted boolean not null default false,
  jurisdiction text not null default 'NJ',
  publication_allowed boolean not null default false,
  notes text,
  raw_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_dataset, event_key)
);

comment on table insurance_monitoring_events is
  'First snapshot of every family is baseline-only. Do not alert on page-order, formatting, retrieval timestamp, same content with a new URL, or an unchanged hash.';

alter table insurance_monitoring_events enable row level security;
alter table insurance_monitoring_events force row level security;

drop policy if exists "Service role manages insurance monitoring events" on insurance_monitoring_events;
create policy "Service role manages insurance monitoring events"
  on insurance_monitoring_events for all to service_role using (true) with check (true);

comment on table market_intelligence_observations is
  'Source-faithful market metrics. Attach only via exact NAIC/NPN/documented crosswalk. Aggregates stay entity_id NULL. publication_allowed false until a later UI task. IHC, SEH, Get Covered, residual programs, CRIB Plan Risk, and SERFF filings are distinct families.';
