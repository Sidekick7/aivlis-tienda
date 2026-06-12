alter table public.products
  add column if not exists sale_mode text not null default 'unit';

alter table public.products
  drop constraint if exists products_sale_mode_check;

alter table public.products
  add constraint products_sale_mode_check
  check (sale_mode in ('unit', 'curve'));
