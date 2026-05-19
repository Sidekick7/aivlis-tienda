-- Run this first to find duplicated slugs before adding the unique index.
select
  slug,
  count(*) as total
from public.products
group by slug
having count(*) > 1;

-- If the query above returns rows, edit or delete the duplicated products
-- from the admin panel before running the unique index below.

create unique index if not exists products_slug_unique_idx
  on public.products (slug);
