begin;
select set_config('app.owner','62f17695-e510-4916-9f63-e46abcd3f8c3',true);
select set_config('app.reader',(select id::text from auth.users where email='comic-friends-check-1791697147325@example.com'),true);
insert into public.comic_series(id,bookshelf_id,title) select 'cccccccc-cccc-cccc-cccc-ccccccccccc1',id,'AAA通常の作品' from public.bookshelves where owner_id=current_setting('app.owner')::uuid;
insert into public.comic_series(id,bookshelf_id,title) select 'cccccccc-cccc-cccc-cccc-ccccccccccc2',id,'ZZZおすすめの作品' from public.bookshelves where owner_id=current_setting('app.owner')::uuid;
insert into public.comic_copies(series_id,volume_number) values('cccccccc-cccc-cccc-cccc-ccccccccccc1',1),('cccccccc-cccc-cccc-cccc-ccccccccccc2',2);
select set_config('request.jwt.claim.sub',current_setting('app.owner'),true);
set local role authenticated;
do $$ begin
  assert (select is_public and not is_recommended from public.comic_series where id='cccccccc-cccc-cccc-cccc-ccccccccccc1'),'New series defaults wrong';
  assert (select is_public from public.comic_series where id='dddddddd-dddd-dddd-dddd-dddddddddddd'),'Existing series not public';
  perform public.set_comic_series_setting('cccccccc-cccc-cccc-cccc-ccccccccccc2','recommended',true);
  perform public.set_comic_series_setting('cccccccc-cccc-cccc-cccc-ccccccccccc1','public',false);
  assert (select not is_public from public.comic_series where id='cccccccc-cccc-cccc-cccc-ccccccccccc1'),'Owner cannot keep private series';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.reader'),true);
do $$ declare shelf jsonb; begin
  shelf:=public.read_friend_bookshelf(current_setting('app.owner')::uuid);
  assert shelf->0->>'id'='cccccccc-cccc-cccc-cccc-ccccccccccc2','Recommended is not first';
  assert not exists(select 1 from jsonb_array_elements(shelf) item where item->>'id'='cccccccc-cccc-cccc-cccc-ccccccccccc1'),'Private title or copies leaked';
  begin perform public.set_comic_series_setting('cccccccc-cccc-cccc-cccc-ccccccccccc2','public',false); raise exception 'Friend changed settings';
  exception when others then if sqlerrm<>'SERIES_NOT_FOUND' then raise; end if; end;
  assert not has_function_privilege('anon','public.set_comic_series_setting(uuid,text,boolean)','EXECUTE'),'Anonymous changes allowed';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.owner'),true);
select public.set_comic_series_setting('cccccccc-cccc-cccc-cccc-ccccccccccc2','public',false);
select public.set_comic_series_setting('cccccccc-cccc-cccc-cccc-ccccccccccc1','public',true);
select set_config('request.jwt.claim.sub',current_setting('app.reader'),true);
do $$ declare shelf jsonb; begin
  shelf:=public.read_friend_bookshelf(current_setting('app.owner')::uuid);
  assert not exists(select 1 from jsonb_array_elements(shelf) item where item->>'id'='cccccccc-cccc-cccc-cccc-ccccccccccc2'),'Private recommendation leaked';
  assert exists(select 1 from jsonb_array_elements(shelf) item where item->>'id'='cccccccc-cccc-cccc-cccc-ccccccccccc1'),'Republication failed';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.owner'),true);
select public.set_comic_series_setting('cccccccc-cccc-cccc-cccc-ccccccccccc2','recommended',false);
do $$ begin
  assert (select not is_public and not is_recommended from public.comic_series where id='cccccccc-cccc-cccc-cccc-ccccccccccc2'),'Unstar changed visibility';
end $$;
rollback;
select 'PASS: public defaults, privacy, recommendations first, republish, unstar and owner-only changes' as result;
