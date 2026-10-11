begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='comic-production-check-1791615070077@example.com'),true);
set local role authenticated;
do $$
declare v_series uuid; v_retry uuid; v_before bigint; v_books jsonb := '[{"isbn":"9784088725093","volume":1,"token":"a1000000-0000-0000-0000-000000000001","metadata":{}},{"isbn":"9784088725444","volume":2,"token":"a1000000-0000-0000-0000-000000000002","metadata":{}}]';
begin
  v_series := public.register_comic_batch('Range test','Test author','',null,true,v_books);
  assert (select count(*) from public.comic_copies where series_id=v_series)=2, 'Batch not grouped';
  v_retry := public.register_comic_batch('Range test','Test author','',null,true,v_books);
  assert v_series=v_retry and (select count(*) from public.comic_copies where series_id=v_series)=2, 'Retry duplicated batch';
  select count(*) into v_before from public.comic_copies;
  begin
    perform public.register_comic_batch('Failed range','Test author','',null,true,'[{"isbn":"9784088725093","volume":1,"token":"a1000000-0000-0000-0000-000000000003","metadata":{}},{"isbn":"9784088725444","volume":0,"token":"a1000000-0000-0000-0000-000000000004","metadata":{}}]');
    raise exception 'Invalid second volume accepted';
  exception when others then if sqlerrm <> 'INVALID_INPUT' then raise; end if; end;
  assert (select count(*) from public.comic_copies)=v_before, 'Partial batch saved';
  assert not exists(select 1 from public.comic_series where title='Failed range'), 'Empty series left behind';
  begin
    perform public.register_comic_batch('Duplicate range','Test author','',null,false,'[{"isbn":"9784088725093","volume":1,"token":"a1000000-0000-0000-0000-000000000005","metadata":{}}]');
    raise exception 'Duplicate accepted';
  exception when others then if sqlerrm <> 'DUPLICATE_ISBN' then raise; end if; end;
  assert not has_function_privilege('anon','public.register_comic_batch(text,text,text,uuid,boolean,jsonb)','EXECUTE'), 'Anonymous batch registration';
end $$;
reset role;
rollback;
select 'PASS: batch grouping, retry, full rollback and duplicate protection' as test_result;
