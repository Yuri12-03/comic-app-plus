begin;
select set_config('app.friend_a',(select id::text from auth.users where email='comic-production-check-1791615070077@example.com'),true);
select set_config('app.friend_b',(select id::text from auth.users where email='comic-cover-check-1791691659282@example.com'),true);
select set_config('app.friend_b_code',(select friend_code from public.friend_codes where user_id=current_setting('app.friend_b')::uuid),true);
select set_config('request.jwt.claim.sub',current_setting('app.friend_a'),true);
insert into storage.objects(bucket_id,name) values ('profile-photos',current_setting('app.friend_a')||'/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg');
set local role authenticated;
do $$
declare target_code text:=current_setting('app.friend_b_code'); request_id uuid;
begin
  assert (select count(*) from public.friend_codes)=1,'Other friend IDs enumerable';
  assert (select count(*) from public.find_friend(target_code))=1,'Exact ID lookup failed';
  assert (select count(*) from public.find_friend('0000000000000000'))=0,'Unknown ID matched';
  begin
    perform public.request_friend((select friend_code from public.friend_codes));
    raise exception 'Self request accepted';
  exception when others then if sqlerrm<>'SELF_REQUEST' then raise; end if; end;
  assert public.request_friend(target_code)='pending','Request failed';
  assert public.request_friend(target_code)='pending','Retry failed';
  assert (select count(*) from public.list_friend_connections() where friend_id=current_setting('app.friend_b')::uuid)=1,'Duplicate relation';
  select connection_id into request_id from public.list_friend_connections() where friend_id=current_setting('app.friend_b')::uuid;
  perform set_config('app.friend_request',request_id::text,true);
  begin perform public.respond_friend(request_id,true); raise exception 'Sender approved own request';
  exception when others then if sqlerrm<>'REQUEST_NOT_FOUND' then raise; end if; end;
  assert not exists(select 1 from public.list_friend_connections() where friend_id=current_setting('app.friend_b')::uuid and status='accepted'),'Friends before approval';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.friend_b'),true);
do $$ begin
  assert (select incoming from public.list_friend_connections() where connection_id=current_setting('app.friend_request')::uuid),'Incoming request missing';
  assert not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=current_setting('app.friend_a')||'/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg'),'Photo visible before approval';
  assert public.respond_friend(current_setting('app.friend_request')::uuid,false)='declined','Decline failed';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.friend_a'),true);
select public.request_friend(current_setting('app.friend_b_code'));
select set_config('request.jwt.claim.sub',current_setting('app.friend_b'),true);
do $$ begin
  assert public.respond_friend(current_setting('app.friend_request')::uuid,true)='accepted','Approval failed';
  assert (select count(*) from public.list_friend_connections() where friend_id=current_setting('app.friend_a')::uuid and status='accepted')=1,'Recipient list missing';
  assert exists(select 1 from storage.objects where bucket_id='profile-photos' and name=current_setting('app.friend_a')||'/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg'),'Approved friend cannot read photo';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.friend_a'),true);
do $$ begin
  assert (select count(*) from public.list_friend_connections() where friend_id=current_setting('app.friend_b')::uuid and status='accepted')=1,'Sender list missing';
  assert public.request_friend(current_setting('app.friend_b_code'))='already_friends','Friend retry not idempotent';
  assert not has_table_privilege('authenticated','public.friend_connections','INSERT'),'Client can bypass approval';
  assert not has_function_privilege('anon','public.find_friend(text)','EXECUTE'),'Anonymous lookup allowed';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$ begin
  assert (select count(*) from public.list_friend_connections())=0,'Outsider can list friends';
  assert not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=current_setting('app.friend_a')||'/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg'),'Outsider can read photo';
  begin perform public.respond_friend(current_setting('app.friend_request')::uuid,true); raise exception 'Outsider approved request';
  exception when others then if sqlerrm<>'REQUEST_NOT_FOUND' then raise; end if; end;
end $$;
reset role;
rollback;
select 'PASS: friend IDs, requests, retries, decline, mutual approval and owner isolation' as test_result;
