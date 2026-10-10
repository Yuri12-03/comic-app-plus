begin;
alter table public.comic_copies
  add column book_title text,
  add column publisher text,
  add column published_date text,
  add column metadata_source text,
  add column book_metadata jsonb,
  add column registration_token uuid unique;

grant insert on public.bookshelves, public.comic_series, public.comic_copies to authenticated;
create policy own_bookshelf_insert on public.bookshelves for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy own_series_insert on public.comic_series for insert to authenticated
with check (exists (select 1 from public.bookshelves b where b.id = bookshelf_id and b.owner_id = (select auth.uid())));
create policy own_copies_insert on public.comic_copies for insert to authenticated
with check (exists (select 1 from public.comic_series s join public.bookshelves b on b.id = s.bookshelf_id where s.id = series_id and b.owner_id = (select auth.uid())));

-- Uses caller's RLS, never a service role; all inserts commit or roll back together.
create function public.register_comic(
  p_isbn text, p_title text, p_volume integer, p_author text,
  p_description text, p_cover_url text, p_metadata jsonb,
  p_series_id uuid, p_allow_duplicate boolean, p_token uuid
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_shelf uuid;
  v_series uuid;
  v_existing uuid;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_isbn is null or p_isbn !~ '^(978|979)[0-9]{10}$'
    or (select sum(substr(p_isbn,i,1)::integer * case when i % 2 = 0 then 3 else 1 end) from generate_series(1,13) i) % 10 <> 0
    or p_title is null or length(trim(p_title)) not between 1 and 200
    or p_volume is null or p_volume not between 1 and 9999
    or p_token is null or length(coalesce(p_author,'')) > 500
    or length(coalesce(p_description,'')) > 5000
    or length(coalesce(p_cover_url,'')) > 2000
    or (coalesce(p_cover_url,'') <> '' and p_cover_url !~ '^https://')
    or pg_column_size(p_metadata) > 30000 then raise exception 'INVALID_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select series_id into v_existing from public.comic_copies where registration_token = p_token;
  if v_existing is not null then return v_existing; end if;
  insert into public.bookshelves(owner_id) values(v_user) on conflict(owner_id) do nothing;
  select id into v_shelf from public.bookshelves where owner_id = v_user;
  if p_series_id is not null then
    select id into v_series from public.comic_series where id = p_series_id and bookshelf_id = v_shelf;
    if v_series is null then raise exception 'SERIES_NOT_FOUND'; end if;
  else
    select id into v_series from public.comic_series where bookshelf_id = v_shelf and title = trim(p_title) and coalesce(author,'') = coalesce(nullif(trim(p_author),''),'') order by created_at,id limit 1;
  end if;
  if not coalesce(p_allow_duplicate,false) and exists(select 1 from public.comic_copies c join public.comic_series s on s.id=c.series_id where s.bookshelf_id=v_shelf and c.isbn=p_isbn) then
    raise exception 'DUPLICATE_ISBN';
  end if;
  if v_series is null then
    insert into public.comic_series(bookshelf_id,title,author,description)
      values(v_shelf,trim(p_title),nullif(trim(p_author),''),nullif(p_description,'')) returning id into v_series;
  end if;
  insert into public.comic_copies(series_id,volume_number,isbn,cover_url,book_title,publisher,published_date,metadata_source,book_metadata,registration_token)
    values(v_series,p_volume,p_isbn,nullif(p_cover_url,''),p_metadata->>'bookTitle',p_metadata->>'publisher',p_metadata->>'publishedDate',p_metadata->>'source',p_metadata,p_token);
  return v_series;
end $$;
revoke all on function public.register_comic(text,text,integer,text,text,text,jsonb,uuid,boolean,uuid) from public, anon;
grant execute on function public.register_comic(text,text,integer,text,text,text,jsonb,uuid,boolean,uuid) to authenticated;
commit;
