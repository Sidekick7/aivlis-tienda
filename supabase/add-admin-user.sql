-- Replace the email with the account that should access /admin.
insert into public.admin_users (email)
values ('tu-email@ejemplo.com')
on conflict (email) do nothing;
