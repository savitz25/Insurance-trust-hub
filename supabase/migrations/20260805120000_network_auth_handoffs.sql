-- One-time cross-domain SSO handoffs for Ask Trust Hub network.
-- Apply on shared Supabase project (same as Move). Service role only.

create table if not exists public.network_auth_handoffs (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_hub text not null check (from_hub in ('move', 'insurance', 'lender', 'ask')),
  to_hub text not null check (to_hub in ('move', 'insurance', 'lender', 'ask')),
  destination_path text null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  created_ip text null
);

create index if not exists network_auth_handoffs_code_hash_idx
  on public.network_auth_handoffs (code_hash);

create index if not exists network_auth_handoffs_expires_at_idx
  on public.network_auth_handoffs (expires_at);

create index if not exists network_auth_handoffs_user_created_idx
  on public.network_auth_handoffs (user_id, created_at desc);

alter table public.network_auth_handoffs enable row level security;

create or replace function public.consume_network_auth_handoff(
  p_code_hash text,
  p_to_hub text
)
returns table (
  out_user_id uuid,
  out_from_hub text,
  out_destination_path text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.network_auth_handoffs h
  set used_at = now()
  where h.code_hash = p_code_hash
    and h.to_hub = p_to_hub
    and h.used_at is null
    and h.expires_at > now()
  returning h.user_id, h.from_hub, h.destination_path;
end;
$$;

revoke all on function public.consume_network_auth_handoff(text, text) from public;
grant execute on function public.consume_network_auth_handoff(text, text) to service_role;
