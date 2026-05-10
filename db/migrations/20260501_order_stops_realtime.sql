-- Ensure order_stops supports live multi-stop tracking updates.

alter table public.order_stops
  add column if not exists status text not null default 'pending';

alter table public.order_stops
  alter column status set default 'pending';

create index if not exists order_stops_order_id_stop_order_idx
  on public.order_stops(order_id, stop_order);

do $$
begin
  alter publication supabase_realtime add table public.order_stops;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;