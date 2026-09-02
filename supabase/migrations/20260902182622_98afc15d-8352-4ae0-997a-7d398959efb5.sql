-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR','VIEWER');

-- ============ projects ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  data_status text NOT NULL DEFAULT 'SEEDED',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ============ security definer helpers ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'ADMIN' THEN 1 WHEN 'PROJECT_MANAGER' THEN 2 WHEN 'PLANNER' THEN 3
    WHEN 'SUPERVISOR' THEN 4 ELSE 5 END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can(_perm text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  r := public.current_role_name();
  IF r IS NULL THEN RETURN false; END IF;
  IF r = 'ADMIN' THEN RETURN true; END IF;
  IF r = 'PROJECT_MANAGER' THEN
    RETURN _perm = ANY (ARRAY['view','impact','recovery','recovery:run','analytics','review','conflicts','conflicts:resolve','audit','field-updates:create','documents:create']);
  END IF;
  IF r = 'PLANNER' THEN
    RETURN _perm = ANY (ARRAY['view','review','matching','conflicts','conflicts:resolve','field-updates','field-updates:create','audit','impact','recovery','recovery:run','documents:create','analytics']);
  END IF;
  IF r = 'SUPERVISOR' THEN
    RETURN _perm = ANY (ARRAY['view','field-updates:create','documents:create']);
  END IF;
  RETURN _perm = 'view';
END;
$$;

-- ============ schedule ============
CREATE TABLE public.schedule_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id text NOT NULL,
  wbs text NOT NULL,
  discipline text NOT NULL,
  description text NOT NULL,
  location text,
  engineering_tag text,
  line_number text,
  contractor text,
  planned_start date NOT NULL,
  planned_finish date NOT NULL,
  actual_start date,
  actual_finish date,
  progress integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 1,
  predecessor_id uuid REFERENCES public.schedule_activities(id) ON DELETE SET NULL,
  is_critical boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'NOT_STARTED',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.schedule_activities TO authenticated;
GRANT ALL ON public.schedule_activities TO service_role;
ALTER TABLE public.schedule_activities ENABLE ROW LEVEL SECURITY;

-- ============ field capture ============
CREATE TABLE public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT current_date,
  contractor text,
  location text,
  shift text,
  discipline text,
  author text,
  raw_text text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.field_reports TO authenticated;
GRANT ALL ON public.field_reports TO service_role;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.field_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text,
  activity_description text,
  engineering_tag text,
  line_number text,
  location text,
  discipline text,
  progress integer,
  actual_start date,
  actual_finish date,
  quantity numeric,
  unit text,
  delay_reason text,
  evidence_span text,
  extraction_mode text NOT NULL DEFAULT 'DEMO_FALLBACK',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.field_events TO authenticated;
GRANT ALL ON public.field_events TO service_role;
ALTER TABLE public.field_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_event_id uuid NOT NULL REFERENCES public.field_events(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  rank integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT ON public.match_candidates TO authenticated;
GRANT ALL ON public.match_candidates TO service_role;
ALTER TABLE public.match_candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_event_id uuid NOT NULL REFERENCES public.field_events(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  best_activity_id uuid REFERENCES public.schedule_activities(id) ON DELETE SET NULL,
  confidence numeric NOT NULL DEFAULT 0,
  trust_level text NOT NULL DEFAULT 'UNMATCHED',
  status text NOT NULL DEFAULT 'PENDING',
  reviewed_by uuid,
  reviewed_at timestamptz,
  score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.activity_matches TO authenticated;
GRANT ALL ON public.activity_matches TO service_role;
ALTER TABLE public.activity_matches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  field_event_id uuid REFERENCES public.field_events(id) ON DELETE CASCADE,
  conflict_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  resolution_reason text,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conflicts TO authenticated;
GRANT ALL ON public.conflicts TO service_role;
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.schedule_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  baseline_finish date,
  forecast_finish date,
  variance_days integer NOT NULL DEFAULT 0,
  affected_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  critical_path_changed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.schedule_impacts TO authenticated;
GRANT ALL ON public.schedule_impacts TO service_role;
ALTER TABLE public.schedule_impacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recovery_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  label text NOT NULL,
  recovery_days integer NOT NULL,
  effort text,
  risk_level text,
  projected_finish date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.recovery_scenarios TO authenticated;
GRANT ALL ON public.recovery_scenarios TO service_role;
ALTER TABLE public.recovery_scenarios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  actor text,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  source text,
  model text,
  confidence numeric,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT SELECT, INSERT ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_role public.app_role,
  user_id uuid,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.execution_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  planned_duration integer,
  actual_duration integer,
  delay_cause text,
  contractor text,
  recovery_action text,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.execution_memory TO authenticated;
GRANT ALL ON public.execution_memory TO service_role;
ALTER TABLE public.execution_memory ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  filename text NOT NULL,
  category text,
  storage_path text NOT NULL,
  size_bytes bigint,
  content_text text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============ policies ============
CREATE POLICY p_projects_read ON public.projects FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_members_read ON public.project_members FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_roles_read ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'ADMIN'));

CREATE POLICY p_profiles_read ON public.profiles FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_profiles_self_ins ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY p_profiles_self_upd ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY p_act_read ON public.schedule_activities FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_act_upd ON public.schedule_activities FOR UPDATE TO authenticated USING (public.can('review')) WITH CHECK (public.can('review'));
CREATE POLICY p_act_ins ON public.schedule_activities FOR INSERT TO authenticated WITH CHECK (public.can('matching'));

CREATE POLICY p_reports_read ON public.field_reports FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_reports_ins ON public.field_reports FOR INSERT TO authenticated WITH CHECK (public.can('field-updates:create'));
CREATE POLICY p_reports_upd ON public.field_reports FOR UPDATE TO authenticated USING (public.can('field-updates:create')) WITH CHECK (public.can('field-updates:create'));

CREATE POLICY p_events_read ON public.field_events FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_events_ins ON public.field_events FOR INSERT TO authenticated WITH CHECK (public.can('field-updates:create'));

CREATE POLICY p_cand_read ON public.match_candidates FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_cand_ins ON public.match_candidates FOR INSERT TO authenticated WITH CHECK (public.can('field-updates:create'));

CREATE POLICY p_match_read ON public.activity_matches FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_match_ins ON public.activity_matches FOR INSERT TO authenticated WITH CHECK (public.can('field-updates:create'));
CREATE POLICY p_match_upd ON public.activity_matches FOR UPDATE TO authenticated USING (public.can('review')) WITH CHECK (public.can('review'));

CREATE POLICY p_conf_read ON public.conflicts FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_conf_ins ON public.conflicts FOR INSERT TO authenticated WITH CHECK (public.can('field-updates:create'));
CREATE POLICY p_conf_upd ON public.conflicts FOR UPDATE TO authenticated USING (public.can('conflicts:resolve')) WITH CHECK (public.can('conflicts:resolve'));

CREATE POLICY p_imp_read ON public.schedule_impacts FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_imp_ins ON public.schedule_impacts FOR INSERT TO authenticated WITH CHECK (public.can('impact'));

CREATE POLICY p_rec_read ON public.recovery_scenarios FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_rec_ins ON public.recovery_scenarios FOR INSERT TO authenticated WITH CHECK (public.can('recovery:run'));

-- Append only. No UPDATE or DELETE policy exists for audit_events by design.
CREATE POLICY p_audit_read ON public.audit_events FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_audit_ins ON public.audit_events FOR INSERT TO authenticated WITH CHECK (public.can('view'));

CREATE POLICY p_notif_read ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_role = public.current_role_name());
CREATE POLICY p_notif_ins ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.can('view'));
CREATE POLICY p_notif_upd ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY p_mem_read ON public.execution_memory FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_mem_ins ON public.execution_memory FOR INSERT TO authenticated WITH CHECK (public.can('review'));

CREATE POLICY p_doc_read ON public.documents FOR SELECT TO authenticated USING (public.can('view'));
CREATE POLICY p_doc_ins ON public.documents FOR INSERT TO authenticated WITH CHECK (public.can('documents:create'));

-- ============ seed ============
INSERT INTO public.projects (id, name, code, description, data_status) VALUES
('11111111-1111-1111-1111-111111111111','Kalinga Refinery Expansion - Phase 2','KRE-P2',
 'Brownfield refinery expansion. Piping, mechanical, electrical, instrumentation, civil and structural scope across four units.','SEEDED');

INSERT INTO public.schedule_activities
(id, project_id, activity_id, wbs, discipline, description, location, engineering_tag, line_number, contractor, planned_start, planned_finish, actual_start, actual_finish, progress, duration_days, predecessor_id, is_critical, status) VALUES
('aaaa0000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','A-1010','1.1 Civil','CIVIL','Excavation and foundation for compressor plinth','Unit 100','FND-1010',NULL,'Meghna Civil Works','2026-01-05','2026-01-19','2026-01-05','2026-01-21',100,14,NULL,true,'COMPLETE'),
('aaaa0000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','A-1020','1.1 Civil','CIVIL','Concrete pour and grouting for pump foundations','Unit 100','FND-1020',NULL,'Meghna Civil Works','2026-01-20','2026-01-30','2026-01-22',NULL,70,10,'aaaa0000-0000-0000-0000-000000000001',true,'IN_PROGRESS'),
('aaaa0000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','A-1030','1.2 Structural','STRUCTURAL','Structural steel erection for pipe rack','Pipe Rack A','STR-2010',NULL,'Orion Steel','2026-01-31','2026-02-19',NULL,NULL,0,19,'aaaa0000-0000-0000-0000-000000000002',true,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','A-2010','2.1 Piping','PIPING','Spool fabrication for 12 inch process header','Unit 100','PL-2101','12-PL-2101','Vantage Piping','2026-01-12','2026-02-02','2026-01-14',NULL,55,21,'aaaa0000-0000-0000-0000-000000000001',false,'IN_PROGRESS'),
('aaaa0000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','A-2020','2.1 Piping','PIPING','Pipe erection and welding of process header','Pipe Rack A','PL-2101','12-PL-2101','Vantage Piping','2026-02-03','2026-02-24',NULL,NULL,0,21,'aaaa0000-0000-0000-0000-000000000004',true,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','A-2030','2.2 Piping','PIPING','Hydrotest of process header loop','Pipe Rack A','PL-2101','12-PL-2101','Vantage Piping','2026-02-25','2026-03-04',NULL,NULL,0,7,'aaaa0000-0000-0000-0000-000000000005',true,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','A-2040','2.2 Piping','PIPING','Utility piping tie-in at tank farm','Tank Farm','PL-2205','6-PL-2205','Vantage Piping','2026-02-05','2026-02-18',NULL,NULL,0,13,'aaaa0000-0000-0000-0000-000000000004',false,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','A-3010','3.1 Mechanical','MECHANICAL','Setting and alignment of centrifugal pump P-101A','Unit 100','P-101A',NULL,'Arclight Mechanical','2026-02-01','2026-02-12',NULL,NULL,0,11,'aaaa0000-0000-0000-0000-000000000002',false,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','A-3020','3.1 Mechanical','MECHANICAL','Compressor K-201 installation and grouting','Unit 200','K-201',NULL,'Arclight Mechanical','2026-02-13','2026-03-06',NULL,NULL,0,21,'aaaa0000-0000-0000-0000-000000000008',false,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','A-4010','4.1 Electrical','ELECTRICAL','Cable tray installation and cable pulling to substation','Substation','EL-4010',NULL,'Nordvolt Electrical','2026-02-10','2026-02-27',NULL,NULL,0,17,'aaaa0000-0000-0000-0000-000000000003',false,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','A-4020','4.1 Electrical','ELECTRICAL','Switchgear termination and glanding','Substation','EL-4020',NULL,'Nordvolt Electrical','2026-02-28','2026-03-12',NULL,NULL,0,12,'aaaa0000-0000-0000-0000-000000000010',false,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','A-5010','5.1 Instrumentation','INSTRUMENTATION','Instrument junction box installation','Unit 200','IN-5010',NULL,'Delta Instruments','2026-03-01','2026-03-11',NULL,NULL,0,10,'aaaa0000-0000-0000-0000-000000000009',false,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','A-5020','5.1 Instrumentation','INSTRUMENTATION','Loop checking and transmitter calibration','Unit 200','IN-5020',NULL,'Delta Instruments','2026-03-12','2026-03-26',NULL,NULL,0,14,'aaaa0000-0000-0000-0000-000000000012',true,'NOT_STARTED'),
('aaaa0000-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','A-6010','6.1 Commissioning','MECHANICAL','Pre-commissioning walkdown and punch list closure','Unit 100','CM-6010',NULL,'Arclight Mechanical','2026-03-27','2026-04-10',NULL,NULL,0,14,'aaaa0000-0000-0000-0000-000000000013',true,'NOT_STARTED');

INSERT INTO public.field_reports (project_id, report_date, contractor, location, shift, discipline, author, raw_text, status) VALUES
('11111111-1111-1111-1111-111111111111','2026-02-02','Vantage Piping','Unit 100','DAY','PIPING','Site Supervisor',
 'Spool fabrication for line 12-PL-2101 at Unit 100 is now about 55% done. Welding crew working two fronts. Tag PL-2101 shop welds cleared NDT except two joints. No hold today.','PENDING'),
('11111111-1111-1111-1111-111111111111','2026-02-02','Meghna Civil Works','Unit 100','DAY','CIVIL','Site Supervisor',
 'Concrete pour for pump foundations FND-1020 at Unit 100 reached 70 percent. Grouting pending. Rain in the afternoon stopped work for three hours, material for the last pour is not yet delivered.','PENDING'),
('11111111-1111-1111-1111-111111111111','2026-02-03','Nordvolt Electrical','Substation','NIGHT','ELECTRICAL','Night Supervisor',
 'Cable tray run EL-4010 at Substation started tonight. Around 15% complete. Waiting on permit for the hot work section near the transformer bay.','PENDING'),
('11111111-1111-1111-1111-111111111111','2026-02-03','Vantage Piping','Tank Farm','DAY','PIPING','Site Supervisor',
 'Utility tie-in 6-PL-2205 at Tank Farm completed today. Line flushed and handed over.','PENDING'),
('11111111-1111-1111-1111-111111111111','2026-02-04',NULL,NULL,'DAY',NULL,'Site Supervisor',
 'Crew moved the bundles near gate 3 in the afternoon. Nothing else to report.','PENDING');

INSERT INTO public.execution_memory (project_id, activity_type, planned_duration, actual_duration, delay_cause, contractor, recovery_action, outcome) VALUES
('11111111-1111-1111-1111-111111111111','Pipe erection and welding',21,29,'MATERIAL_SHORTAGE','Vantage Piping','Added second welding crew','Recovered 5 of 8 days'),
('11111111-1111-1111-1111-111111111111','Concrete pour and grouting',10,16,'WEATHER','Meghna Civil Works','Night shift after monsoon window','Recovered 4 of 6 days'),
('11111111-1111-1111-1111-111111111111','Cable pulling',17,17,NULL,'Nordvolt Electrical','None required','On plan'),
('11111111-1111-1111-1111-111111111111','Loop checking and calibration',14,22,'REWORK','Delta Instruments','Resequenced with vendor support','Recovered 3 of 8 days'),
('11111111-1111-1111-1111-111111111111','Structural steel erection',19,24,'ACCESS','Orion Steel','Scaffold cleared, crane reallocated','Recovered 2 of 5 days');