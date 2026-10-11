begin;
do $$ declare actor uuid; shelf_id uuid; path text; foreign_path text; begin
 select id into actor from auth.users where email='comic-friends-check-1791697147325@example.com';
 assert actor is not null;
 path:=actor::text||'/aaaaaaaa-0000-0000-0000-000000000001.jpg';
 foreign_path:='62f17695-e510-4916-9f63-e46abcd3f8c3/aaaaaaaa-0000-0000-0000-000000000002.jpg';
 insert into storage.objects(bucket_id,name) values('comic-cover-photos',path),('comic-cover-photos',foreign_path);
 select id into shelf_id from public.bookshelves where owner_id=actor;
 insert into public.comic_series(id,bookshelf_id,title) values('cccccccc-0000-0000-0000-000000000001',shelf_id,'表紙権限テスト');
 insert into public.comic_copies(id,series_id,volume_number) values('cccccccc-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001',1);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 perform public.set_comic_cover_photo('cccccccc-0000-0000-0000-000000000002',path);
 assert public.can_read_comic_cover(path);
 perform public.register_comic('9784088725093','表紙権限テスト',1,'','','',jsonb_build_object('source','国立国会図書館','coverPath',path),'cccccccc-0000-0000-0000-000000000001',true,'cccccccc-0000-0000-0000-000000000003');
 assert exists(select 1 from public.comic_copies where registration_token='cccccccc-0000-0000-0000-000000000003' and cover_path=path and metadata_source='国立国会図書館'),'registration did not attach photo atomically';
 begin
   perform public.register_comic_batch('表紙権限テスト','','','cccccccc-0000-0000-0000-000000000001',true,jsonb_build_array(
     jsonb_build_object('isbn','9784088725093','volume',1,'token','cccccccc-0000-0000-0000-000000000004','metadata',jsonb_build_object('coverPath',path)),
     jsonb_build_object('isbn','9784088725444','volume',2,'token','cccccccc-0000-0000-0000-000000000005','metadata',jsonb_build_object('coverPath',foreign_path))));
   raise exception 'invalid batch succeeded';
 exception when others then if sqlerrm='invalid batch succeeded' then raise; end if; end;
 assert not exists(select 1 from public.comic_copies where registration_token='cccccccc-0000-0000-0000-000000000004'),'partial batch saved after invalid photo';
 begin perform public.set_comic_cover_photo('cccccccc-0000-0000-0000-000000000002',foreign_path); raise exception 'foreign upload accepted'; exception when others then if sqlerrm='foreign upload accepted' then raise; end if; end;
 perform set_config('request.jwt.claims','{"sub":"62f17695-e510-4916-9f63-e46abcd3f8c3","role":"authenticated"}',true);
 assert public.can_read_comic_cover(path),'accepted friend cannot see public cover';
 assert public.read_friend_bookshelf(actor)::text like '%'||path||'%','cover path missing from public friend shelf';
 begin perform public.set_comic_cover_photo('cccccccc-0000-0000-0000-000000000002',foreign_path); raise exception 'friend changed cover'; exception when others then if sqlerrm='friend changed cover' then raise; end if; end;
 update public.comic_series set is_public=false where id='cccccccc-0000-0000-0000-000000000001';
 assert not public.can_read_comic_cover(path),'private photo visible to friend';
 assert public.read_friend_bookshelf(actor)::text not like '%'||path||'%','private photo leaked by RPC';
 perform set_config('request.jwt.claims','{"sub":"207053f6-6b6b-4cd2-b87a-a7851e3fd9c7","role":"authenticated"}',true);
 assert not public.can_read_comic_cover(path),'stranger can read photo';
end $$;
rollback;
select 'PASS: own upload, mutual-friend public read, private denial and owner-only editing' as result;
