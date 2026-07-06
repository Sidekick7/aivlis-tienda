alter table public.products
add column if not exists curve_price numeric(12, 2);

update public.products
set curve_price = price
where curve_price is null;

alter table public.products
alter column curve_price set default 0;

alter table public.products
drop constraint if exists products_curve_price_non_negative;

alter table public.products
add constraint products_curve_price_non_negative
check (curve_price >= 0);
