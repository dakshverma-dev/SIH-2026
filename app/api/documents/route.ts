import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import { getSession, can } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { UPLOAD_MAX_BYTES, UPLOAD_ALLOWED_MIME } from "@/lib/validation";
import { rateLimit, rateLimitKey } from "@/lib/rateLimit";

function sanitizeFilename(name: string): string {
  // Strip path separators and control characters so a crafted filename can
  // never escape the project-scoped storage prefix or corrupt the path.
  const base = name.replace(/[/\\]/g, "_").replace(/[^\w.\- ]/g, "_").trim();
  return base.slice(-180) || "upload";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "documents:create")) {
    return NextResponse.json({ error: `Role '${session.role}' cannot upload documents.` }, { status: 403 });
  }
  const rl = rateLimit(rateLimitKey(req, session.id), 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many uploads. Wait a moment and try again." }, { status: 429 });
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return NextResponse.json({ error: "No project" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  const file = form.get("file") as File | null;
  const category = (form.get("category") as string) || "General";
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size === 0) return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  if (file.size > UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds the ${UPLOAD_MAX_BYTES / 1024 / 1024}MB upload limit.` }, { status: 413 });
  }
  const mime = file.type || "application/octet-stream";
  if (!UPLOAD_ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: `File type '${mime}' is not allowed.` }, { status: 415 });
  }

  const safeName = sanitizeFilename(file.name);
  const storagePath = `${project.id}/${Date.now()}-${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, file, { contentType: mime });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 403 });

  const text = mime.startsWith("text/") ? await file.text() : null;

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      project_id: project.id,
      filename: safeName,
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
    after: { filename: safeName, size: file.size, mime },
    source: "documents",
  });

  return NextResponse.json({ id: inserted.id });
}
