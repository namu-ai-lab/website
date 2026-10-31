-- What the gateway's database role, namu_gateway, may do: call these functions, and nothing else. It cannot read or
-- change a table directly.
--
-- Applied by `npm run db:migrate` on every run, after the migrations and after the role exists, so the rights are
-- right even when the role is created later than the functions (a restored database, a new Neon project). A migration
-- that adds a function the gateway calls adds its grant here. Safe to run again.

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'namu_gateway') then
    grant usage on schema public to namu_gateway;
    grant execute on function public.namu_key_lookup(text) to namu_gateway;
    grant execute on function public.namu_key_lookup_v2(text) to namu_gateway;
    grant execute on function public.namu_account_lookup(text) to namu_gateway;
    grant execute on function public.namu_record_usage(uuid, text, text, text, numeric, integer, integer, integer)
      to namu_gateway;
  end if;
end $$;
