begin;
alter table public.comic_copies add column cover_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('comic-cover-photos','comic-cover-photos',false,524288,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function public.can_read_comic_cover(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    split_part(p_path,'/',1)=auth.uid()::text or exists(
      select 1 from public.comic_copies c join public.comic_series s on s.id=c.series_id
      join public.bookshelves b on b.id=s.bookshelf_id join public.friend_connections f
      on f.user_low=least(auth.uid(),b.owner_id) and f.user_high=greatest(auth.uid(),b.owner_id) and f.status='accepted'
      where c.cover_path=p_path and s.is_public and split_part(p_path,'/',1)=b.owner_id::text
    )
  );
$$;
revoke all on function public.can_read_comic_cover(text) from public,anon;
grant execute on function public.can_read_comic_cover(text) to authenticated;
create policy comic_cover_read on storage.objects for select to authenticated
using(bucket_id='comic-cover-photos' and public.can_read_comic_cover(name));
create policy comic_cover_insert on storage.objects for insert to authenticated
with check(bucket_id='comic-cover-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$');
create policy comic_cover_delete on storage.objects for delete to authenticated
using(bucket_id='comic-cover-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create function public.validate_comic_cover_path() returns trigger
language plpgsql set search_path='' as $$
declare owner_id uuid;
begin
  if new.cover_path is null then return new; end if;
  select b.owner_id into owner_id from public.comic_series s join public.bookshelves b on b.id=s.bookshelf_id where s.id=new.series_id;
  if new.cover_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' or split_part(new.cover_path,'/',1)<>owner_id::text
  or not exists(select 1 from storage.objects o where o.bucket_id='comic-cover-photos' and o.name=new.cover_path)
  then raise exception 'INVALID_COVER_PATH'; end if;
  return new;
end $$;
create trigger validate_comic_cover_path before insert or update of cover_path,series_id on public.comic_copies
for each row execute function public.validate_comic_cover_path();
create function public.set_comic_cover_photo(p_copy uuid,p_path text) returns text
language plpgsql security definer set search_path='' as $$
declare old_path text;
begin
  if auth.uid() is null or p_path is null or split_part(p_path,'/',1)<>auth.uid()::text then raise exception 'INVALID_COVER_PATH'; end if;
  select c.cover_path into old_path from public.comic_copies c join public.comic_series s on s.id=c.series_id join public.bookshelves b on b.id=s.bookshelf_id
  where c.id=p_copy and b.owner_id=auth.uid() for update of c;
  if not found then raise exception 'COPY_NOT_FOUND'; end if;
  update public.comic_copies set cover_path=p_path where id=p_copy;
  return old_path;
end $$;
revoke all on function public.set_comic_cover_photo(uuid,text) from public,anon;
grant execute on function public.set_comic_cover_photo(uuid,text) to authenticated;
create or replace function public.register_comic(
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
  insert into public.comic_copies(series_id,volume_number,isbn,cover_url,book_title,publisher,published_date,metadata_source,book_metadata,registration_token,cover_path)
    values(v_series,p_volume,p_isbn,nullif(p_cover_url,''),p_metadata->>'bookTitle',p_metadata->>'publisher',p_metadata->>'publishedDate',p_metadata->>'source',p_metadata,p_token,nullif(p_metadata->>'coverPath',''));
  return v_series;
end $$;

create or replace function public.read_friend_bookshelf(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.friend_connections f where f.status='accepted'
    and f.user_low=least(auth.uid(),p_owner) and f.user_high=greatest(auth.uid(),p_owner)
  ) then raise exception 'FRIEND_NOT_FOUND'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',s.id,'title',s.title,'author',s.author,'description',s.description,'is_recommended',s.is_recommended,
    'comic_copies',(select jsonb_agg(jsonb_build_object(
      'id',c.id,'volume_number',c.volume_number,'isbn',c.isbn,'cover_url',c.cover_url,'cover_path',c.cover_path,
      'book_title',c.book_title,'publisher',c.publisher,'published_date',c.published_date,'metadata_source',c.metadata_source
    ) order by c.volume_number,c.id) from public.comic_copies c where c.series_id=s.id)
  ) order by s.is_recommended desc,s.title,s.id) from public.comic_series s join public.bookshelves b on b.id=s.bookshelf_id
    where b.owner_id=p_owner and s.is_public and exists(select 1 from public.comic_copies c where c.series_id=s.id)), '[]'::jsonb);
end $$;

commit;
