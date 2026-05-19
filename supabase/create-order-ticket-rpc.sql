create or replace function public.create_order_ticket(
  order_id uuid,
  order_number text,
  customer_name text,
  customer_dni text,
  customer_whatsapp text,
  customer_address text,
  customer_city text,
  customer_province text,
  customer_zip text,
  customer_email text,
  notes text,
  total numeric,
  whatsapp_message text,
  items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.orders (
    id,
    order_number,
    status,
    customer_name,
    customer_dni,
    customer_whatsapp,
    customer_address,
    customer_city,
    customer_province,
    customer_zip,
    customer_email,
    notes,
    total,
    whatsapp_message
  )
  values (
    order_id,
    order_number,
    'pending_payment',
    customer_name,
    customer_dni,
    customer_whatsapp,
    customer_address,
    customer_city,
    customer_province,
    customer_zip,
    nullif(customer_email, ''),
    nullif(notes, ''),
    total,
    whatsapp_message
  );

  insert into public.order_items (
    order_id,
    product_id,
    product_slug,
    product_name,
    variant_color,
    size,
    quantity,
    unit_price,
    subtotal,
    image_url
  )
  select
    order_id,
    nullif(item ->> 'product_id', '')::bigint,
    item ->> 'product_slug',
    item ->> 'product_name',
    nullif(item ->> 'variant_color', ''),
    nullif(item ->> 'size', ''),
    (item ->> 'quantity')::integer,
    (item ->> 'unit_price')::numeric,
    (item ->> 'subtotal')::numeric,
    nullif(item ->> 'image_url', '')
  from jsonb_array_elements(items) as item;

  return order_id;
end;
$$;

grant execute on function public.create_order_ticket(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  jsonb
) to anon, authenticated;
