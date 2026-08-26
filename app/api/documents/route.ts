import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return NextResponse.json({ error: "No project" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const category = (form.get("category") as string) || "General";
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const storagePath = `${project.id}/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 403 });

  const text = file.type.startsWith("text/") || file.name.endsWith(".txt") ? await file.text() : null;

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      project_id: project.id,
      filename: file.name,
      category,
      storage_path: storagePath,
      size_bytes: file.size,
      content_text: text,
      uploaded_by: session.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await logAudit(supabase, {
    projectId: project.id,
    actor: session.email,
    action: "DOCUMENT_UPLOADED",
    entityType: "document",
    entityId: inserted.id,
    after: { filename: file.name, size: file.size },
    source: "documents",
  });

  return NextResponse.json({ id: inserted.id });
}
