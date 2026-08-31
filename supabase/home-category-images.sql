alter table public.home_content
add column if not exists category_images jsonb not null default '{}'::jsonb;
