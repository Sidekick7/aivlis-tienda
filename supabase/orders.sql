create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status text not null default 'pending_payment',
  customer_name text not null,
  customer_dni text not null,
  customer_whatsapp text not null,
  customer_address text not null,
  customer_city text not null,
  customer_province text not null,
  customer_zip text not null,
  customer_email text,
  notes text,
  total numeric(12, 2) not null default 0,
  whatsapp_message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (
    status in ('pending_payment', 'confirmed', 'cancelled')
  )
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint,
  product_slug text not null,
  product_name text not null,
  variant_color text,
  size text,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Allow anonymous order creation"
  on public.orders;

create policy "Allow anonymous order creation"
  on public.orders
  for insert
  to anon
  with check (true);

drop policy if exists "Allow anonymous order item creation"
  on public.order_items;

create policy "Allow anonymous order item creation"
  on public.order_items
  for insert
  to anon
  with check (true);

-- No SELECT policy is intentionally created here.
-- Customers can create tickets, but public clients cannot read private orders.
