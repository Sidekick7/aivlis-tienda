create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read admin users"
  on public.admin_users;

create policy "Admins can read admin users"
  on public.admin_users
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read orders"
  on public.orders;

create policy "Admins can read orders"
  on public.orders
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update orders"
  on public.orders;

create policy "Admins can update orders"
  on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read order items"
  on public.order_items;

create policy "Admins can read order items"
  on public.order_items
  for select
  to authenticated
  using (public.is_admin());

alter table public.products enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
  loop
    execute format(
      'drop policy if exists %I on public.products',
      policy_record.policyname
    );
  end loop;
end $$;

create policy "Public can read products"
  on public.products
  for select
  to anon, authenticated
  using (active = true or public.is_admin());

create policy "Admins can create products"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update products"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete products"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Public can read product images"
  on storage.objects;

create policy "Public can read product images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'products');

drop policy if exists "Admins can upload product images"
  on storage.objects;

create policy "Admins can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'products'
    and public.is_admin()
  );

drop policy if exists "Admins can update product images"
  on storage.objects;

create policy "Admins can update product images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'products'
    and public.is_admin()
  )
  with check (
    bucket_id = 'products'
    and public.is_admin()
  );

drop policy if exists "Admins can delete product images"
  on storage.objects;

create policy "Admins can delete product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'products'
    and public.is_admin()
  );

-- Replace this example with your real admin email after running the file.
-- insert into public.admin_users (email)
-- values ('tu-email@ejemplo.com')
-- on conflict (email) do nothing;
