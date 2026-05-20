alter table public.products
add column if not exists active boolean not null default true;

create index if not exists products_active_idx
  on public.products (active);

update public.products
set active = true
where active is null;
