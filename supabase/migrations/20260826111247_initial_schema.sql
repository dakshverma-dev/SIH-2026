-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type user_role as enum ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR','VIEWER');
create type activity_status as enum ('NOT_STARTED','IN_PROGRESS','COMPLETE','DELAYED');
create type report_status as enum ('SUBMITTED','PROCESSING','PROCESSED','ERROR');
create type extraction_mode as enum ('DEMO_FALLBACK','LLM');
create type trust_level as enum ('HIGH','MEDIUM','LOW','UNMATCHED');
create type match_status as enum ('PENDING','APPROVED','REJECTED');
create type conflict_status as enum ('OPEN','RESOLVED','IGNORED');
create type data_status as enum ('DEMO','LIVE');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role user_role not null default 'VIEWER',
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  description text,
  data_status data_status not null default 'DEMO',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role user_role not null,
  primary key (project_id, user_id)
);

create table schedule_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  activity_id text not null,
  wbs text not null,
  discipline text not null,
  description text not null,
  location text,
  engineering_tag text,
  line_number text,
  contractor text,
  planned_start date,
  planned_finish date,
  actual_start date,
  actual_finish date,
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  duration_days int not null default 1,
  predecessor_id uuid references schedule_activities(id),
  is_critical boolean not null default false,
  status activity_status not null default 'NOT_STARTED',
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_activities_project on schedule_activities(project_id);

create table field_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  report_date date not null,
  contractor text,
  location text,
  shift text,
  discipline text,
  author text,
  raw_text text not null,
  status report_status not null default 'SUBMITTED',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_reports_project on field_reports(project_id);

create table field_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references field_reports(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  event_type text,
  activity_description text,
  engineering_tag text,
  line_number text,
  location text,
  discipline text,
  progress numeric,
  actual_start date,
  actual_finish date,
  quantity text,
  unit text,
  delay_reason text,
  evidence_span text not null,
  extraction_mode extraction_mode not null default 'DEMO_FALLBACK',
  created_at timestamptz default now()
);
create index idx_events_report on field_events(report_id);

create table match_candidates (
  id uuid primary key default gen_random_uuid(),
  field_event_id uuid not null references field_events(id) on delete cascade,
  activity_id uuid not null references schedule_activities(id) on delete cascade,
  score numeric not null,
  reasons jsonb not null default '[]',
  rank int not null
);
create index idx_candidates_event on match_candidates(field_event_id);

create table activity_matches (
  id uuid primary key default gen_random_uuid(),
  field_event_id uuid not null references field_events(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  best_activity_id uuid references schedule_activities(id),
  confidence numeric not null,
  trust_level trust_level not null,
  status match_status not null default 'PENDING',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
create index idx_matches_event on activity_matches(field_event_id);
create index idx_matches_project on activity_matches(project_id);

create table conflicts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  activity_id uuid references schedule_activities(id),
  field_event_id uuid references field_events(id),
  conflict_type text not null,
  description text not null,
  status conflict_status not null default 'OPEN',
  resolution_reason text,
  resolved_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_conflicts_project on conflicts(project_id);

create table schedule_impacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  activity_id uuid not null references schedule_activities(id) on delete cascade,
  baseline_finish date,
  forecast_finish date,
  variance_days int,
  affected_activities jsonb default '[]',
  critical_path_changed boolean default false,
  created_at timestamptz default now()
);
create index idx_impacts_project on schedule_impacts(project_id);

create table recovery_scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  activity_id uuid not null references schedule_activities(id) on delete cascade,
  option_key text not null,
  label text not null,
  recovery_days int not null,
  effort text not null,
  risk_level text not null,
  projected_finish date not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_recovery_project on recovery_scenarios(project_id);

create table execution_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  activity_type text not null,
  planned_duration int,
  actual_duration int,
  delay_cause text,
  contractor text,
  productivity_note text,
  recovery_action text,
  outcome text,
  created_at timestamptz default now()
);
create index idx_memory_project on execution_memory(project_id);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  actor text not null,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  source text,
  model text,
  confidence numeric,
  reason text,
  ip_address text,
  created_at timestamptz default now()
);
create index idx_audit_project on audit_events(project_id);
create index idx_audit_created on audit_events(created_at desc);

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  field_report_id uuid references field_reports(id),
  filename text not null,
  category text,
  storage_path text,
  size_bytes bigint,
  content_text text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_documents_project on documents(project_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_role user_role,
  user_id uuid references profiles(id),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz default now()
);
create index idx_notifications_project on notifications(project_id);
