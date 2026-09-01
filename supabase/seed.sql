-- Plan2Reality demo seed
-- Run this in the Supabase SQL editor (or `supabase db execute`) AFTER applying
-- all files in supabase/migrations/. Requires pgcrypto (already enabled by migration 1).

do $$
declare
  uid_admin uuid := gen_random_uuid();
  uid_pm uuid := gen_random_uuid();
  uid_planner uuid := gen_random_uuid();
  uid_supervisor uuid := gen_random_uuid();
  uid_viewer uuid := gen_random_uuid();
  proj_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (uid_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@plan2reality.io', crypt('admin123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
    (uid_pm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pm@plan2reality.io', crypt('pm12345', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
    (uid_planner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'planner@plan2reality.io', crypt('plan123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
    (uid_supervisor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'supervisor@plan2reality.io', crypt('sup1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
    (uid_viewer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@plan2reality.io', crypt('view123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

  insert into public.profiles (id, name, email, role) values
    (uid_admin, 'Amit Rao', 'admin@plan2reality.io', 'ADMIN'),
    (uid_pm, 'Neha Kulkarni', 'pm@plan2reality.io', 'PROJECT_MANAGER'),
    (uid_planner, 'Suresh Iyer', 'planner@plan2reality.io', 'PLANNER'),
    (uid_supervisor, 'Ramesh Yadav', 'supervisor@plan2reality.io', 'SUPERVISOR'),
    (uid_viewer, 'Divya Menon', 'viewer@plan2reality.io', 'VIEWER');

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), uid_admin::text, uid_admin, jsonb_build_object('sub', uid_admin::text, 'email', 'admin@plan2reality.io'), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_pm::text, uid_pm, jsonb_build_object('sub', uid_pm::text, 'email', 'pm@plan2reality.io'), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_planner::text, uid_planner, jsonb_build_object('sub', uid_planner::text, 'email', 'planner@plan2reality.io'), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_supervisor::text, uid_supervisor, jsonb_build_object('sub', uid_supervisor::text, 'email', 'supervisor@plan2reality.io'), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_viewer::text, uid_viewer, jsonb_build_object('sub', uid_viewer::text, 'email', 'viewer@plan2reality.io'), 'email', now(), now(), now());

  insert into public.projects (id, name, code, description, data_status, created_by)
  values (proj_id, 'North Basin Process Expansion — EPC Package', 'NBPE-2026',
    'Greenfield process unit expansion. EPC scope covering piping, mechanical, electrical, instrumentation, civil and structural disciplines.',
    'DEMO', uid_admin);

  insert into public.project_members (project_id, user_id, role) values
    (proj_id, uid_admin, 'ADMIN'),
    (proj_id, uid_pm, 'PROJECT_MANAGER'),
    (proj_id, uid_planner, 'PLANNER'),
    (proj_id, uid_supervisor, 'SUPERVISOR'),
    (proj_id, uid_viewer, 'VIEWER');

  with ins as (
    insert into schedule_activities (project_id, activity_id, wbs, discipline, description, location, engineering_tag, line_number, contractor, planned_start, planned_finish, actual_start, actual_finish, progress, duration_days, is_critical, status)
    select proj_id, v.activity_id, v.wbs, v.discipline, v.description, v.location, v.engineering_tag, v.line_number, v.contractor, v.planned_start::date, v.planned_finish::date, v.actual_start::date, v.actual_finish::date, v.progress, v.duration_days, v.is_critical, v.status::activity_status
    from (values
      ('PIP-R3-2301','1.2.3.1','Piping','24-inch Header Spool Fabrication — Rack 3','Rack 3','PIP-R3-2301','24-inch header','Larsen Mech Co.','2026-07-01','2026-07-10','2026-07-01','2026-07-10',100,9,true,'COMPLETE'),
      ('PIP-R3-2401','1.2.3.2','Piping','24-inch Header Spool Erection — Rack 3','Rack 3','PIP-R3-2401','24-inch header','Larsen Mech Co.','2026-08-10','2026-08-24','2026-08-10',null,40,14,true,'IN_PROGRESS'),
      ('PIP-R3-2501','1.2.3.3','Piping','24-inch Header Hydrotest — Rack 3','Rack 3','PIP-R3-2501','24-inch header','Larsen Mech Co.','2026-08-25','2026-08-31',null,null,0,6,true,'NOT_STARTED'),
      ('INS-R3-2601','1.2.3.4','Piping','Header Insulation — Rack 3','Rack 3','INS-R3-2601','24-inch header','ThermoWrap Ltd.','2026-09-01','2026-09-08',null,null,0,7,true,'NOT_STARTED'),
      ('COM-R3-2701','1.2.3.5','Mechanical','Rack 3 Commissioning — Piping Systems','Rack 3','COM-R3-2701','24-inch header','OIL Commissioning Team','2026-09-09','2026-09-18',null,null,0,9,true,'NOT_STARTED'),
      ('MEC-U2-1101','1.3.1.1','Mechanical','Compressor Skid Installation — Unit 2','Unit 2','MEC-U2-1101',null,'Voltas Engg.','2026-07-15','2026-08-05','2026-07-15','2026-08-02',100,21,false,'COMPLETE'),
      ('ELE-U2-1201','1.3.2.1','Electrical','Cable Pulling — Compressor Feeder, Unit 2','Unit 2','ELE-U2-1201',null,'Bharat Electricals','2026-08-06','2026-08-20','2026-08-06',null,55,14,false,'IN_PROGRESS'),
      ('INT-U2-1301','1.3.3.1','Instrumentation','Instrument Loop Installation — Unit 2 Compressor','Unit 2','INT-U2-1301',null,'Precision Instruments','2026-08-21','2026-09-02',null,null,0,12,false,'NOT_STARTED'),
      ('CIV-Z1-0101','1.1.1.1','Civil','Foundation Pour — Zone 1 Pipe Rack','Zone 1','CIV-Z1-0101',null,'NCC Infra','2026-06-01','2026-06-15','2026-06-01','2026-06-14',100,14,false,'COMPLETE'),
      ('STR-Z1-0201','1.1.2.1','Structural','Pipe Rack Steel Erection — Zone 1','Zone 1','STR-Z1-0201',null,'Larsen Mech Co.','2026-06-16','2026-06-30','2026-06-16','2026-06-29',100,14,false,'COMPLETE'),
      ('PIP-R5-2801','1.2.5.1','Piping','12-inch Utility Line Erection — Rack 5','Rack 5','PIP-R5-2801','12-inch utility','Larsen Mech Co.','2026-08-05','2026-08-15','2026-08-05',null,20,10,false,'IN_PROGRESS'),
      ('PIP-R5-2901','1.2.5.2','Piping','12-inch Utility Line Hydrotest — Rack 5','Rack 5','PIP-R5-2901','12-inch utility','Larsen Mech Co.','2026-08-16','2026-08-20',null,null,0,4,false,'NOT_STARTED')
    ) as v(activity_id, wbs, discipline, description, location, engineering_tag, line_number, contractor, planned_start, planned_finish, actual_start, actual_finish, progress, duration_days, is_critical, status)
    returning id, activity_id
  )
  select 1;

  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='PIP-R3-2301' and project_id=proj_id) where activity_id='PIP-R3-2401' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='PIP-R3-2401' and project_id=proj_id) where activity_id='PIP-R3-2501' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='PIP-R3-2501' and project_id=proj_id) where activity_id='INS-R3-2601' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='INS-R3-2601' and project_id=proj_id) where activity_id='COM-R3-2701' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='MEC-U2-1101' and project_id=proj_id) where activity_id='ELE-U2-1201' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='ELE-U2-1201' and project_id=proj_id) where activity_id='INT-U2-1301' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='CIV-Z1-0101' and project_id=proj_id) where activity_id='STR-Z1-0201' and project_id=proj_id;
  update schedule_activities set predecessor_id = (select id from schedule_activities where activity_id='PIP-R5-2801' and project_id=proj_id) where activity_id='PIP-R5-2901' and project_id=proj_id;

  insert into execution_memory (project_id, activity_type, planned_duration, actual_duration, delay_cause, contractor, productivity_note, recovery_action, outcome)
  values
  (proj_id,'Hydrotest',5,8,'Water supply interruption','Larsen Mech Co.','Crew of 4, single shift','Added tanker water supply','Recovered 2 of 3 days lost'),
  (proj_id,'Piping Erection',10,14,'Spool delivery delay','Larsen Mech Co.','Fabrication yard congestion','Prioritized critical-path spools','Recovered on subsequent activity'),
  (proj_id,'Cable Pulling',12,12,null,'Bharat Electricals','On schedule, 2 crews',null,'On time'),
  (proj_id,'Structural Erection',14,13,null,'Larsen Mech Co.','Ahead of plan due to early steel delivery',null,'Completed 1 day early'),
  (proj_id,'Instrument Installation',12,16,'Vendor documentation pending','Precision Instruments','Loop checks delayed by paperwork','Parallel documentation review','3 of 4 days recovered');

  insert into notifications (project_id, user_role, title, body, link)
  values
  (proj_id,'PLANNER','2 field updates require review','Recent DPR submissions are pending planner review.','/review'),
  (proj_id,'PROJECT_MANAGER','Critical activity at risk','24-inch Header Spool Erection — Rack 3 is on the critical path.','/impact');

  insert into audit_events (project_id, actor, action, entity_type, entity_id, after_json, source)
  values (proj_id,'system','SEED_COMPLETE','project',proj_id::text,'{"activities":12}','seed_script');

  raise notice 'Seed complete. Demo accounts: admin@plan2reality.io/admin123, pm@plan2reality.io/pm12345, planner@plan2reality.io/plan123, supervisor@plan2reality.io/sup1234, viewer@plan2reality.io/view123';
end $$;
