-- Advanced pricing columns.
-- Run this in your Supabase SQL editor.
alter table public.orders
  add column if not exists final_price numeric,
  add column if not exists discount_amount numeric,
  add column if not exists surge_multiplier numeric,
  add column if not exists promo_code text;
