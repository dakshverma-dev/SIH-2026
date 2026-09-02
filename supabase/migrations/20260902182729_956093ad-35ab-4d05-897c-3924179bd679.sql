CREATE POLICY p_docs_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents' AND public.can('view'));
CREATE POLICY p_docs_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents' AND public.can('documents:create'));