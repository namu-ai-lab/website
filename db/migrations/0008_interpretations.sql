-- Namu Create's Interpreter: a conversation through Namu between two languages, kept for the person who had it so it
-- can be read and heard again after the page is left.
--
-- Text only, as the rest of the platform (0006): each turn keeps what was heard, its translation, the voice that says
-- the translation (made again from the text when it is played) and the outline of the recording's waveform, a few
-- numbers that draw it and cannot be played. The recordings stay in the browser that made them. Rows belong to
-- profiles.user_id (Neon Auth's user id, as text); every query filters on it. The gateway's role is given nothing
-- here (db/gateway-grants.sql). Safe to run again.

create table if not exists public.interpretations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null check (char_length(title) between 1 and 200),
  turns jsonb not null default '[]'::jsonb check (jsonb_typeof(turns) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists interpretations_user_updated on public.interpretations (user_id, updated_at desc);
