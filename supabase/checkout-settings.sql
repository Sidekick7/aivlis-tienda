create table if not exists public.checkout_settings (
  id integer primary key default 1,
  minimum_purchase_enabled boolean not null default true,
  minimum_purchase_amount numeric(12, 2) not null default 100000,
  shipping_fee_enabled boolean not null default true,
  shipping_fee_amount numeric(12, 2) not null default 5000,
  transfer_surcharge_enabled boolean not null default true,
  transfer_surcharge_percent numeric(5, 2) not null default 5,
  updated_at timestamptz not null default now(),
  constraint checkout_settings_singleton check (id = 1),
  constraint checkout_minimum_amount_nonnegative check (
    minimum_purchase_amount >= 0
  ),
  constraint checkout_shipping_fee_nonnegative check (
    shipping_fee_amount >= 0
  ),
  constraint checkout_transfer_percent_range check (
    transfer_surcharge_percent >= 0
    and transfer_surcharge_percent <= 100
  )
);

alter table public.checkout_settings
  add column if not exists minimum_purchase_enabled boolean not null default true,
  add column if not exists minimum_purchase_amount numeric(12, 2) not null default 100000,
  add column if not exists shipping_fee_enabled boolean not null default true,
  add column if not exists shipping_fee_amount numeric(12, 2) not null default 5000;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkout_minimum_amount_nonnegative'
      and conrelid = 'public.checkout_settings'::regclass
  ) then
    alter table public.checkout_settings
      add constraint checkout_minimum_amount_nonnegative
      check (minimum_purchase_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkout_shipping_fee_nonnegative'
      and conrelid = 'public.checkout_settings'::regclass
  ) then
    alter table public.checkout_settings
      add constraint checkout_shipping_fee_nonnegative
      check (shipping_fee_amount >= 0);
  end if;
end
$$;

alter table public.checkout_settings enable row level security;

drop policy if exists "Public can read checkout settings"
  on public.checkout_settings;

create policy "Public can read checkout settings"
  on public.checkout_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can create checkout settings"
  on public.checkout_settings;

create policy "Admins can create checkout settings"
  on public.checkout_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update checkout settings"
  on public.checkout_settings;

create policy "Admins can update checkout settings"
  on public.checkout_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.checkout_settings (
  id,
  minimum_purchase_enabled,
  minimum_purchase_amount,
  shipping_fee_enabled,
  shipping_fee_amount,
  transfer_surcharge_enabled,
  transfer_surcharge_percent
)
values (1, true, 100000, true, 5000, true, 5)
on conflict (id) do nothing;
