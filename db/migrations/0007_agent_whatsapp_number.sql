-- One WhatsApp number answers for one agent. Numbers are bound to agents by a Namu admin (the agent's PATCH accepts
-- channels only from an admin), and this index makes a second binding of the same number fail instead of letting two
-- agents claim it. The webhook also refuses a number that matches more than one agent. Safe to run again.
create unique index if not exists agents_whatsapp_number
  on public.agents ((channels -> 'whatsapp' ->> 'phoneNumberId'))
  where channels -> 'whatsapp' ->> 'phoneNumberId' is not null;
