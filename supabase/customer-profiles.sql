create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  dni text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  city text not null default '',
  province text not null default '',
  zip text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

drop policy if exists "Customers can read own profile"
  on public.customer_profiles;

create policy "Customers can read own profile"
  on public.customer_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can create own profile"
  on public.customer_profiles;

create policy "Customers can create own profile"
  on public.customer_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Customers can update own profile"
  on public.customer_profiles;

create policy "Customers can update own profile"
  on public.customer_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.customer_profiles from anon;
grant select, insert, update on table public.customer_profiles to authenticated;

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists create_customer_profile_on_signup on auth.users;

create trigger create_customer_profile_on_signup
  after insert on auth.users
  for each row execute function public.create_customer_profile();

revoke all on function public.create_customer_profile()
  from public, anon, authenticated;

insert into public.customer_profiles (user_id, email)
select id, coalesce(email, '')
from auth.users
on conflict (user_id) do nothing;
