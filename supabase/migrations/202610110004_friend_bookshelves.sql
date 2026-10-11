begin;
create function public.read_friend_bookshelf(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.friend_connections f where f.status='accepted'
    and f.user_low=least(auth.uid(),p_owner) and f.user_high=greatest(auth.uid(),p_owner)
  ) then raise exception 'FRIEND_NOT_FOUND'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',s.id,'title',s.title,'author',s.author,'description',s.description,
    'comic_copies',(select jsonb_agg(jsonb_build_object(
      'id',c.id,'volume_number',c.volume_number,'isbn',c.isbn,'cover_url',c.cover_url,
      'book_title',c.book_title,'publisher',c.publisher,'published_date',c.published_date,'metadata_source',c.metadata_source
    ) order by c.volume_number,c.id) from public.comic_copies c where c.series_id=s.id)
  ) order by s.title,s.id) from public.comic_series s join public.bookshelves b on b.id=s.bookshelf_id
    where b.owner_id=p_owner and exists(select 1 from public.comic_copies c where c.series_id=s.id)), '[]'::jsonb);
end $$;
revoke all on function public.read_friend_bookshelf(uuid) from public,anon;
grant execute on function public.read_friend_bookshelf(uuid) to authenticated;
commit;
