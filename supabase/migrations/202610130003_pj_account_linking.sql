begin;

create type public.portfolio_link_status as enum ('ACTIVE', 'REVOKED');

create table public.portfolio_link_attempts (
  id uuid primary key default gen_random_uuid(),
  central_user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'COMPLETED', 'EXPIRED')),
  app_user_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz
);

create index portfolio_link_attempts_expiration_idx
  on public.portfolio_link_attempts (expires_at);

create table public.portfolio_account_links (
  id uuid primary key default gen_random_uuid(),
  central_user_id uuid not null references auth.users(id) on delete cascade,
  app_key text not null check (app_key = 'pj'),
  app_user_id text not null,
  external_link_id uuid not null,
  attempt_id uuid not null references public.portfolio_link_attempts(id),
  display_email text not null,
  status public.portfolio_link_status not null default 'ACTIVE',
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (central_user_id, app_key),
  unique (app_key, app_user_id),
  unique (external_link_id),
  unique (attempt_id)
);

alter table public.portfolio_link_attempts enable row level security;
alter table public.portfolio_account_links enable row level security;
revoke all on public.portfolio_link_attempts from anon, authenticated;
revoke all on public.portfolio_account_links from anon, authenticated;
grant all on public.portfolio_link_attempts to service_role;
grant all on public.portfolio_account_links to service_role;

commit;
