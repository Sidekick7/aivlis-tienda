alter table public.products
  add column if not exists sale_active boolean not null default false,
  add column if not exists sale_price numeric(12, 2) not null default 0,
  add column if not exists sale_curve_price numeric(12, 2) not null default 0,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz;

alter table public.products
  drop constraint if exists products_sale_price_non_negative,
  drop constraint if exists products_sale_curve_price_non_negative,
  drop constraint if exists products_sale_dates_valid;

alter table public.products
  add constraint products_sale_price_non_negative
    check (sale_price >= 0),
  add constraint products_sale_curve_price_non_negative
    check (sale_curve_price >= 0),
  add constraint products_sale_dates_valid
    check (
      sale_starts_at is null
      or sale_ends_at is null
      or sale_starts_at < sale_ends_at
    );

create index if not exists products_sale_active_idx
  on public.products (sale_active)
  where sale_active is true;
