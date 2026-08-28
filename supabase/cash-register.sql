create extension if not exists pgcrypto;

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opening_amount numeric(12, 2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closing_amount numeric(12, 2),
  expected_amount numeric(12, 2),
  difference numeric(12, 2),
  opening_note text,
  closing_note text,
  opened_by uuid references auth.users(id) on delete set null default auth.uid(),
  closed_by uuid references auth.users(id) on delete set null,
  constraint cash_sessions_opening_amount_non_negative check (opening_amount >= 0),
  constraint cash_sessions_closing_amount_non_negative check (
    closing_amount is null or closing_amount >= 0
  )
);

create unique index if not exists cash_sessions_one_open_idx
  on public.cash_sessions ((true))
  where closed_at is null;

create index if not exists cash_sessions_opened_at_idx
  on public.cash_sessions(opened_at desc);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_sessions(id) on delete restrict,
  movement_type text not null,
  payment_method text not null,
  description text not null,
  amount numeric(12, 2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint cash_movements_type_check check (
    movement_type in ('income', 'expense')
  ),
  constraint cash_movements_payment_check check (
    payment_method in ('cash', 'transfer')
  ),
  constraint cash_movements_amount_positive check (amount > 0),
  constraint cash_movements_description_present check (
    length(trim(description)) > 0
  )
);

create index if not exists cash_movements_session_idx
  on public.cash_movements(session_id, created_at desc);

create index if not exists cash_movements_created_at_idx
  on public.cash_movements(created_at desc);

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "Admins can read cash sessions" on public.cash_sessions;
create policy "Admins can read cash sessions"
  on public.cash_sessions for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create cash sessions" on public.cash_sessions;
create policy "Admins can create cash sessions"
  on public.cash_sessions for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update cash sessions" on public.cash_sessions;
create policy "Admins can update cash sessions"
  on public.cash_sessions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read cash movements" on public.cash_movements;
create policy "Admins can read cash movements"
  on public.cash_movements for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create cash movements" on public.cash_movements;
create policy "Admins can create cash movements"
  on public.cash_movements for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can delete cash movements" on public.cash_movements;
create policy "Admins can delete cash movements"
  on public.cash_movements for delete to authenticated
  using (public.is_admin());

revoke all on table public.cash_sessions from anon, authenticated;
revoke all on table public.cash_movements from anon, authenticated;
grant select, insert, update on table public.cash_sessions to authenticated;
grant select, insert, delete on table public.cash_movements to authenticated;
