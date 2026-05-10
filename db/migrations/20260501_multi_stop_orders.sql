-- Multi-stop (bulk) delivery support.
-- Run this in your Supabase SQL editor.

alter table public.orders
  add column if not exists is_multi_stop boolean not null default false,
  add column if not exists total_stops integer;

create table if not exists public.order_stops (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stop_order integer not null,
  address text not null,
  lat double precision,
  lng double precision,
  receiver_name text,
  receiver_phone text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists order_stops_order_id_idx
  on public.order_stops(order_id, stop_order);

do $$
begin
  alter publication supabase_realtime add table public.order_stops;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table public.order_stops enable row level security;

-- Owners (via parent order) can read their stops.
drop policy if exists "order_stops_select_own" on public.order_stops;
create policy "order_stops_select_own"
on public.order_stops
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_stops.order_id
      and o.user_id = auth.uid()
  )
);

-- Owners can insert stops for their own orders.
drop policy if exists "order_stops_insert_own" on public.order_stops;
create policy "order_stops_insert_own"
on public.order_stops
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_stops.order_id
      and o.user_id = auth.uid()
  )
);

-- Owners can update stop status (e.g. mark delivered).
drop policy if exists "order_stops_update_own" on public.order_stops;
create policy "order_stops_update_own"
on public.order_stops
for update
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_stops.order_id
      and o.user_id = auth.uid()
  )
);
