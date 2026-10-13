begin;
select set_config('app.owner','62f17695-e510-4916-9f63-e46abcd3f8c3',true);
select set_config('app.reader',(select id::text from auth.users where email='comic-friends-check-1791697147325@example.com'),true);
select set_config('app.stranger',(select id::text from auth.users where id::text not in(current_setting('app.owner'),current_setting('app.reader')) order by created_at limit 1),true);
insert into public.comic_series(id,bookshelf_id,title,is_public) select 'eeeeeeee-1111-1111-1111-111111111111',id,'貸出申請の検証',true from public.bookshelves where owner_id=current_setting('app.owner')::uuid;
insert into public.comic_series(id,bookshelf_id,title,is_public) select 'eeeeeeee-2222-2222-2222-222222222222',id,'非公開の検証',false from public.bookshelves where owner_id=current_setting('app.owner')::uuid;
insert into public.comic_copies(id,series_id,volume_number) values
('eeeeeeee-3333-3333-3333-333333333333','eeeeeeee-1111-1111-1111-111111111111',3),
('eeeeeeee-5555-5555-5555-555555555555','eeeeeeee-1111-1111-1111-111111111111',5),
('eeeeeeee-4444-4444-4444-444444444444','eeeeeeee-2222-2222-2222-222222222222',4);
select set_config('request.jwt.claim.sub',current_setting('app.reader'),true);
set local role authenticated;
do $$ declare saved uuid; retried uuid; v_owner uuid:=current_setting('app.owner')::uuid; copies uuid[]:=array['eeeeeeee-3333-3333-3333-333333333333','eeeeeeee-5555-5555-5555-555555555555']::uuid[]; begin
 saved:=public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',copies,'  3巻と5巻を借りたいです。  ','eeeeeeee-6666-6666-6666-666666666666');
 assert exists(select 1 from public.loan_requests where id=saved and requester_id=auth.uid() and owner_id=v_owner and message='3巻と5巻を借りたいです。' and status='pending'),'Request message not saved';
 assert (select count(*) from public.loan_request_items where request_id=saved)=2,'Multi-volume request partially saved';
 retried:=public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',array[copies[2],copies[1]],'3巻と5巻を借りたいです。','eeeeeeee-6666-6666-6666-666666666666');
 assert retried=saved,'Retry duplicated request';
 begin perform public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',copies,'変更','eeeeeeee-6666-6666-6666-666666666666'); raise exception 'Token changed payload accepted'; exception when others then if sqlerrm<>'TOKEN_CONFLICT' then raise; end if; end;
 begin perform public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',copies,'','eeeeeeee-7777-7777-7777-777777777777'); raise exception 'Duplicate pending accepted'; exception when others then if sqlerrm<>'ALREADY_REQUESTED' then raise; end if; end;
 begin perform public.send_loan_request(v_owner,'eeeeeeee-2222-2222-2222-222222222222',array['eeeeeeee-4444-4444-4444-444444444444']::uuid[],'','eeeeeeee-8888-8888-8888-888888888888'); raise exception 'Private request accepted'; exception when others then if sqlerrm<>'BOOK_UNAVAILABLE' then raise; end if; end;
 begin perform public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',array[copies[1],'eeeeeeee-4444-4444-4444-444444444444'::uuid],'','eeeeeeee-8888-8888-8888-888888888888'); raise exception 'Mixed series accepted'; exception when others then if sqlerrm<>'BOOK_UNAVAILABLE' then raise; end if; end;
 begin perform public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',array[copies[1],copies[1]],'','eeeeeeee-8888-8888-8888-888888888888'); raise exception 'Repeated copy accepted'; exception when others then if sqlerrm<>'INVALID_REQUEST' then raise; end if; end;
 begin perform public.send_loan_request(v_owner,'eeeeeeee-1111-1111-1111-111111111111',copies,repeat('あ',201),'eeeeeeee-8888-8888-8888-888888888888'); raise exception 'Long message accepted'; exception when others then if sqlerrm<>'INVALID_REQUEST' then raise; end if; end;
 assert (select count(*) from public.loan_requests where series_id='eeeeeeee-1111-1111-1111-111111111111')=1,'Failure partially saved request';
 assert not has_table_privilege('authenticated','public.loan_requests','INSERT'),'Direct insert can bypass checks';
 assert not has_table_privilege('authenticated','public.loan_requests','UPDATE'),'Receiver processing accidentally enabled';
 assert not has_function_privilege('anon','public.send_loan_request(uuid,uuid,uuid[],text,uuid)','EXECUTE'),'Anonymous requests allowed';
end $$;
select set_config('request.jwt.claim.sub',current_setting('app.owner'),true);
do $$ begin assert (select count(*) from public.loan_requests where series_id='eeeeeeee-1111-1111-1111-111111111111')=1,'Recipient cannot read message'; assert (select count(*) from public.loan_request_items where copy_id in('eeeeeeee-3333-3333-3333-333333333333','eeeeeeee-5555-5555-5555-555555555555'))=2; begin perform public.send_loan_request(auth.uid(),'eeeeeeee-1111-1111-1111-111111111111',array['eeeeeeee-3333-3333-3333-333333333333']::uuid[],'','eeeeeeee-8888-8888-8888-888888888888'); raise exception 'Self request accepted'; exception when others then if sqlerrm<>'SELF_REQUEST' then raise; end if; end; end $$;
select set_config('request.jwt.claim.sub',current_setting('app.stranger'),true);
do $$ begin assert not exists(select 1 from public.loan_requests where series_id='eeeeeeee-1111-1111-1111-111111111111'),'Third party read message'; assert not exists(select 1 from public.loan_request_items where copy_id='eeeeeeee-3333-3333-3333-333333333333'),'Third party read items'; end $$;
reset role;
update public.friend_connections set status='declined' where user_low=least(current_setting('app.reader')::uuid,current_setting('app.owner')::uuid) and user_high=greatest(current_setting('app.reader')::uuid,current_setting('app.owner')::uuid);
select set_config('request.jwt.claim.sub',current_setting('app.reader'),true);
set local role authenticated;
do $$ begin begin perform public.send_loan_request(current_setting('app.owner')::uuid,'eeeeeeee-1111-1111-1111-111111111111',array['eeeeeeee-3333-3333-3333-333333333333']::uuid[],'','eeeeeeee-8888-8888-8888-888888888888'); raise exception 'Unapproved friend accepted'; exception when others then if sqlerrm<>'FRIEND_NOT_FOUND' then raise; end if; end; end $$;
rollback;
select 'PASS: messages, multiple volumes, retries, duplicate denial, privacy, ownership and participant-only reads' as result;
