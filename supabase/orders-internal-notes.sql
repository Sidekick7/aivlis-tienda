alter table public.orders
  add column if not exists internal_notes text;
