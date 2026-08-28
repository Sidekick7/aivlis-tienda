create extension if not exists pgcrypto;

create table if not exists public.sale_exchanges (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  sale_id uuid not null,
  source_item_id uuid not null,
  returned_product_id bigint not null,
  returned_product_sku text,
  returned_product_name text not null,
  returned_variant_color text not null,
  returned_size text not null,
  replacement_product_id bigint not null,
  replacement_product_sku text,
  replacement_product_name text not null,
  replacement_variant_color text not null,
  replacement_size text not null,
  quantity integer not null,
  original_unit_price numeric(12, 2) not null,
  replacement_unit_price numeric(12, 2) not null,
  replacement_unit_cost numeric(12, 2) not null default 0,
  difference_total numeric(12, 2) not null default 0,
  payment_method text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sale_exchanges_source_type_check check (
    source_type in ('web', 'local')
  ),
  constraint sale_exchanges_quantity_positive check (quantity > 0),
  constraint sale_exchanges_original_price_non_negative check (
    original_unit_price >= 0
  ),
  constraint sale_exchanges_replacement_price_valid check (
    replacement_unit_price >= original_unit_price
  ),
  constraint sale_exchanges_replacement_cost_non_negative check (
    replacement_unit_cost >= 0
  ),
  constraint sale_exchanges_difference_non_negative check (
    difference_total >= 0
  ),
  constraint sale_exchanges_payment_method_check check (
    payment_method is null or payment_method in ('cash', 'transfer')
  )
);

create index if not exists sale_exchanges_sale_idx
  on public.sale_exchanges(source_type, sale_id, created_at desc);

create index if not exists sale_exchanges_source_item_idx
  on public.sale_exchanges(source_type, source_item_id);

alter table public.sale_exchanges enable row level security;

drop policy if exists "Admins can read sale exchanges"
  on public.sale_exchanges;

create policy "Admins can read sale exchanges"
  on public.sale_exchanges
  for select
  to authenticated
  using (public.is_admin());

revoke all on table public.sale_exchanges from anon, authenticated;
grant select on table public.sale_exchanges to authenticated;

create or replace function public.adjust_exchange_variant_stock(
  p_product_id bigint,
  p_variant_color text,
  p_size text,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  product_record public.products%rowtype;
  selected_stock integer;
  next_stock integer;
  next_variants jsonb;
  next_total_stock integer;
begin
  select *
  into product_record
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'No se encontro uno de los productos del cambio.';
  end if;

  select coalesce((size_item ->> 'stock')::integer, 0)
  into selected_stock
  from jsonb_array_elements(product_record.variants) as variant
  cross join jsonb_array_elements(variant -> 'sizes') as size_item
  where variant ->> 'color' = p_variant_color
    and size_item ->> 'size' = p_size
  limit 1;

  if selected_stock is null then
    raise exception 'No se encontro el color o talle seleccionado.';
  end if;

  next_stock := selected_stock + p_delta;

  if next_stock < 0 then
    raise exception 'Stock insuficiente para la prenda de reemplazo.';
  end if;

  select jsonb_agg(
    case
      when variant ->> 'color' = p_variant_color
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
          when variant ->> 'color' = p_variant_color
            and size_item ->> 'size' = p_size
          then jsonb_set(
            size_item,
            '{stock}',
            to_jsonb(next_stock),
            true
          )
          else size_item
        end
        order by size_ordinal
      ) as sizes,
      coalesce(
        sum(
          case
            when variant ->> 'color' = p_variant_color
              and size_item ->> 'size' = p_size
            then next_stock
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
  where id = p_product_id;
end;
$$;

revoke all on function public.adjust_exchange_variant_stock(
  bigint,
  text,
  text,
  integer
) from public, anon, authenticated;

create or replace function public.create_sale_exchange(
  p_source_type text,
  p_sale_id uuid,
  p_source_item_id uuid,
  p_replacement_product_id bigint,
  p_replacement_variant_color text,
  p_replacement_size text,
  p_quantity integer,
  p_replacement_unit_price numeric,
  p_payment_method text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  web_item public.order_items%rowtype;
  local_item public.local_sale_items%rowtype;
  source_product_id bigint;
  source_product_sku text;
  source_product_name text;
  source_variant_color text;
  source_size text;
  source_image_url text;
  source_quantity integer;
  source_unit_price numeric(12, 2);
  source_status text;
  already_exchanged integer;
  source_product public.products%rowtype;
  resolved_source_variant_color text;
  replacement_product public.products%rowtype;
  difference_total numeric(12, 2);
  exchange_id uuid;
begin
  if not public.is_admin() then
    raise exception 'No tenes permisos para registrar cambios.';
  end if;

  if p_source_type not in ('web', 'local') then
    raise exception 'El origen de la venta es invalido.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad del cambio es invalida.';
  end if;

  if p_replacement_unit_price is null or p_replacement_unit_price < 0 then
    raise exception 'El valor del reemplazo es invalido.';
  end if;

  if coalesce(trim(p_replacement_variant_color), '') = ''
    or coalesce(trim(p_replacement_size), '') = ''
  then
    raise exception 'Elegi el color y talle de reemplazo.';
  end if;

  if p_source_type = 'web' then
    select item.*
    into web_item
    from public.order_items as item
    join public.orders as sale on sale.id = item.order_id
    where item.id = p_source_item_id
      and item.order_id = p_sale_id;

    if not found then
      raise exception 'No se encontro la prenda original en la venta web.';
    end if;

    select status
    into source_status
    from public.orders
    where id = p_sale_id;

    if source_status <> 'confirmed' then
      raise exception 'Solo se pueden cambiar prendas de ventas confirmadas.';
    end if;

    if web_item.product_id is null then
      raise exception 'La prenda original no tiene un producto vinculado al inventario.';
    end if;

    source_product_id := web_item.product_id;
    source_product_sku := web_item.product_sku;
    source_product_name := web_item.product_name;
    source_variant_color := web_item.variant_color;
    source_size := web_item.size;
    source_image_url := web_item.image_url;
    source_quantity := web_item.quantity;
    source_unit_price := web_item.unit_price;
  else
    select item.*
    into local_item
    from public.local_sale_items as item
    join public.local_sales as sale on sale.id = item.sale_id
    where item.id = p_source_item_id
      and item.sale_id = p_sale_id;

    if not found then
      raise exception 'No se encontro la prenda original en la venta local.';
    end if;

    select status
    into source_status
    from public.local_sales
    where id = p_sale_id;

    if source_status <> 'completed' then
      raise exception 'Solo se pueden cambiar prendas de ventas confirmadas.';
    end if;

    source_product_id := local_item.product_id;
    source_product_sku := local_item.product_sku;
    source_product_name := local_item.product_name;
    source_variant_color := local_item.variant_color;
    source_size := local_item.size;
    source_image_url := local_item.image_url;
    source_quantity := local_item.quantity;
    source_unit_price := local_item.unit_price;
  end if;

  if coalesce(trim(source_variant_color), '') = ''
    or coalesce(trim(source_size), '') = ''
  then
    raise exception 'La prenda original no tiene color o talle registrado.';
  end if;

  select *
  into source_product
  from public.products
  where id = source_product_id;

  if not found then
    raise exception 'El producto original ya no existe en el inventario.';
  end if;

  select variant ->> 'color'
  into resolved_source_variant_color
  from jsonb_array_elements(source_product.variants) as variant
  cross join jsonb_array_elements(variant -> 'sizes') as size_item
  where variant ->> 'color' = source_variant_color
    and size_item ->> 'size' = source_size
  limit 1;

  if resolved_source_variant_color is null
    and coalesce(trim(source_image_url), '') <> ''
  then
    select variant ->> 'color'
    into resolved_source_variant_color
    from jsonb_array_elements(source_product.variants) as variant
    cross join jsonb_array_elements(variant -> 'sizes') as size_item
    where size_item ->> 'size' = source_size
      and exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(variant -> 'images', '[]'::jsonb)
        ) as images(image_url)
        where split_part(images.image_url, '?', 1) = split_part(source_image_url, '?', 1)
      )
    limit 1;
  end if;

  if resolved_source_variant_color is null then
    select case
      when count(distinct variant ->> 'color') = 1
      then min(variant ->> 'color')
      else null
    end
    into resolved_source_variant_color
    from jsonb_array_elements(source_product.variants) as variant
    cross join jsonb_array_elements(variant -> 'sizes') as size_item
    where size_item ->> 'size' = source_size;
  end if;

  if resolved_source_variant_color is null then
    raise exception 'No se pudo relacionar el color original con el inventario actual.';
  end if;

  select coalesce(sum(quantity), 0)::integer
  into already_exchanged
  from public.sale_exchanges
  where source_type = p_source_type
    and source_item_id = p_source_item_id;

  if p_quantity > source_quantity - already_exchanged then
    raise exception 'No quedan suficientes unidades de esa prenda para cambiar.';
  end if;

  select *
  into replacement_product
  from public.products
  where id = p_replacement_product_id;

  if not found or replacement_product.archived_at is not null then
    raise exception 'La prenda de reemplazo no esta disponible para la venta.';
  end if;

  if p_replacement_unit_price < source_unit_price then
    raise exception 'El reemplazo debe tener igual o mayor valor que la prenda devuelta.';
  end if;

  difference_total :=
    (p_replacement_unit_price - source_unit_price) * p_quantity;

  if difference_total > 0
    and coalesce(p_payment_method, '') not in ('cash', 'transfer')
  then
    raise exception 'Elegi como se cobra la diferencia.';
  end if;

  perform 1
  from public.products
  where id in (source_product_id, p_replacement_product_id)
  order by id
  for update;

  perform public.adjust_exchange_variant_stock(
    source_product_id,
    resolved_source_variant_color,
    source_size,
    p_quantity
  );

  perform public.adjust_exchange_variant_stock(
    p_replacement_product_id,
    p_replacement_variant_color,
    p_replacement_size,
    -p_quantity
  );

  insert into public.sale_exchanges (
    source_type,
    sale_id,
    source_item_id,
    returned_product_id,
    returned_product_sku,
    returned_product_name,
    returned_variant_color,
    returned_size,
    replacement_product_id,
    replacement_product_sku,
    replacement_product_name,
    replacement_variant_color,
    replacement_size,
    quantity,
    original_unit_price,
    replacement_unit_price,
    replacement_unit_cost,
    difference_total,
    payment_method,
    note,
    created_by
  )
  values (
    p_source_type,
    p_sale_id,
    p_source_item_id,
    source_product_id,
    source_product_sku,
    source_product_name,
    source_variant_color,
    source_size,
    p_replacement_product_id,
    replacement_product.sku,
    replacement_product.name,
    p_replacement_variant_color,
    p_replacement_size,
    p_quantity,
    source_unit_price,
    p_replacement_unit_price,
    coalesce(replacement_product.cost, 0),
    difference_total,
    case when difference_total > 0 then p_payment_method else null end,
    nullif(trim(p_note), ''),
    auth.uid()
  )
  returning id into exchange_id;

  return exchange_id;
end;
$$;

revoke all on function public.create_sale_exchange(
  text,
  uuid,
  uuid,
  bigint,
  text,
  text,
  integer,
  numeric,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_sale_exchange(
  text,
  uuid,
  uuid,
  bigint,
  text,
  text,
  integer,
  numeric,
  text,
  text
) to authenticated;

create or replace function public.protect_sale_with_exchanges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_source_type text;
begin
  protected_source_type := case
    when tg_table_name = 'orders' then 'web'
    else 'local'
  end;

  if exists (
    select 1
    from public.sale_exchanges
    where source_type = protected_source_type
      and sale_id = old.id
  ) then
    raise exception 'La venta tiene cambios registrados y debe conservarse en el historial.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_sale_with_exchanges()
  from public, anon, authenticated;

drop trigger if exists protect_order_with_exchanges_update
  on public.orders;

create trigger protect_order_with_exchanges_update
before update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.protect_sale_with_exchanges();

drop trigger if exists protect_order_with_exchanges_delete
  on public.orders;

create trigger protect_order_with_exchanges_delete
before delete on public.orders
for each row
execute function public.protect_sale_with_exchanges();

drop trigger if exists protect_local_sale_with_exchanges_update
  on public.local_sales;

create trigger protect_local_sale_with_exchanges_update
before update of status on public.local_sales
for each row
when (old.status is distinct from new.status)
execute function public.protect_sale_with_exchanges();

drop trigger if exists protect_local_sale_with_exchanges_delete
  on public.local_sales;

create trigger protect_local_sale_with_exchanges_delete
before delete on public.local_sales
for each row
execute function public.protect_sale_with_exchanges();
