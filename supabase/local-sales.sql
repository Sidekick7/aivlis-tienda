create extension if not exists pgcrypto;

create table if not exists public.local_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  payment_method text not null,
  total numeric(12, 2) not null default 0,
  internal_notes text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_sales_payment_method_check check (
    payment_method in ('cash', 'transfer', 'mixed')
  ),
  constraint local_sales_status_check check (
    status in ('completed', 'cancelled')
  )
);

create table if not exists public.local_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.local_sales(id) on delete cascade,
  product_id bigint not null,
  product_slug text not null,
  product_sku text,
  product_name text not null,
  variant_color text not null,
  size text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists local_sale_items_sale_id_idx
  on public.local_sale_items(sale_id);

create index if not exists local_sales_created_at_idx
  on public.local_sales(created_at desc);

alter table public.local_sales enable row level security;
alter table public.local_sale_items enable row level security;

drop policy if exists "Admins can read local sales"
  on public.local_sales;

create policy "Admins can read local sales"
  on public.local_sales
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create local sales"
  on public.local_sales;

create policy "Admins can create local sales"
  on public.local_sales
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update local sales"
  on public.local_sales;

create policy "Admins can update local sales"
  on public.local_sales
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete local sales"
  on public.local_sales;

create policy "Admins can delete local sales"
  on public.local_sales
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read local sale items"
  on public.local_sale_items;

create policy "Admins can read local sale items"
  on public.local_sale_items
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create local sale items"
  on public.local_sale_items;

create policy "Admins can create local sale items"
  on public.local_sale_items
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can delete local sale items"
  on public.local_sale_items;

create policy "Admins can delete local sale items"
  on public.local_sale_items
  for delete
  to authenticated
  using (public.is_admin());
