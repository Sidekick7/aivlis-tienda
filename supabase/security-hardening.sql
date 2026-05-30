-- Run this once before the first public deploy.
-- It tightens read/write access without changing existing data.

drop policy if exists "Public can read products"
  on public.products;

create policy "Public can read products"
  on public.products
  for select
  to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "Allow anonymous order creation"
  on public.orders;

drop policy if exists "Allow public order creation"
  on public.orders;

drop policy if exists "Allow anonymous order item creation"
  on public.order_items;

drop policy if exists "Allow public order item creation"
  on public.order_items;

-- Orders are still created by public.create_order_ticket, which is granted
-- to anon/authenticated and validates the ticket payload.
