insert into storage.buckets (id, name, public)
values ('home', 'home', true)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.home_content (
  id integer primary key default 1,
  hero_images text[] not null default '{}',
  trust_items text[] not null default '{}',
  store_title text not null default 'TIENDA',
  store_description text not null default 'Explora productos por categoria, ordena por precio o novedades, y elegi talle y color con stock actualizado.',
  store_button_label text not null default 'Ir a tienda',
  featured_eyebrow text not null default 'Seleccion',
  featured_title text not null default 'Destacados',
  category_eyebrow text not null default 'Accesos rapidos',
  category_title text not null default 'Comprar por categoria',
  category_card_text text not null default 'Ver productos disponibles',
  social_links jsonb not null default '{
    "whatsappNumber": "5491164513813",
    "instagramUrl": "https://www.instagram.com/aivlis.ind",
    "instagramLabel": "@aivlis.ind",
    "facebookUrl": "",
    "facebookLabel": "Facebook",
    "tiktokUrl": "https://www.tiktok.com/@aivlis.ind",
    "tiktokLabel": "@aivlis.ind",
    "showroomAddress": "Yerbal 3160 - Flores - CABA"
  }'::jsonb,
  updated_at timestamptz not null default now(),
  constraint home_content_singleton check (id = 1)
);

alter table public.home_content
add column if not exists social_links jsonb not null default '{
  "whatsappNumber": "5491164513813",
  "instagramUrl": "https://www.instagram.com/aivlis.ind",
  "instagramLabel": "@aivlis.ind",
  "facebookUrl": "",
  "facebookLabel": "Facebook",
  "tiktokUrl": "https://www.tiktok.com/@aivlis.ind",
  "tiktokLabel": "@aivlis.ind",
  "showroomAddress": "Yerbal 3160 - Flores - CABA"
}'::jsonb;

alter table public.home_content enable row level security;

drop policy if exists "Public can read home content"
  on public.home_content;

create policy "Public can read home content"
  on public.home_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can create home content"
  on public.home_content;

create policy "Admins can create home content"
  on public.home_content
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update home content"
  on public.home_content;

create policy "Admins can update home content"
  on public.home_content
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public can read home images"
  on storage.objects;

create policy "Public can read home images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'home');

drop policy if exists "Admins can upload home images"
  on storage.objects;

create policy "Admins can upload home images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'home'
    and public.is_admin()
  );

drop policy if exists "Admins can update home images"
  on storage.objects;

create policy "Admins can update home images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'home'
    and public.is_admin()
  )
  with check (
    bucket_id = 'home'
    and public.is_admin()
  );

drop policy if exists "Admins can delete home images"
  on storage.objects;

create policy "Admins can delete home images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'home'
    and public.is_admin()
  );

insert into public.home_content (
  id,
  hero_images,
  trust_items
)
values (
  1,
  array[
    '/editorial/1.png',
    '/editorial/2.png',
    '/editorial/3.png',
    '/editorial/4.png',
    '/editorial/5.png'
  ],
  array[
    'Envios a todo el pais',
    'Retiro en local',
    'Stock por talle y color',
    'Pedido por WhatsApp'
  ]
)
on conflict (id) do nothing;
