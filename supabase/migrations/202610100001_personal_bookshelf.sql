begin;

create table public.bookshelves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '自分の本棚',
  created_at timestamptz not null default now(),
  unique (owner_id)
);

-- A series belongs to one shelf. Each physical copy inherits that shelf.
create table public.comic_series (
  id uuid primary key default gen_random_uuid(),
  bookshelf_id uuid not null references public.bookshelves(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  author text,
  description text,
  created_at timestamptz not null default now()
);
create index comic_series_bookshelf_idx on public.comic_series(bookshelf_id);

create table public.comic_copies (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.comic_series(id) on delete cascade,
  volume_number integer not null check (volume_number > 0),
  isbn text,
  cover_url text check (cover_url is null or cover_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create index comic_copies_series_idx on public.comic_copies(series_id);

alter table public.bookshelves enable row level security;
alter table public.comic_series enable row level security;
alter table public.comic_copies enable row level security;
revoke all on public.bookshelves, public.comic_series, public.comic_copies from anon, authenticated;
grant select on public.bookshelves, public.comic_series, public.comic_copies to authenticated;

create policy own_bookshelf_read on public.bookshelves for select to authenticated
using (owner_id = (select auth.uid()));
create policy own_series_read on public.comic_series for select to authenticated
using (exists (select 1 from public.bookshelves b where b.id = bookshelf_id and b.owner_id = (select auth.uid())));
create policy own_copies_read on public.comic_copies for select to authenticated
using (exists (select 1 from public.comic_series s join public.bookshelves b on b.id = s.bookshelf_id where s.id = series_id and b.owner_id = (select auth.uid())));

commit;
