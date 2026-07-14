alter table public.order_items
  add column if not exists line_group_id uuid,
  add column if not exists sale_mode text,
  add column if not exists bundle_quantity integer,
  add column if not exists units_per_bundle integer,
  add column if not exists bundle_price numeric(12, 2);

alter table public.local_sale_items
  add column if not exists line_group_id uuid,
  add column if not exists sale_mode text,
  add column if not exists bundle_quantity integer,
  add column if not exists units_per_bundle integer,
  add column if not exists bundle_price numeric(12, 2);

create index if not exists order_items_line_group_id_idx
  on public.order_items(line_group_id);

create index if not exists local_sale_items_line_group_id_idx
  on public.local_sale_items(line_group_id);

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
declare
  order_item jsonb;
  product_record public.products%rowtype;
  requested_quantity integer;
  selected_stock integer;
  next_variants jsonb;
  next_total_stock integer;
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
      or coalesce((item ->> 'unit_cost')::numeric, 0) < 0
      or coalesce((item ->> 'subtotal')::numeric, 0) < 0
      or coalesce(item ->> 'sale_mode', 'unit') not in ('unit', 'curve')
      or coalesce((item ->> 'bundle_quantity')::integer, 1) <= 0
      or coalesce((item ->> 'units_per_bundle')::integer, 1) <= 0
      or coalesce((item ->> 'bundle_price')::numeric, 0) < 0
      or (item ->> 'subtotal')::numeric
        <> (item ->> 'unit_price')::numeric * (item ->> 'quantity')::integer
  ) then
    raise exception 'El pedido tiene productos invalidos.';
  end if;

  if total < 0 then
    raise exception 'El total del pedido es invalido.';
  end if;

  for order_item in
    select value
    from jsonb_array_elements(items)
  loop
    requested_quantity := (order_item ->> 'quantity')::integer;
    selected_stock := null;

    select *
    into product_record
    from public.products
    where id = nullif(order_item ->> 'product_id', '')::bigint
    for update;

    if not found
      or product_record.active is not true
      or product_record.slug <> order_item ->> 'product_slug'
    then
      raise exception 'El pedido tiene productos sin stock o no publicados.';
    end if;

    select coalesce((size_item ->> 'stock')::integer, 0)
    into selected_stock
    from jsonb_array_elements(product_record.variants) as variant
    cross join jsonb_array_elements(variant -> 'sizes') as size_item
    where variant ->> 'color' = order_item ->> 'variant_color'
      and size_item ->> 'size' = order_item ->> 'size'
    limit 1;

    if selected_stock is null or selected_stock < requested_quantity then
      raise exception 'El pedido tiene productos sin stock o no publicados.';
    end if;

    select jsonb_agg(
      case
        when variant ->> 'color' = order_item ->> 'variant_color'
        then jsonb_set(
          jsonb_set(variant, '{sizes}', next_sizes.sizes, true),
          '{stock}',
          to_jsonb(next_sizes.stock),
          true
        )
        else variant
      end
      order by variant_ordinal
    )
    into next_variants
    from jsonb_array_elements(product_record.variants)
      with ordinality as variants(variant, variant_ordinal)
    cross join lateral (
      select
        jsonb_agg(
          case
            when variant ->> 'color' = order_item ->> 'variant_color'
              and size_item ->> 'size' = order_item ->> 'size'
            then jsonb_set(
              size_item,
              '{stock}',
              to_jsonb(selected_stock - requested_quantity),
              true
            )
            else size_item
          end
          order by size_ordinal
        ) as sizes,
        coalesce(
          sum(
            case
              when variant ->> 'color' = order_item ->> 'variant_color'
                and size_item ->> 'size' = order_item ->> 'size'
              then selected_stock - requested_quantity
              else coalesce((size_item ->> 'stock')::integer, 0)
            end
          ),
          0
        )::integer as stock
      from jsonb_array_elements(variant -> 'sizes')
        with ordinality as sizes(size_item, size_ordinal)
    ) as next_sizes;

    select coalesce(sum(coalesce((variant ->> 'stock')::integer, 0)), 0)
    into next_total_stock
    from jsonb_array_elements(next_variants) as variant;

    update public.products
    set
      variants = next_variants,
      stock = next_total_stock
    where id = product_record.id;
  end loop;

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
    unit_cost,
    subtotal,
    image_url,
    line_group_id,
    sale_mode,
    bundle_quantity,
    units_per_bundle,
    bundle_price
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
    coalesce(product.cost, (item ->> 'unit_cost')::numeric, 0),
    (item ->> 'subtotal')::numeric,
    nullif(item ->> 'image_url', ''),
    nullif(item ->> 'line_group_id', '')::uuid,
    case
      when item ->> 'sale_mode' = 'curve' then 'curve'
      else 'unit'
    end,
    coalesce((item ->> 'bundle_quantity')::integer, (item ->> 'quantity')::integer),
    coalesce((item ->> 'units_per_bundle')::integer, 1),
    coalesce((item ->> 'bundle_price')::numeric, (item ->> 'unit_price')::numeric)
  from jsonb_array_elements(items) as item
  left join public.products as product
    on product.id = nullif(item ->> 'product_id', '')::bigint;

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
