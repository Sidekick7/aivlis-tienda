alter table public.products
add column if not exists retail_price numeric(12, 2);

update public.products
set retail_price = price
where retail_price is null;

alter table public.products
alter column retail_price set default 0;

alter table public.products
drop constraint if exists products_retail_price_non_negative;

alter table public.products
add constraint products_retail_price_non_negative
check (retail_price >= 0);
