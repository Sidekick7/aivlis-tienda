alter table public.products
add column if not exists curve_enabled boolean not null default false;

comment on column public.products.curve_enabled is
'Habilita la venta por curva en el punto de venta. Es independiente de sale_mode, que controla la curva publicada en la web.';
