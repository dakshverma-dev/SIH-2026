create policy "events_insert" on field_events for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR'));

create policy "candidates_insert" on match_candidates for insert
  with check (exists (select 1 from field_events fe where fe.id = field_event_id
    and is_project_member(fe.project_id)
    and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR')));

create policy "matches_insert" on activity_matches for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR'));

create policy "conflicts_insert" on conflicts for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR'));

create policy "impacts_insert" on schedule_impacts for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER'));

create policy "recovery_insert" on recovery_scenarios for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER'));

create policy "audit_insert" on audit_events for insert
  with check (project_id is null or is_project_member(project_id));

create policy "memory_insert" on execution_memory for insert
  with check (is_project_member(project_id) and current_role_name() in ('ADMIN','PROJECT_MANAGER'));
