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

update public.home_content
set social_links = coalesce(
  social_links,
  '{
    "whatsappNumber": "5491164513813",
    "instagramUrl": "https://www.instagram.com/aivlis.ind",
    "instagramLabel": "@aivlis.ind",
    "facebookUrl": "",
    "facebookLabel": "Facebook",
    "tiktokUrl": "https://www.tiktok.com/@aivlis.ind",
    "tiktokLabel": "@aivlis.ind",
    "showroomAddress": "Yerbal 3160 - Flores - CABA"
  }'::jsonb
)
where id = 1;

update public.home_content
set social_links = '{
  "facebookUrl": "",
  "facebookLabel": "Facebook",
  "showroomAddress": "Yerbal 3160 - Flores - CABA"
}'::jsonb || social_links
where id = 1;
