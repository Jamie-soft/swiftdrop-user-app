-- Required schema updates for dynamic pricing.
-- Run this in your Supabase SQL editor.
alter table public.orders
  add column if not exists distance_km double precision,
  add column if not exists package_type text,
  add column if not exists package_size text;
