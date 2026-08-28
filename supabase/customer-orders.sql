alter table public.orders
  add column if not exists customer_user_id uuid
  references auth.users(id) on delete set null;

create index if not exists orders_customer_user_id_idx
  on public.orders(customer_user_id, created_at desc);

-- This trigger links new web orders to the authenticated customer without
-- accepting a user id from the browser. Guest orders remain unlinked.
create or replace function public.assign_order_customer_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.customer_user_id is null then
    new.customer_user_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists assign_order_customer_user_trigger
  on public.orders;

create trigger assign_order_customer_user_trigger
before insert on public.orders
for each row
execute function public.assign_order_customer_user();

revoke all on function public.assign_order_customer_user()
  from public, anon, authenticated;

-- Customers read a deliberately limited order shape. Internal notes,
-- customer data and the original WhatsApp message are never returned.
create or replace function public.get_my_orders()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', orders.id,
        'order_number', orders.order_number,
        'status', orders.status,
        'total', orders.total,
        'created_at', orders.created_at,
        'updated_at', orders.updated_at,
        'fulfillment_status', coalesce(orders.fulfillment_status, 'to_prepare'),
        'shipping_carrier', orders.shipping_carrier,
        'tracking_number', orders.tracking_number,
        'shipped_at', orders.shipped_at,
        'delivery_method', case
          when lower(orders.whatsapp_message) like '%entrega: retiro%'
            then 'Retiro presencial'
          when lower(orders.whatsapp_message) like '%entrega: env%'
            then 'Envio'
          else 'A coordinar'
        end,
        'payment_method', case
          when lower(orders.whatsapp_message) like '%pago: efectivo%'
            then 'Efectivo'
          when lower(orders.whatsapp_message) like '%pago: transferencia%'
            then 'Transferencia'
          else 'A coordinar'
        end,
        'items', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', order_items.id,
                'product_slug', order_items.product_slug,
                'product_name', order_items.product_name,
                'variant_color', order_items.variant_color,
                'size', order_items.size,
                'quantity', order_items.quantity,
                'unit_price', order_items.unit_price,
                'subtotal', order_items.subtotal,
                'image_url', order_items.image_url,
                'line_group_id', order_items.line_group_id,
                'sale_mode', coalesce(order_items.sale_mode, 'unit'),
                'bundle_quantity', coalesce(order_items.bundle_quantity, 1),
                'units_per_bundle', coalesce(order_items.units_per_bundle, 1),
                'bundle_price', coalesce(order_items.bundle_price, order_items.unit_price)
              )
              order by order_items.created_at, order_items.id
            )
            from public.order_items
            where order_items.order_id = orders.id
          ),
          '[]'::jsonb
        )
      )
      order by orders.created_at desc
    ),
    '[]'::jsonb
  )
  from public.orders
  where auth.uid() is not null
    and orders.customer_user_id = auth.uid();
$$;

revoke all on function public.get_my_orders() from public, anon;
grant execute on function public.get_my_orders() to authenticated;
