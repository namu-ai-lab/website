-- The console Playground runs as the signed-in developer. The website calls the gateway with its own service key
-- and names the account (X-Namu-Account); the gateway then applies that account's status and allowance and meters
-- the request to it. A service key is refused without an account. Safe to run again.
--   api_keys.is_service       marks the website's service key (owned by the 'namu-website' service account)
--   namu_key_lookup_v2        namu_key_lookup plus is_service (a new name, so a running gateway keeps working
--                             until it is redeployed: migrate first, then deploy the gateway)
--   namu_account_lookup       an account's status, allowance and this month's audio, for service-key requests

alter table public.api_keys add column if not exists is_service boolean not null default false;

create or replace function public.namu_key_lookup_v2(p_hash text)
returns table (key_id uuid, user_id text, scopes text[], revoked boolean, is_demo boolean,
               rate_limit_per_min integer, beta_status text, monthly_audio_seconds integer,
               used_audio_seconds numeric, is_service boolean)
language sql stable security definer set search_path = public as $$
  select k.id, k.user_id, k.scopes, k.revoked_at is not null, k.is_demo, k.rate_limit_per_min,
         p.beta_status, p.monthly_audio_seconds,
         coalesce((select sum(u.audio_seconds) from public.usage_events u
                   where u.user_id = k.user_id
                     and u.created_at >= date_trunc('month', now())), 0),
         k.is_service
  from public.api_keys k join public.profiles p on p.user_id = k.user_id
  where k.key_hash = p_hash
$$;

create or replace function public.namu_account_lookup(p_user_id text)
returns table (beta_status text, monthly_audio_seconds integer, used_audio_seconds numeric)
language sql stable security definer set search_path = public as $$
  select p.beta_status, p.monthly_audio_seconds,
         coalesce((select sum(u.audio_seconds) from public.usage_events u
                   where u.user_id = p.user_id
                     and u.created_at >= date_trunc('month', now())), 0)
  from public.profiles p
  where p.user_id = p_user_id
$$;

revoke all on function public.namu_key_lookup_v2(text) from public;
revoke all on function public.namu_account_lookup(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'namu_gateway') then
    grant execute on function public.namu_key_lookup_v2(text) to namu_gateway;
    grant execute on function public.namu_account_lookup(text) to namu_gateway;
  end if;
end $$;
