begin;
create function public.register_comic_batch(p_title text, p_author text, p_description text, p_series_id uuid, p_allow_duplicate boolean, p_books jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_book jsonb; v_series uuid := p_series_id; v_saved uuid;
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_books is null or jsonb_typeof(p_books) <> 'array' then raise exception 'INVALID_INPUT'; end if;
  if jsonb_array_length(p_books) not between 1 and 50 then raise exception 'INVALID_INPUT'; end if;
  if (select count(distinct b->>'token') from jsonb_array_elements(p_books) b) <> jsonb_array_length(p_books)
    or (select count(distinct b->>'isbn') from jsonb_array_elements(p_books) b) <> jsonb_array_length(p_books)
    then raise exception 'INVALID_INPUT'; end if;
  for v_book in select value from jsonb_array_elements(p_books) loop
    v_saved := public.register_comic(v_book->>'isbn', p_title, (v_book->>'volume')::integer,
      p_author, p_description, v_book->>'coverUrl', v_book->'metadata', v_series, p_allow_duplicate, (v_book->>'token')::uuid);
    if v_series is not null and v_saved <> v_series then raise exception 'SERIES_NOT_FOUND'; end if;
    v_series := v_saved;
  end loop;
  return v_series;
end $$;
revoke all on function public.register_comic_batch(text,text,text,uuid,boolean,jsonb) from public, anon;
grant execute on function public.register_comic_batch(text,text,text,uuid,boolean,jsonb) to authenticated;
commit;
