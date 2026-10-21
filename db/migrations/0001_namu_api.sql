-- Namu developer API on Neon Postgres: profiles, API keys and usage.
--
-- Run with `npm run db:migrate` (scripts/db-migrate.mjs), which applies every file in this folder in order.
-- Safe to run again. Users and sessions belong to Neon Auth (the neon_auth schema, see 0002).
--   profiles      one row per signed-up developer, keyed by Neon Auth's user id; private-beta approval lives here
--   api_keys      only an HMAC of each key is stored, never the key itself
--   usage_events  seconds, characters and status codes; never audio or text
-- The website connects as the database owner and filters every query on the signed-in user's id.
-- The Modal gateway connects as namu_gateway, which can do nothing but call the two functions at the end.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  user_id               text primary key,                -- neon_auth."user".id, as text
  beta_status           text not null default 'pending' check (beta_status in ('pending', 'approved', 'denied')),
  role                  text not null default 'user'    check (role in ('user', 'admin')),
  use_case              text check (char_length(use_case) <= 1000),
  monthly_audio_seconds integer not null default 1800 check (monthly_audio_seconds >= 0),  -- 30 min
  created_at            timestamptz not null default now(),
  reviewed_at           timestamptz
);

-- A new user's pending profile is created on their first visit to the console (src/lib/account.ts, profileOf).

-- ---------------------------------------------------------------- api_keys
create table if not exists public.api_keys (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null references public.profiles(user_id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 60),
  prefix             text not null,                       -- e.g. namu_sk_Ab3x, shown in the dashboard
  key_hash           text not null unique,                -- HMAC-SHA256(pepper, key), hex
  scopes             text[] not null default array['transcribe','speech','translate','converse']
                     check (scopes <@ array['transcribe','speech','translate','converse']),
  is_demo            boolean not null default false,      -- the website's server-held demo key
  rate_limit_per_min integer not null default 60 check (rate_limit_per_min between 1 and 10000),
  created_at         timestamptz not null default now(),
  last_used_at       timestamptz,
  revoked_at         timestamptz
);
create index if not exists api_keys_user_idx on public.api_keys (user_id);

-- ---------------------------------------------------------------- usage_events
create table if not exists public.usage_events (
  id            bigint generated always as identity primary key,
  key_id        uuid references public.api_keys(id) on delete set null,
  user_id       text not null references public.profiles(user_id) on delete cascade,
  endpoint      text not null,
  model         text not null,
  audio_seconds numeric(10, 3) not null default 0,
  characters    integer not null default 0,
  status        integer not null,
  latency_ms    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists usage_user_month_idx on public.usage_events (user_id, created_at);

-- ---------------------------------------------------------------- gateway functions
-- One round trip per uncached key: the key, its owner's status and this month's usage.
create or replace function public.namu_key_lookup(p_hash text)
returns table (key_id uuid, user_id text, scopes text[], revoked boolean, is_demo boolean,
               rate_limit_per_min integer, beta_status text, monthly_audio_seconds integer,
               used_audio_seconds numeric)
language sql stable security definer set search_path = public as $$
  select k.id, k.user_id, k.scopes, k.revoked_at is not null, k.is_demo, k.rate_limit_per_min,
         p.beta_status, p.monthly_audio_seconds,
         coalesce((select sum(u.audio_seconds) from public.usage_events u
                   where u.user_id = k.user_id
                     and u.created_at >= date_trunc('month', now())), 0)
  from public.api_keys k join public.profiles p on p.user_id = k.user_id
  where k.key_hash = p_hash
$$;

create or replace function public.namu_record_usage(
  p_key_id uuid, p_user_id text, p_endpoint text, p_model text, p_audio_seconds numeric,
  p_characters integer, p_status integer, p_latency_ms integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usage_events (key_id, user_id, endpoint, model, audio_seconds, characters, status, latency_ms)
  values (p_key_id, p_user_id, p_endpoint, p_model, p_audio_seconds, p_characters, p_status, p_latency_ms);
  update public.api_keys set last_used_at = now() where id = p_key_id;
end $$;

revoke all on function public.namu_key_lookup(text) from public;
revoke all on function public.namu_record_usage(uuid, text, text, text, numeric, integer, integer, integer) from public;

-- The gateway's role is created by scripts/db-migrate.mjs (it needs a generated password); grant it the
-- two functions and nothing else. It cannot read or change any table directly.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'namu_gateway') then
    grant usage on schema public to namu_gateway;
    grant execute on function public.namu_key_lookup(text) to namu_gateway;
    grant execute on function public.namu_record_usage(uuid, text, text, text, numeric, integer, integer, integer)
      to namu_gateway;
  end if;
end $$;

-- ---------------------------------------------------------------- bootstrap (run once, by hand)
-- After you sign in on the website, make yourself the first admin:
--   npm run db:admin -- you@example.org
-- Then create a key named "website demo" in the dashboard and mark it as the demo key:
--   update public.api_keys set is_demo = true, scopes = array['transcribe','speech','translate']
--   where name = 'website demo';
