-- Optional: enable Postgres changes over Realtime for instant message delivery.
-- Run in Supabase Dashboard → SQL Editor (or psql as superuser).
-- If you see "is already a member of publication", realtime is already on for this table.

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
