-- Move the three SECURITY DEFINER helpers out of the API-exposed public schema
-- into a private `app` schema, so signed-in users cannot call them directly
-- while RLS policies can still use them.

CREATE SCHEMA IF NOT EXISTS app;
REVOKE ALL ON SCHEMA app FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app TO service_role;

CREATE OR REPLACE FUNCTION app.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION app.current_role_name()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'ADMIN' THEN 1
    WHEN 'PROJECT_MANAGER' THEN 2
    WHEN 'PLANNER' THEN 3
    WHEN 'SUPERVISOR' THEN 4
    WHEN 'VIEWER' THEN 5
  END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app.can(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE app.current_role_name()
    WHEN 'ADMIN' THEN true
    WHEN 'PROJECT_MANAGER' THEN _permission IN (
      'view','review','matching','conflicts','conflicts:resolve','impact',
      'recovery','recovery:run','analytics','audit','documents:create',
      'field-updates:create','documents:upload'
    )
    WHEN 'PLANNER' THEN _permission IN (
      'view','review','matching','conflicts','conflicts:resolve','impact',
      'recovery','recovery:run','analytics','documents:create',
      'field-updates:create','documents:upload'
    )
    WHEN 'SUPERVISOR' THEN _permission IN (
      'view','field-updates:create','documents:create','documents:upload'
    )
    WHEN 'VIEWER' THEN _permission = 'view'
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION app.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app.current_role_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app.can(text) FROM PUBLIC, anon, authenticated;

-- Recreate every policy against the private helpers.
DROP POLICY IF EXISTS p_projects_read ON public.projects;
CREATE POLICY p_projects_read ON public.projects FOR SELECT TO authenticated USING (app.can('view'));

DROP POLICY IF EXISTS p_members_read ON public.project_members;
CREATE POLICY p_members_read ON public.project_members FOR SELECT TO authenticated USING (app.can('view'));

DROP POLICY IF EXISTS p_roles_read ON public.user_roles;
CREATE POLICY p_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR app.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS p_profiles_read ON public.profiles;
CREATE POLICY p_profiles_read ON public.profiles FOR SELECT TO authenticated USING (app.can('view'));

DROP POLICY IF EXISTS p_act_read ON public.schedule_activities;
CREATE POLICY p_act_read ON public.schedule_activities FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_act_upd ON public.schedule_activities;
CREATE POLICY p_act_upd ON public.schedule_activities FOR UPDATE TO authenticated
  USING (app.can('review')) WITH CHECK (app.can('review'));
DROP POLICY IF EXISTS p_act_ins ON public.schedule_activities;
CREATE POLICY p_act_ins ON public.schedule_activities FOR INSERT TO authenticated
  WITH CHECK (app.can('matching'));

DROP POLICY IF EXISTS p_reports_read ON public.field_reports;
CREATE POLICY p_reports_read ON public.field_reports FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_reports_ins ON public.field_reports;
CREATE POLICY p_reports_ins ON public.field_reports FOR INSERT TO authenticated
  WITH CHECK (app.can('field-updates:create'));
DROP POLICY IF EXISTS p_reports_upd ON public.field_reports;
CREATE POLICY p_reports_upd ON public.field_reports FOR UPDATE TO authenticated
  USING (app.can('field-updates:create')) WITH CHECK (app.can('field-updates:create'));

DROP POLICY IF EXISTS p_events_read ON public.field_events;
CREATE POLICY p_events_read ON public.field_events FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_events_ins ON public.field_events;
CREATE POLICY p_events_ins ON public.field_events FOR INSERT TO authenticated
  WITH CHECK (app.can('field-updates:create'));

DROP POLICY IF EXISTS p_cand_read ON public.match_candidates;
CREATE POLICY p_cand_read ON public.match_candidates FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_cand_ins ON public.match_candidates;
CREATE POLICY p_cand_ins ON public.match_candidates FOR INSERT TO authenticated
  WITH CHECK (app.can('field-updates:create'));

DROP POLICY IF EXISTS p_match_read ON public.activity_matches;
CREATE POLICY p_match_read ON public.activity_matches FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_match_ins ON public.activity_matches;
CREATE POLICY p_match_ins ON public.activity_matches FOR INSERT TO authenticated
  WITH CHECK (app.can('field-updates:create'));
DROP POLICY IF EXISTS p_match_upd ON public.activity_matches;
CREATE POLICY p_match_upd ON public.activity_matches FOR UPDATE TO authenticated
  USING (app.can('review')) WITH CHECK (app.can('review'));

DROP POLICY IF EXISTS p_conf_read ON public.conflicts;
CREATE POLICY p_conf_read ON public.conflicts FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_conf_ins ON public.conflicts;
CREATE POLICY p_conf_ins ON public.conflicts FOR INSERT TO authenticated
  WITH CHECK (app.can('field-updates:create'));
DROP POLICY IF EXISTS p_conf_upd ON public.conflicts;
CREATE POLICY p_conf_upd ON public.conflicts FOR UPDATE TO authenticated
  USING (app.can('conflicts:resolve')) WITH CHECK (app.can('conflicts:resolve'));

DROP POLICY IF EXISTS p_imp_read ON public.schedule_impacts;
CREATE POLICY p_imp_read ON public.schedule_impacts FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_imp_ins ON public.schedule_impacts;
CREATE POLICY p_imp_ins ON public.schedule_impacts FOR INSERT TO authenticated
  WITH CHECK (app.can('impact'));

DROP POLICY IF EXISTS p_rec_read ON public.recovery_scenarios;
CREATE POLICY p_rec_read ON public.recovery_scenarios FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_rec_ins ON public.recovery_scenarios;
CREATE POLICY p_rec_ins ON public.recovery_scenarios FOR INSERT TO authenticated
  WITH CHECK (app.can('recovery:run'));

DROP POLICY IF EXISTS p_audit_read ON public.audit_events;
CREATE POLICY p_audit_read ON public.audit_events FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_audit_ins ON public.audit_events;
CREATE POLICY p_audit_ins ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (app.can('view'));

DROP POLICY IF EXISTS p_notif_read ON public.notifications;
CREATE POLICY p_notif_read ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_role = app.current_role_name());
DROP POLICY IF EXISTS p_notif_ins ON public.notifications;
CREATE POLICY p_notif_ins ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (app.can('view'));

DROP POLICY IF EXISTS p_mem_read ON public.execution_memory;
CREATE POLICY p_mem_read ON public.execution_memory FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_mem_ins ON public.execution_memory;
CREATE POLICY p_mem_ins ON public.execution_memory FOR INSERT TO authenticated
  WITH CHECK (app.can('review'));

DROP POLICY IF EXISTS p_doc_read ON public.documents;
CREATE POLICY p_doc_read ON public.documents FOR SELECT TO authenticated USING (app.can('view'));
DROP POLICY IF EXISTS p_doc_ins ON public.documents;
CREATE POLICY p_doc_ins ON public.documents FOR INSERT TO authenticated
  WITH CHECK (app.can('documents:create'));

DROP POLICY IF EXISTS p_docs_storage_read ON storage.objects;
CREATE POLICY p_docs_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents' AND app.can('view'));
DROP POLICY IF EXISTS p_docs_storage_write ON storage.objects;
CREATE POLICY p_docs_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents' AND app.can('documents:create'));

-- Remove the publicly exposed copies.
DROP FUNCTION IF EXISTS public.can(text);
DROP FUNCTION IF EXISTS public.current_role_name();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);