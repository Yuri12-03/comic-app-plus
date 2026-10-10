begin;
insert into public.bookshelves(owner_id)
select id from auth.users where email = 'comic-app-check-20261010-1791613977284@example.com' on conflict(owner_id) do nothing;
insert into public.comic_series(id,bookshelf_id,title)
select 'e0000000-0000-0000-0000-000000000001', b.id, 'Foreign test series' from public.bookshelves b join auth.users u on u.id=b.owner_id
where u.email = 'comic-app-check-20261010-1791613977284@example.com';
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='comic-production-check-1791615070077@example.com'),true);
set local role authenticated;
do $$
declare
  v_series uuid;
  v_retry uuid;
  v_foreign_shelf uuid;
  v_before bigint;
begin
  v_series := public.register_comic('9784088725093','Atomic test',2,'Test author','','','{"source":"test","bookTitle":"Test book"}',null,true,'f0000000-0000-0000-0000-000000000001');
  select count(*) into v_before from public.comic_copies where series_id=v_series;
  v_retry := public.register_comic('9784088725093','Atomic test',2,'Test author','','','{}',null,true,'f0000000-0000-0000-0000-000000000001');
  assert v_series=v_retry and (select count(*) from public.comic_copies where series_id=v_series)=v_before, 'Retry created duplicate';
  perform public.register_comic('9784088725444','Atomic test',1,'Test author','','','{}',v_series,true,'f0000000-0000-0000-0000-000000000002');
  assert (select count(*) from public.comic_copies where series_id=v_series)=v_before+1, 'Volume was not grouped';
  begin
    perform public.register_comic('9784088725093','Atomic test',2,'Test author','','','{}',v_series,false,'f0000000-0000-0000-0000-000000000003');
    raise exception 'Duplicate allowed';
  exception when others then
    if sqlerrm <> 'DUPLICATE_ISBN' then raise; end if;
  end;
  begin
    perform public.register_comic('9784088725093','Foreign write',1,'','','','{}','e0000000-0000-0000-0000-000000000001',true,'f0000000-0000-0000-0000-000000000004');
    raise exception 'Foreign series allowed';
  exception when others then
    if sqlerrm <> 'SERIES_NOT_FOUND' then raise; end if;
  end;
  begin
    insert into public.comic_copies(series_id,volume_number) values('e0000000-0000-0000-0000-000000000001',1);
    raise exception 'Foreign insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.register_comic('9784088725094','Invalid ISBN',1,'','','','{}',null,true,'f0000000-0000-0000-0000-000000000005');
    raise exception 'Invalid ISBN allowed';
  exception when others then
    if sqlerrm <> 'INVALID_INPUT' then raise; end if;
  end;
  assert not has_function_privilege('anon','public.register_comic(text,text,integer,text,text,text,jsonb,uuid,boolean,uuid)','EXECUTE'), 'Anonymous registration';
end $$;
reset role;
rollback;
select 'PASS: atomic registration, retry deduplication, volume grouping, ISBN validation, and owner isolation' as test_result;
