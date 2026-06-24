alter table public.orders
  add column if not exists fulfillment_status text not null default 'to_prepare',
  add column if not exists shipping_carrier text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_fulfillment_status_check'
  ) then
    alter table public.orders
      add constraint orders_fulfillment_status_check
      check (
        fulfillment_status in (
          'to_prepare',
          'prepared',
          'shipped',
          'delivered'
        )
      );
  end if;
end $$;

create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status);

create index if not exists orders_shipped_at_idx
  on public.orders (shipped_at);
