-- Wserf: security and performance hardening (2026-11-24)

create index if not exists admin_audit_log_actor_id_idx on public.admin_audit_log(actor_id);
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comments_user_id_idx on public.comments(user_id);
create index if not exists comments_target_created_idx on public.comments(target_type, target_id, created_at);
create index if not exists likes_user_id_idx on public.likes(user_id);
create index if not exists reactions_user_id_idx on public.reactions(user_id);
create index if not exists reports_user_id_idx on public.reports(user_id);
create index if not exists topics_category_id_idx on public.topics(category_id);
create index if not exists topics_user_id_idx on public.topics(user_id);
create index if not exists tracks_album_id_idx on public.tracks(album_id);

update storage.buckets
set file_size_limit = 52428800
where id = 'media' and (file_size_limit is null or file_size_limit > 52428800);

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path to ''
as $function$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$function$;

create or replace function public.feature_on(f text)
returns boolean language sql stable security invoker set search_path to ''
as $function$
  select coalesce(
    (select (value->'features'->>f)::boolean from public.settings where key = 'site'),
    true
  )
$function$;

create or replace function public.forum_list(
  cat uuid default null, q text default null, lim integer default 60
)
returns table(
  id uuid, category_id uuid, title text, pinned boolean, locked boolean,
  created_at timestamptz, last_activity timestamptz, user_id uuid,
  nick text, avatar text, role text, replies bigint
)
language sql stable security invoker
set search_path to ''
set statement_timeout to '3s'
as $function$
  select
    t.id, t.category_id, t.title, t.pinned, t.locked,
    t.created_at, t.last_activity, t.user_id,
    p.nick, p.avatar, p.role,
    (select count(*) from public.comments c
     where c.target_type = 'topic' and c.target_id = t.id)
  from public.topics t
  join public.profiles p on p.id = t.user_id
  where (cat is null or t.category_id = cat)
    and (
      nullif(left(trim(coalesce(q, '')), 100), '') is null
      or t.title ilike '%' || left(trim(q), 100) || '%'
      or t.body ilike '%' || left(trim(q), 100) || '%'
    )
  order by t.pinned desc, t.last_activity desc
  limit least(greatest(coalesce(lim, 60), 1), 60)
$function$;

create or replace function public.comment_guard()
returns trigger language plpgsql security invoker set search_path to ''
as $function$
declare bw text; w text; t text;
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments parent
    where parent.id = new.parent_id
      and parent.target_type = new.target_type
      and parent.target_id = new.target_id
      and parent.parent_id is null
  ) then
    raise exception 'Ответ должен относиться к комментарию этого материала.';
  end if;

  if (select count(*) from public.comments
      where user_id = new.user_id
        and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Слишком часто. Подождите минуту.';
  end if;

  if new.body = '' and new.gif_url is null and new.sticker is null then
    raise exception 'Пустой комментарий';
  end if;

  select lower(coalesce(value->'moderation'->>'badwords', ''))
    into bw from public.settings where key = 'site';

  if bw is not null and bw <> '' then
    foreach w in array string_to_array(bw, ',') loop
      t := trim(w);
      if t <> '' and position(t in lower(new.body)) > 0 then
        raise exception 'Комментарий содержит запрещённые слова.';
      end if;
    end loop;
  end if;
  return new;
end
$function$;

drop policy if exists l_sel on public.likes;
create policy l_sel on public.likes for select
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists l_del on public.likes;
create policy l_del on public.likes for delete
using (user_id = (select auth.uid()));

drop policy if exists c_del on public.comments;
create policy c_del on public.comments for delete
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists r_ins on public.reports;
create policy r_ins on public.reports for insert
with check (
  user_id = (select auth.uid())
  and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.banned
  )
);

drop policy if exists x_del on public.reactions;
create policy x_del on public.reactions for delete
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists tp_upd on public.topics;
create policy tp_upd on public.topics for update
using (
  (user_id = (select auth.uid()) and not locked and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.banned
  ))
  or (select public.is_admin())
)
with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists tp_del on public.topics;
create policy tp_del on public.topics for delete
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists bans_sel on public.bans;
create policy bans_sel on public.bans for select
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists c_ins on public.comments;
create policy c_ins on public.comments for insert
with check (
  user_id = (select auth.uid())
  and ((select public.feature_on('comments')) or (select public.is_admin()))
  and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (p.banned or p.restrict_comments)
  )
);

drop policy if exists l_ins on public.likes;
create policy l_ins on public.likes for insert
with check (
  user_id = (select auth.uid())
  and ((select public.feature_on('likes')) or (select public.is_admin()))
  and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (p.banned or p.restrict_likes)
  )
);

drop policy if exists x_ins on public.reactions;
create policy x_ins on public.reactions for insert
with check (
  user_id = (select auth.uid())
  and ((select public.feature_on('likes')) or (select public.is_admin()))
  and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (p.banned or p.restrict_likes)
  )
);

drop policy if exists tp_ins on public.topics;
create policy tp_ins on public.topics for insert
with check (
  user_id = (select auth.uid())
  and not pinned and not locked
  and ((select public.feature_on('forum')) or (select public.is_admin()))
  and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (p.banned or p.restrict_forum)
  )
);

drop policy if exists p_upd on public.profiles;
create policy p_upd on public.profiles for update
using (id = (select auth.uid()) and not banned and not restrict_profile)
with check (id = (select auth.uid()));
