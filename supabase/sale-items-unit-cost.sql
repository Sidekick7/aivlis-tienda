alter table public.order_items
add column if not exists unit_cost numeric(12, 2);

alter table public.local_sale_items
add column if not exists unit_cost numeric(12, 2);

update public.order_items as order_item
set unit_cost = coalesce(product.cost, 0)
from public.products as product
where order_item.product_id = product.id
  and (order_item.unit_cost is null or order_item.unit_cost = 0);

update public.local_sale_items as sale_item
set unit_cost = coalesce(product.cost, 0)
from public.products as product
where sale_item.product_id = product.id
  and (sale_item.unit_cost is null or sale_item.unit_cost = 0);

update public.order_items
set unit_cost = 0
where unit_cost is null;

update public.local_sale_items
set unit_cost = 0
where unit_cost is null;

alter table public.order_items
alter column unit_cost set default 0,
alter column unit_cost set not null;

alter table public.local_sale_items
alter column unit_cost set default 0,
alter column unit_cost set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_unit_cost_non_negative'
  ) then
    alter table public.order_items
    add constraint order_items_unit_cost_non_negative
    check (unit_cost >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'local_sale_items_unit_cost_non_negative'
  ) then
    alter table public.local_sale_items
    add constraint local_sale_items_unit_cost_non_negative
    check (unit_cost >= 0);
  end if;
end $$;
