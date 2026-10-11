begin;
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30 and display_name !~ '[[:cntrl:]]'),
  avatar_kind text not null default 'preset' check (avatar_kind in ('preset','photo')),
  avatar_preset text not null default 'cat' check (avatar_preset in ('cat','dog','rabbit','bear','penguin','fox','book','coffee')),
  avatar_path text,
  created_at timestamptz not null default now(),
  constraint profile_avatar_path check (
    (avatar_kind = 'preset' and avatar_path is null) or
    (avatar_kind = 'photo' and avatar_path is not null and avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'))
  )
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon;
grant select, insert, update on public.user_profiles to authenticated;
create policy profile_select_own on public.user_profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_insert_own on public.user_profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update_own on public.user_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 524288, array['image/jpeg','image/png','image/webp']);
create policy profile_photo_select_own on storage.objects for select to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_photo_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_photo_delete_own on storage.objects for delete to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
