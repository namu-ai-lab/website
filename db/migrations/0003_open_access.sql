-- Open access: anyone who signs up can create API keys at once, within the free monthly allowance
-- (monthly_audio_seconds, 30 minutes by default). Accounts are no longer reviewed by hand; an admin can still pause
-- one ('denied'), which stops its keys at the gateway, and resume it ('approved'). 'pending' is no longer used.
-- Safe to run again.

alter table public.profiles alter column beta_status set default 'approved';
update public.profiles set beta_status = 'approved', reviewed_at = coalesce(reviewed_at, now()) where beta_status = 'pending';
