-- The platform's Create and Agents doors: what a signed-in user makes and keeps there.
--
-- Namu Create: projects (one message in many languages: a source and a version per language), and the
-- organisation's kit (its word list, and the voice it uses for each language).
-- Namu Agents: agents (greeting, instructions, voice, languages, checks, channels), the documents they answer from,
-- the tests they must pass, and their conversations.
--
-- These tables hold text the user wrote or asked to keep: a project's text, a word list, an agent's instructions and
-- documents, and the conversations an agent had. No audio is stored: audio is made again from the text when it is
-- needed. Rows belong to profiles.user_id (Neon Auth's user id, as text); every query filters on it. The gateway's
-- role is given nothing here (db/gateway-grants.sql). Safe to run again.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null default 'message' check (kind in ('message', 'long', 'video')),
  source_lang text not null check (char_length(source_lang) between 2 and 12),
  source_text text not null default '' check (char_length(source_text) <= 20000),
  made_for text not null default 'whatsapp' check (char_length(made_for) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_updated on public.projects (user_id, updated_at desc);

create table if not exists public.project_versions (
  project_id uuid not null references public.projects (id) on delete cascade,
  lang text not null check (char_length(lang) between 2 and 12),
  text text not null default '' check (char_length(text) <= 20000),
  voice text check (char_length(voice) <= 40),
  status text not null default 'draft' check (status in ('draft', 'review', 'checked')),
  updated_at timestamptz not null default now(),
  primary key (project_id, lang)
);

create table if not exists public.kit_words (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  term text not null check (char_length(term) between 1 and 80),
  say text not null check (char_length(say) between 1 and 200),
  lang text check (char_length(lang) between 2 and 12),
  created_at timestamptz not null default now()
);
create index if not exists kit_words_user on public.kit_words (user_id, created_at);

create table if not exists public.kit_voices (
  user_id text not null,
  lang text not null check (char_length(lang) between 2 and 12),
  voice text not null check (char_length(voice) <= 40),
  primary key (user_id, lang)
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null check (char_length(name) between 1 and 80),
  template text check (char_length(template) <= 40),
  greeting text not null default '' check (char_length(greeting) <= 600),
  instructions text not null default '' check (char_length(instructions) <= 8000),
  voice text check (char_length(voice) <= 40),
  languages text[] not null default '{ha}',
  checks jsonb not null default '[]'::jsonb,
  tools jsonb not null default '[]'::jsonb,
  channels jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agents_user_updated on public.agents (user_id, updated_at desc);

create table if not exists public.agent_documents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  user_id text not null,
  name text not null check (char_length(name) between 1 and 200),
  body text not null check (char_length(body) <= 200000),
  created_at timestamptz not null default now()
);
create index if not exists agent_documents_agent on public.agent_documents (agent_id, created_at);

create table if not exists public.agent_tests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  user_id text not null,
  ask text not null check (char_length(ask) between 1 and 1000),
  expect text[] not null default '{}',
  last_pass boolean,
  last_reply text check (char_length(last_reply) <= 4000),
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists agent_tests_agent on public.agent_tests (agent_id, created_at);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  user_id text not null,
  channel text not null check (channel in ('test', 'whatsapp', 'web')),
  contact text check (char_length(contact) <= 80),
  turns jsonb not null default '[]'::jsonb,
  results jsonb not null default '{}'::jsonb,
  flagged boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_conversations_user on public.agent_conversations (user_id, updated_at desc);
create index if not exists agent_conversations_agent on public.agent_conversations (agent_id, updated_at desc);
