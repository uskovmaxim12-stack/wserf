-- Remove overlapping ALL policies while preserving admin-only writes and public reads.
drop policy if exists a_all on public.albums;
create policy a_ins on public.albums for insert
with check ((select public.is_admin()));
create policy a_upd on public.albums for update
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy a_del on public.albums for delete
using ((select public.is_admin()));

drop policy if exists fc_all on public.forum_categories;
create policy fc_ins on public.forum_categories for insert
with check ((select public.is_admin()));
create policy fc_upd on public.forum_categories for update
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy fc_del on public.forum_categories for delete
using ((select public.is_admin()));

drop policy if exists o_all on public.posts;
create policy o_ins on public.posts for insert
with check ((select public.is_admin()));
create policy o_upd on public.posts for update
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy o_del on public.posts for delete
using ((select public.is_admin()));

drop policy if exists t_all on public.tracks;
create policy t_ins on public.tracks for insert
with check ((select public.is_admin()));
create policy t_upd on public.tracks for update
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy t_del on public.tracks for delete
using ((select public.is_admin()));

-- s_sel already provides public reads; settings_admin_* provide admin writes.
drop policy if exists s_all on public.settings;
drop policy if exists settings_public_read on public.settings;
