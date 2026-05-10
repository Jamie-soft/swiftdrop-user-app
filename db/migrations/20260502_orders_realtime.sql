-- Enable realtime updates for the orders table so the user app reflects
-- driver/admin status changes (accepted, on_the_way, delivered) instantly.

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Ensure full row payloads on UPDATE so clients receive all changed columns.
alter table public.orders replica identity full;
