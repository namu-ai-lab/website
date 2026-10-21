-- Sign-in moves to Neon Auth. Users and sessions now live in neon_auth."user" and its siblings, kept by Neon;
-- Better Auth's own tables in public ("user", session, account, verification) are no longer read or written.
--
-- profiles.user_id stays text and now holds Neon Auth's user id (a uuid, as text). Nothing here reaches into the
-- neon_auth schema: a profile is created on the user's first visit to the console. Safe to run again.
--
-- Databases set up before this change: the profiles of Better Auth users no longer match anyone and stay out of
-- the beta review. Once nobody needs them, drop the old tables by hand:
--   drop table if exists public.verification, public.account, public.session, public."user" cascade;

alter table public.profiles drop constraint if exists profiles_user_id_fkey;

do $$ begin
  if to_regclass('public."user"') is not null then
    drop trigger if exists namu_on_user_created on public."user";
  end if;
end $$;

drop function if exists public.namu_new_user();
