alter table public.local_sale_items
add column if not exists base_unit_price numeric(12, 2),
add column if not exists adjustment_type text,
add column if not exists adjustment_value numeric(12, 2);

update public.local_sale_items
set
  base_unit_price = coalesce(base_unit_price, unit_price),
  adjustment_type = coalesce(adjustment_type, 'none'),
  adjustment_value = coalesce(adjustment_value, 0);

alter table public.local_sale_items
alter column base_unit_price set default 0,
alter column base_unit_price set not null,
alter column adjustment_type set default 'none',
alter column adjustment_type set not null,
alter column adjustment_value set default 0,
alter column adjustment_value set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'local_sale_items_adjustment_type_check'
  ) then
    alter table public.local_sale_items
    add constraint local_sale_items_adjustment_type_check
    check (
      adjustment_type in (
        'none',
        'discount-percent',
        'discount-amount',
        'surcharge-percent',
        'surcharge-amount'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'local_sale_items_adjustment_value_non_negative'
  ) then
    alter table public.local_sale_items
    add constraint local_sale_items_adjustment_value_non_negative
    check (adjustment_value >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'local_sale_items_base_unit_price_non_negative'
  ) then
    alter table public.local_sale_items
    add constraint local_sale_items_base_unit_price_non_negative
    check (base_unit_price >= 0);
  end if;
end $$;
