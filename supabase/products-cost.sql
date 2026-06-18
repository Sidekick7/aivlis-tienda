alter table public.products
add column if not exists cost numeric(12, 2);

update public.products
set cost = 0
where cost is null;

alter table public.products
alter column cost set default 0;

alter table public.products
drop constraint if exists products_cost_non_negative;

alter table public.products
add constraint products_cost_non_negative
check (cost >= 0);
