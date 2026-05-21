alter table public.products
add column if not exists sku text;

with numbered_products as (
  select
    id,
    'AIV-' || lpad(row_number() over (order by id)::text, 6, '0') as next_sku
  from public.products
  where
    sku is null
    or trim(sku) = ''
    or lower(trim(sku)) = lower(trim(slug))
)
update public.products
set sku = numbered_products.next_sku
from numbered_products
where products.id = numbered_products.id;

alter table public.products
drop constraint if exists products_sku_format_check;

alter table public.products
add constraint products_sku_format_check
check (sku is null or sku ~ '^AIV-[A-Z0-9-]{3,6}$');

create unique index if not exists products_sku_unique_idx
  on public.products (sku)
  where sku is not null;
