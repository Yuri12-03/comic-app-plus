begin;
create table public.friend_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)) check(friend_code ~ '^[A-F0-9]{16}$')
);
alter table public.friend_codes enable row level security;
revoke all on public.friend_codes from anon, authenticated;
grant select on public.friend_codes to authenticated;
create policy own_friend_code on public.friend_codes for select to authenticated using(user_id=(select auth.uid()));
insert into public.friend_codes(user_id) select id from auth.users;
create function public.issue_friend_code() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.friend_codes(user_id) values(new.id); return new; end $$;
revoke all on function public.issue_friend_code() from public,anon,authenticated;
create trigger issue_friend_code after insert on auth.users for each row execute function public.issue_friend_code();
create table public.friend_connections (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(user_low,user_high), check(user_low<user_high), check(requested_by in (user_low,user_high))
);
alter table public.friend_connections enable row level security;
revoke all on public.friend_connections from anon,authenticated;
grant select on public.friend_connections to authenticated;
create policy own_friend_connections on public.friend_connections for select to authenticated using((select auth.uid()) in(user_low,user_high));
create function public.find_friend(p_code text) returns table(user_id uuid,display_name text,avatar_preset text)
language sql stable security definer set search_path='' as $$
  select c.user_id,coalesce(p.display_name,'名前未設定'),coalesce(p.avatar_preset,'cat')
  from public.friend_codes c left join public.user_profiles p on p.id=c.user_id
  where auth.uid() is not null and c.friend_code=p_code;
$$;
create function public.request_friend(p_code text) returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; row_data public.friend_connections;
begin
  if actor is null then raise exception 'UNAUTHENTICATED'; end if;
  select user_id into target from public.friend_codes where friend_code=p_code;
  if target is null then raise exception 'FRIEND_NOT_FOUND'; end if;
  if actor=target then raise exception 'SELF_REQUEST'; end if;
  insert into public.friend_connections(user_low,user_high,requested_by) values(least(actor,target),greatest(actor,target),actor) on conflict(user_low,user_high) do nothing;
  select * into row_data from public.friend_connections where user_low=least(actor,target) and user_high=greatest(actor,target) for update;
  if row_data.status='accepted' then return 'already_friends'; end if;
  if row_data.status='declined' then
    update public.friend_connections set status='pending',requested_by=actor,created_at=now() where id=row_data.id;
    return 'pending';
  end if;
  if row_data.requested_by<>actor then return 'incoming'; end if;
  return 'pending';
end $$;
create function public.respond_friend(p_id uuid,p_accept boolean) returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); row_data public.friend_connections;
begin
  if actor is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into row_data from public.friend_connections where id=p_id for update;
  if row_data.id is null or actor not in(row_data.user_low,row_data.user_high) or actor=row_data.requested_by then raise exception 'REQUEST_NOT_FOUND'; end if;
  if row_data.status<>'pending' then return row_data.status; end if;
  update public.friend_connections set status=case when p_accept then 'accepted' else 'declined' end where id=p_id;
  return case when p_accept then 'accepted' else 'declined' end;
end $$;
create function public.list_friend_connections() returns table(connection_id uuid,friend_id uuid,friend_code text,display_name text,avatar_preset text,avatar_path text,status text,incoming boolean)
language sql stable security definer set search_path='' as $$
  select f.id,c.user_id,c.friend_code,coalesce(p.display_name,'名前未設定'),coalesce(p.avatar_preset,'cat'),
    case when f.status='accepted' and p.avatar_kind='photo' then p.avatar_path else null end,f.status,f.requested_by<>auth.uid()
  from public.friend_connections f
  join public.friend_codes c on c.user_id=case when f.user_low=auth.uid() then f.user_high else f.user_low end
  left join public.user_profiles p on p.id=c.user_id
  where auth.uid() in(f.user_low,f.user_high) and f.status in('pending','accepted') order by f.created_at desc;
$$;
revoke all on function public.find_friend(text),public.request_friend(text),public.respond_friend(uuid,boolean),public.list_friend_connections() from public,anon;
grant execute on function public.find_friend(text),public.request_friend(text),public.respond_friend(uuid,boolean),public.list_friend_connections() to authenticated;
create policy profile_photo_select_friends on storage.objects for select to authenticated using (
  bucket_id='profile-photos' and exists(select 1 from public.friend_connections f where f.status='accepted' and
    ((f.user_low=(select auth.uid()) and f.user_high::text=(storage.foldername(name))[1]) or (f.user_high=(select auth.uid()) and f.user_low::text=(storage.foldername(name))[1])))
);
commit;
