create table public.connected_shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  shop_ref uuid,
  shop_name text not null,
  shop_id bigint not null unique,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.connected_shops enable row level security;
revoke all on public.connected_shops from anon, authenticated;
grant all on public.connected_shops to service_role;