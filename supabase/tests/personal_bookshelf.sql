-- Transactional fixtures are rolled back. Requires two existing Auth test users.
begin;
insert into public.bookshelves(id, owner_id)
select 'b0000000-0000-0000-0000-000000000001', id from auth.users
where email = 'comic-production-check-1791615070077@example.com';
insert into public.bookshelves(id, owner_id)
select 'b0000000-0000-0000-0000-000000000002', id from auth.users
where email = 'comic-app-check-20261010-1791613977284@example.com';
insert into public.comic_series(id, bookshelf_id, title) values
('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Test owner one'),
('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','Test owner two');
insert into public.comic_copies(id,series_id,volume_number) values
('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',10),
('d0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',3),
('d0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000002',1);
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='comic-production-check-1791615070077@example.com'),true);
set local role authenticated;
do $$
begin
  assert (select count(*) from public.bookshelves where id in ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002')) = 1, 'Shelf isolation failed';
  assert (select count(*) from public.comic_series where id in ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002')) = 1, 'Series isolation failed';
  assert (select count(*) from public.comic_copies where id in ('d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000003')) = 2, 'Copy isolation failed';
  assert not has_table_privilege('authenticated','public.comic_copies','INSERT'), 'Unexpected write permission';
  assert not has_table_privilege('anon','public.comic_copies','SELECT'), 'Anonymous access';
  assert not has_table_privilege('anon','public.comic_series','SELECT'), 'Anonymous series access';
  assert not has_table_privilege('anon','public.bookshelves','SELECT'), 'Anonymous bookshelf access';
end $$;
reset role;
rollback;
select 'PASS: owner isolation and anonymous denial; fixtures rolled back' as test_result;
