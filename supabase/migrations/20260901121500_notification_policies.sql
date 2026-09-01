-- notifications had a SELECT and a user-owned UPDATE policy, but no INSERT
-- policy at all — meaning no session, including the golden-path planner
-- flow, could actually write one. Also broaden UPDATE (mark-as-read) to
-- cover role-targeted notifications (user_role set, user_id null), which the
-- existing "user_id = auth.uid()" policy silently could not touch.

create policy "notifications_insert" on notifications for insert
  with check (project_id is null or is_project_member(project_id));

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_visible" on notifications for update
  using (
    user_id = auth.uid()
    or (user_role = current_role_name() and (project_id is null or is_project_member(project_id)))
  );
