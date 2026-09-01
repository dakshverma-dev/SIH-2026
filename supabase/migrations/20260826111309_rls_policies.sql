create or replace function public.current_role_name()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from project_members where project_id = pid and user_id = auth.uid()
  ) or exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  );
$$;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table schedule_activities enable row level security;
alter table field_reports enable row level security;
alter table field_events enable row level security;
alter table match_candidates enable row level security;
alter table activity_matches enable row level security;
alter table conflicts enable row level security;
alter table schedule_impacts enable row level security;
alter table recovery_scenarios enable row level security;
alter table execution_memory enable row level security;
alter table audit_events enable row level security;
alter table documents enable row level security;
alter table notifications enable row level security;

create policy "profiles_select_self_or_admin" on profiles for select
  using (id = auth.uid() or current_role_name() = 'ADMIN');
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid());
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());

create policy "projects_select_members" on projects for select
  using (is_project_member(id));
create policy "projects_insert_admin_pm" on projects for insert
  with check (current_role_name() in ('ADMIN','PROJECT_MANAGER'));
create policy "projects_update_admin_pm" on projects for update
  using (current_role_name() in ('ADMIN','PROJECT_MANAGER') and is_project_member(id));

create policy "members_select" on project_members for select
  using (is_project_member(project_id));
create policy "members_manage_admin" on project_members for insert
  with check (current_role_name() = 'ADMIN');
create policy "members_delete_admin" on project_members for delete
  using (current_role_name() = 'ADMIN');

create policy "activities_select" on schedule_activities for select
  using (is_project_member(project_id));
create policy "activities_write_planner_up" on schedule_activities for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER'));
create policy "activities_update_planner_up" on schedule_activities for update
  using (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER'));

create policy "reports_select" on field_reports for select
  using (is_project_member(project_id));
create policy "reports_insert_supervisor_up" on field_reports for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR'));

create policy "events_select" on field_events for select
  using (is_project_member(project_id));

create policy "candidates_select" on match_candidates for select
  using (exists (select 1 from field_events fe where fe.id = field_event_id and is_project_member(fe.project_id)));

create policy "matches_select" on activity_matches for select
  using (is_project_member(project_id));
create policy "matches_update_planner_up" on activity_matches for update
  using (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER'));

create policy "conflicts_select" on conflicts for select
  using (is_project_member(project_id));
create policy "conflicts_update_planner_up" on conflicts for update
  using (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER'));

create policy "impacts_select" on schedule_impacts for select
  using (is_project_member(project_id));
create policy "recovery_select" on recovery_scenarios for select
  using (is_project_member(project_id));
create policy "memory_select" on execution_memory for select
  using (is_project_member(project_id));

create policy "audit_select" on audit_events for select
  using (project_id is null or is_project_member(project_id));

create policy "documents_select" on documents for select
  using (is_project_member(project_id));
create policy "documents_insert" on documents for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR'));

create policy "notifications_select" on notifications for select
  using (
    user_id = auth.uid()
    or (user_role = current_role_name() and (project_id is null or is_project_member(project_id)))
  );
create policy "notifications_update_own" on notifications for update
  using (user_id = auth.uid());
