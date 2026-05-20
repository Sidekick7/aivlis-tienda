drop policy if exists "Admins can delete orders"
  on public.orders;

create policy "Admins can delete orders"
  on public.orders
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can delete order items"
  on public.order_items;

create policy "Admins can delete order items"
  on public.order_items
  for delete
  to authenticated
  using (public.is_admin());
