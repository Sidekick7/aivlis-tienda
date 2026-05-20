create table if not exists public.categories (
  id bigserial primary key,
  label text not null,
  value text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "Public can read active categories"
  on public.categories;

create policy "Public can read active categories"
  on public.categories
  for select
  to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "Admins can create categories"
  on public.categories;

create policy "Admins can create categories"
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update categories"
  on public.categories;

create policy "Admins can update categories"
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete categories"
  on public.categories;

create policy "Admins can delete categories"
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());

insert into public.categories (label, value, sort_order, active)
values
  ('Remeras', 'remeras', 1, true),
  ('Camperas', 'camperas', 2, true),
  ('Pantalones', 'pantalones', 3, true),
  ('Shorts/Bermuda', 'shorts-bermuda', 4, true)
on conflict (value) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;
