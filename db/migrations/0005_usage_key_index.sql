-- An index on usage_events.key_id. The column references api_keys(id) with `on delete set null`, so deleting a key,
-- or an account (which deletes its keys), must find that key's usage rows; and the console's Logs filter by key.
-- Without the index both read the whole table, which only grows.
--
-- A plain CREATE INDEX holds back writes to usage_events while it builds: a moment at the table's size today. The
-- concurrent form would not, but it cannot run inside the transaction db:migrate wraps each file in. If another
-- session holds the table, give up after 5 s (the file rolls back and the next run tries again) rather than queue
-- every usage write behind the wait.

set local lock_timeout = '5s';
create index if not exists usage_events_key_idx on public.usage_events (key_id);
