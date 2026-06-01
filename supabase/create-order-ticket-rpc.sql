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
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'El pedido no tiene productos.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(items) as item
    where coalesce(item ->> 'product_slug', '') = ''
      or coalesce(item ->> 'product_name', '') = ''
      or coalesce(item ->> 'variant_color', '') = ''
      or coalesce(item ->> 'size', '') = ''
      or coalesce((item ->> 'quantity')::integer, 0) <= 0
      or coalesce((item ->> 'unit_price')::numeric, 0) < 0
      or coalesce((item ->> 'subtotal')::numeric, 0) < 0
      or (item ->> 'subtotal')::numeric
        <> (item ->> 'unit_price')::numeric * (item ->> 'quantity')::integer
  ) then
    raise exception 'El pedido tiene productos invalidos.';
  end if;

  if total < 0 then
    raise exception 'El total del pedido es invalido.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(items) as item
    left join public.products product
      on product.id = nullif(item ->> 'product_id', '')::bigint
    where product.id is null
      or product.active is not true
      or product.slug <> item ->> 'product_slug'
      or not exists (
        select 1
        from jsonb_array_elements(product.variants) as variant
        cross join jsonb_array_elements(variant -> 'sizes') as size_item
        where variant ->> 'color' = item ->> 'variant_color'
          and size_item ->> 'size' = item ->> 'size'
          and coalesce((size_item ->> 'stock')::integer, 0)
            >= (item ->> 'quantity')::integer
      )
  ) then
    raise exception 'El pedido tiene productos sin stock o no publicados.';
  end if;

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
    product_sku,
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
    nullif(item ->> 'product_sku', ''),
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
