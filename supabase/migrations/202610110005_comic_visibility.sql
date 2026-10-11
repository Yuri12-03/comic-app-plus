begin;
alter table public.comic_series add column is_public boolean not null default true,
  add column is_recommended boolean not null default false;
create function public.set_comic_series_setting(p_series uuid,p_setting text,p_value boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_value is null or p_setting is null or p_setting not in ('public','recommended') then raise exception 'INVALID_SETTING'; end if;
  update public.comic_series s set
    is_public=case when p_setting='public' then p_value else s.is_public end,
    is_recommended=case when p_setting='recommended' then p_value else s.is_recommended end
  where s.id=p_series and exists(select 1 from public.bookshelves b where b.id=s.bookshelf_id and b.owner_id=auth.uid());
  if not found then raise exception 'SERIES_NOT_FOUND'; end if;
end $$;
revoke all on function public.set_comic_series_setting(uuid,text,boolean) from public,anon;
grant execute on function public.set_comic_series_setting(uuid,text,boolean) to authenticated;
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
      'id',c.id,'volume_number',c.volume_number,'isbn',c.isbn,'cover_url',c.cover_url,
      'book_title',c.book_title,'publisher',c.publisher,'published_date',c.published_date,'metadata_source',c.metadata_source
    ) order by c.volume_number,c.id) from public.comic_copies c where c.series_id=s.id)
  ) order by s.is_recommended desc,s.title,s.id) from public.comic_series s join public.bookshelves b on b.id=s.bookshelf_id
    where b.owner_id=p_owner and s.is_public and exists(select 1 from public.comic_copies c where c.series_id=s.id)), '[]'::jsonb);
end $$;
commit;
