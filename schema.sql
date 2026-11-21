-- WSERF: выполнить целиком в Supabase → SQL Editor → Run.
-- !!! Ниже в handle_new_user замените почту на СВОЮ: аккаунт с этой почтой автоматически станет админом.
create table profiles(id uuid primary key references auth.users on delete cascade, nick text not null check(char_length(nick) between 2 and 24), role text not null default 'user', banned boolean not null default false, created_at timestamptz default now());
create function is_admin() returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into profiles(id,nick,role) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'nick'),''),split_part(new.email,'@',1)),
 case when lower(new.email)=lower('ЗАМЕНИТЕ@НА-СВОЮ.ПОЧТУ') then 'admin' else 'user' end); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create table albums(id uuid primary key default gen_random_uuid(),title text not null,year int,description text,story text,cover text,published boolean default false,created_at timestamptz default now());
create table tracks(id uuid primary key default gen_random_uuid(),title text not null,album_id uuid references albums on delete set null,position int default 0,audio text,cover text,lyrics text,story text,published_at date default current_date,published boolean default false,created_at timestamptz default now());
create table posts(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('journal','story')),title text not null,category text,excerpt text,body text,cover text,published_at timestamptz default now(),published boolean default false,created_at timestamptz default now());
create table likes(track_id uuid references tracks on delete cascade,user_id uuid default auth.uid() references profiles on delete cascade,created_at timestamptz default now(),primary key(track_id,user_id));
create table comments(id uuid primary key default gen_random_uuid(),target_type text not null check(target_type in('track','post')),target_id uuid not null,user_id uuid not null default auth.uid() references profiles on delete cascade,parent_id uuid references comments on delete cascade,
 body text not null default '' check(char_length(body)<=1000 and body !~* '(https?://|www\.|t\.me/)'),
 gif_url text check(gif_url is null or gif_url ~ '^https://(media[0-9]*\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)/'),
 sticker text check(char_length(sticker)<=8),created_at timestamptz default now());
create table views(id bigserial primary key,target_type text not null,target_id uuid not null,created_at timestamptz default now());
create function comment_guard() returns trigger language plpgsql as $$ begin
 if (select count(*) from comments where user_id=new.user_id and created_at>now()-interval '1 minute')>=5 then raise exception 'Слишком часто. Подождите минуту.'; end if;
 if new.body='' and new.gif_url is null and new.sticker is null then raise exception 'Пустой комментарий'; end if; return new; end $$;
create trigger cguard before insert on comments for each row execute function comment_guard();
alter table profiles enable row level security;alter table albums enable row level security;alter table tracks enable row level security;alter table posts enable row level security;
alter table likes enable row level security;alter table comments enable row level security;alter table views enable row level security;
revoke update on profiles from anon,authenticated; grant update(nick) on profiles to authenticated;
create policy p_sel on profiles for select using(true);
create policy p_upd on profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy a_sel on albums for select using(published or is_admin());create policy a_all on albums for all using(is_admin()) with check(is_admin());
create policy t_sel on tracks for select using(published or is_admin());create policy t_all on tracks for all using(is_admin()) with check(is_admin());
create policy o_sel on posts for select using(published or is_admin());create policy o_all on posts for all using(is_admin()) with check(is_admin());
create policy l_sel on likes for select using(user_id=auth.uid() or is_admin());
create policy l_ins on likes for insert with check(user_id=auth.uid() and not exists(select 1 from profiles where id=auth.uid() and banned));
create policy l_del on likes for delete using(user_id=auth.uid());
create policy c_sel on comments for select using(true);
create policy c_ins on comments for insert with check(user_id=auth.uid() and not exists(select 1 from profiles where id=auth.uid() and banned));
create policy c_del on comments for delete using(user_id=auth.uid() or is_admin());
create policy v_ins on views for insert with check(true);create policy v_sel on views for select using(is_admin());
create function track_like_count(t uuid) returns int language sql security definer stable set search_path=public as $$ select count(*)::int from likes where track_id=t $$;
create function delete_me() returns void language sql security definer set search_path=public as $$ delete from auth.users where id=auth.uid() and not is_admin() $$;
create function admin_set_ban(uid uuid,b boolean) returns void language plpgsql security definer set search_path=public as $$ begin if not is_admin() then raise exception 'forbidden'; end if; update profiles set banned=b where id=uid and role<>'admin'; end $$;
create function admin_delete_user(uid uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not is_admin() then raise exception 'forbidden'; end if; delete from auth.users where id=uid and uid<>auth.uid(); end $$;
create function admin_stats() returns json language plpgsql security definer set search_path=public as $$ begin if not is_admin() then raise exception 'forbidden'; end if;
return json_build_object('users',(select count(*) from profiles),'comments',(select count(*) from comments),'likes',(select count(*) from likes),'views',(select count(*) from views),
'top_tracks',(select coalesce(json_agg(x),'[]') from (select t.title,(select count(*) from likes l where l.track_id=t.id) likes,(select count(*) from views v where v.target_id=t.id) views from tracks t order by 2 desc,3 desc limit 10) x),
'top_posts',(select coalesce(json_agg(x),'[]') from (select p.title,(select count(*) from views v where v.target_id=p.id) views,(select count(*) from comments c where c.target_id=p.id) comments from posts p order by 2 desc limit 10) x),
'by_day',(select coalesce(json_agg(x),'[]') from (select to_char(d,'DD.MM') day,(select count(*) from views v where v.created_at::date=d::date) n from generate_series(current_date-13,current_date,'1 day') d order by d) x)); end $$;
insert into storage.buckets(id,name,public) values('media','media',true) on conflict do nothing;
create policy m_sel on storage.objects for select using(bucket_id='media');
create policy m_ins on storage.objects for insert with check(bucket_id='media' and public.is_admin());
create policy m_upd on storage.objects for update using(bucket_id='media' and public.is_admin());
create policy m_del on storage.objects for delete using(bucket_id='media' and public.is_admin());
