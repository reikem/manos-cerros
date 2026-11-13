-- Opiniones de la comunidad sobre los comerciantes ambulantes.
-- Ejecuta este archivo en Supabase → SQL Editor (o con `supabase db push`).

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  author     text not null check (char_length(author) between 2 and 40),
  rating     smallint not null check (rating between 1 and 5),
  body       text not null check (char_length(body) between 10 and 600),
  status     text not null default 'published' check (status in ('published', 'hidden')),
  ip_hash    text not null,                       -- SHA-256(sal + IP): nunca se guarda la IP real
  created_at timestamptz not null default now()
);

create index if not exists comments_recent_idx on public.comments (created_at desc) where status = 'published';
create index if not exists comments_ip_idx     on public.comments (ip_hash, created_at desc);

-- La tabla base queda cerrada: sin políticas, el navegador no puede leer ni escribir en ella.
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;

-- El navegador solo puede LEER estas vistas (sin ip_hash ni opiniones ocultas).
create or replace view public.comments_public as
  select id, author, rating, body, created_at
  from public.comments
  where status = 'published';

create or replace view public.comment_stats as
  select
    count(*)::int                                   as total,
    coalesce(round(avg(rating)::numeric, 2), 0)::float8 as avg,
    count(*) filter (where rating = 1)::int         as r1,
    count(*) filter (where rating = 2)::int         as r2,
    count(*) filter (where rating = 3)::int         as r3,
    count(*) filter (where rating = 4)::int         as r4,
    count(*) filter (where rating = 5)::int         as r5
  from public.comments
  where status = 'published';

grant select on public.comments_public, public.comment_stats to anon, authenticated;

-- Las inserciones las hace SOLO la Edge Function `post-comment` (con la secret key y límite por IP).
-- Para ocultar una opinión abusiva:  update public.comments set status = 'hidden' where id = '...';
