begin;
create table public.loan_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id),
 owner_id uuid not null references auth.users(id),
 series_id uuid not null references public.comic_series(id),
 series_title text not null,
 owner_name text not null,
 message text not null default '' check(char_length(message)<=200),
 status text not null default 'pending' check(status='pending'),
 token uuid not null,
 created_at timestamptz not null default now(),
 unique(requester_id,token), check(requester_id<>owner_id)
);
create table public.loan_request_items (
 request_id uuid not null references public.loan_requests(id) on delete cascade,
 copy_id uuid not null references public.comic_copies(id),
 volume_number integer not null,
 book_title text not null,
 isbn text,
 primary key(request_id,copy_id)
);
create index loan_requests_sender_date on public.loan_requests(requester_id,created_at desc);
create index loan_requests_owner_date on public.loan_requests(owner_id,created_at desc);
create index loan_request_items_copy on public.loan_request_items(copy_id);
alter table public.loan_requests enable row level security;
alter table public.loan_request_items enable row level security;
revoke all on public.loan_requests,public.loan_request_items from public,anon,authenticated;
grant select on public.loan_requests,public.loan_request_items to authenticated;
create policy loan_requests_participants on public.loan_requests for select to authenticated
using((select auth.uid()) in(requester_id,owner_id));
create policy loan_request_items_participants on public.loan_request_items for select to authenticated
using(exists(select 1 from public.loan_requests r where r.id=request_id and (select auth.uid()) in(r.requester_id,r.owner_id)));
create function public.send_loan_request(p_owner uuid,p_series uuid,p_copies uuid[],p_message text,p_token uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); saved public.loan_requests; request_id uuid; title text; owner_name text; ordered uuid[];
begin
 if actor is null then raise exception 'LOGIN_REQUIRED'; end if;
 if p_owner is null or p_series is null or p_token is null or p_copies is null or cardinality(p_copies) not between 1 and 50
 or array_position(p_copies,null) is not null or char_length(coalesce(p_message,''))>200
 or exists(select 1 from unnest(p_copies) c group by c having count(*)>1) then raise exception 'INVALID_REQUEST'; end if;
 if actor=p_owner then raise exception 'SELF_REQUEST'; end if;
 select array_agg(c order by c) into ordered from unnest(p_copies) c;
 perform pg_advisory_xact_lock(hashtextextended('loan-request:'||actor::text,0));
 select * into saved from public.loan_requests r where r.requester_id=actor and r.token=p_token;
 if found then
   if saved.owner_id<>p_owner or saved.series_id<>p_series or saved.message<>trim(coalesce(p_message,''))
   or ordered<>(select array_agg(i.copy_id order by i.copy_id) from public.loan_request_items i where i.request_id=saved.id)
   then raise exception 'TOKEN_CONFLICT'; end if;
   return saved.id;
 end if;
 perform 1 from public.friend_connections f where f.user_low=least(actor,p_owner) and f.user_high=greatest(actor,p_owner) and f.status='accepted' for share;
 if not found then raise exception 'FRIEND_NOT_FOUND'; end if;
 select s.title into title from public.comic_series s join public.bookshelves b on b.id=s.bookshelf_id
 where s.id=p_series and b.owner_id=p_owner and s.is_public for share of s,b;
 if not found then raise exception 'BOOK_UNAVAILABLE'; end if;
 perform 1 from public.comic_copies c where c.id=any(p_copies) and c.series_id=p_series for share;
 if (select count(*) from public.comic_copies c where c.id=any(p_copies) and c.series_id=p_series)<>cardinality(p_copies)
 then raise exception 'BOOK_UNAVAILABLE'; end if;
 if exists(select 1 from public.loan_request_items i join public.loan_requests r on r.id=i.request_id
 where r.requester_id=actor and r.status='pending' and i.copy_id=any(p_copies)) then raise exception 'ALREADY_REQUESTED'; end if;
 select coalesce(p.display_name,'友達') into owner_name from public.user_profiles p where p.id=p_owner;
 insert into public.loan_requests(requester_id,owner_id,series_id,series_title,owner_name,message,token)
 values(actor,p_owner,p_series,title,coalesce(owner_name,'友達'),trim(coalesce(p_message,'')),p_token) returning id into request_id;
 insert into public.loan_request_items(request_id,copy_id,volume_number,book_title,isbn)
 select request_id,c.id,c.volume_number,coalesce(c.book_title,title),c.isbn from public.comic_copies c where c.id=any(p_copies);
 return request_id;
end $$;
revoke all on function public.send_loan_request(uuid,uuid,uuid[],text,uuid) from public,anon;
grant execute on function public.send_loan_request(uuid,uuid,uuid[],text,uuid) to authenticated;
commit;
