insert into storage.buckets (id, name, public) values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select" on storage.objects for select
  using (bucket_id = 'project-documents' and is_project_member((storage.foldername(name))[1]::uuid));

create policy "documents_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'project-documents'
    and is_project_member((storage.foldername(name))[1]::uuid)
    and current_role_name() in ('ADMIN','PROJECT_MANAGER','PLANNER','SUPERVISOR')
  );
