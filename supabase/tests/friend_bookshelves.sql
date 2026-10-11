begin;
select set_config('app.shelf_owner',(select id::text from auth.users where email='comic-profile-check-1791694575767@example.com'),true);
select set_config('app.shelf_reader',(select id::text from auth.users where email='comic-cover-check-1791691659282@example.com'),true);
insert into public.bookshelves(owner_id) values(current_setting('app.shelf_owner')::uuid) on conflict(owner_id) do nothing;
insert into public.comic_series(id,bookshelf_id,title) select 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',id,'閲覧テストの漫画' from public.bookshelves where owner_id=current_setting('app.shelf_owner')::uuid;
insert into public.comic_copies(series_id,volume_number) values('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',1),('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',3);
update public.friend_connections set status='pending' where user_low=least(current_setting('app.shelf_owner')::uuid,current_setting('app.shelf_reader')::uuid) and user_high=greatest(current_setting('app.shelf_owner')::uuid,current_setting('app.shelf_reader')::uuid);
select set_config('request.jwt.claim.sub',current_setting('app.shelf_reader'),true);
set local role authenticated;
do $$ begin
  begin perform public.read_friend_bookshelf(current_setting('app.shelf_owner')::uuid); raise exception 'Pending request read shelf';
  exception when others then if sqlerrm<>'FRIEND_NOT_FOUND' then raise; end if; end;
end $$;
reset role;
update public.friend_connections set status='accepted' where user_low=least(current_setting('app.shelf_owner')::uuid,current_setting('app.shelf_reader')::uuid) and user_high=greatest(current_setting('app.shelf_owner')::uuid,current_setting('app.shelf_reader')::uuid);
set local role authenticated;
do $$ declare item jsonb; begin
  select value into item from jsonb_array_elements(public.read_friend_bookshelf(current_setting('app.shelf_owner')::uuid)) where value->>'id'='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  assert item->>'title'='閲覧テストの漫画','Friend cannot read series';
  assert jsonb_array_length(item->'comic_copies')=2,'Friend cannot read all volumes';
  assert not exists(select 1 from public.comic_series where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),'Direct owner isolation weakened';
  assert not has_function_privilege('anon','public.read_friend_bookshelf(uuid)','EXECUTE'),'Anonymous shelf access';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$ begin
  begin perform public.read_friend_bookshelf(current_setting('app.shelf_owner')::uuid); raise exception 'Outsider read shelf';
  exception when others then if sqlerrm<>'FRIEND_NOT_FOUND' then raise; end if; end;
end $$;
rollback;
select 'PASS: approved friends read all volumes; pending, outsiders and anonymous blocked' as result;
