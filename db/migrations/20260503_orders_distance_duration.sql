-- Single source of truth for delivery distance + ETA.
-- distance_km already exists; add estimated_duration text column.
alter table public.orders
  add column if not exists estimated_duration text;
