alter table public.local_sales
  drop constraint if exists local_sales_status_check;

alter table public.local_sales
  add constraint local_sales_status_check
  check (
    status in (
      'completed',
      'reserved',
      'cancelled'
    )
  );

create index if not exists local_sales_status_idx
  on public.local_sales(status);
