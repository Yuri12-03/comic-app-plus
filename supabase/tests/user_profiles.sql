begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='comic-production-check-1791615070077@example.com'),true);
set local role authenticated;
do $$
declare own_id uuid := auth.uid();
begin
  insert into public.user_profiles(id,display_name,avatar_kind,avatar_preset) values (own_id,'テストのねこ','preset','cat')
  on conflict(id) do update set display_name=excluded.display_name,avatar_kind='preset',avatar_preset='cat',avatar_path=null;
  assert (select display_name from public.user_profiles where id=own_id)='テストのねこ', 'Own profile not readable';
  update public.user_profiles set display_name='変更した名前',avatar_preset='book' where id=own_id;
  assert (select avatar_preset from public.user_profiles where id=own_id)='book', 'Own profile not editable';
  begin
    update public.user_profiles set avatar_preset='invalid' where id=own_id;
    raise exception 'Invalid preset accepted';
  exception when check_violation then null; end;
  begin
    update public.user_profiles set display_name='' where id=own_id;
    raise exception 'Empty name accepted';
  exception when check_violation then null; end;
  begin
    update public.user_profiles set avatar_kind='photo',avatar_path='00000000-0000-0000-0000-000000000000/11111111-1111-1111-1111-111111111111.jpg' where id=own_id;
    raise exception 'Other photo path accepted';
  exception when check_violation then null; end;
  assert not exists(select 1 from public.user_profiles where id<>own_id), 'Other profiles visible';
  begin
    insert into public.user_profiles(id,display_name) values('00000000-0000-0000-0000-000000000000','Other');
    raise exception 'Other profile writable';
  exception when insufficient_privilege then null; end;
  assert not has_table_privilege('anon','public.user_profiles','SELECT'), 'Anonymous profiles readable';
end $$;
reset role;
do $$ begin
  assert (select not public and file_size_limit=524288 from storage.buckets where id='profile-photos'), 'Photo bucket not private or unrestricted';
  assert (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'profile_photo_%')=3, 'Missing photo ownership policies';
end $$;
rollback;
select 'PASS: profile creation, editing, validation, ownership and private photos' as test_result;
