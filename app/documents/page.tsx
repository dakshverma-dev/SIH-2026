import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import UploadForm from "./UploadForm";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  const docs = data || [];

  return (
    <Shell active="/documents" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Documents</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>Uploaded to Supabase Storage in a private bucket. Only project members can read files (enforced by storage RLS policy, not just this UI).</p>
      <UploadForm />
      <div className="p2r-card" style={{ padding: 4, marginTop: 16 }}>
        <table>
          <thead><tr><th>Filename</th><th>Category</th><th>Size</th><th>Uploaded</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}><td>{d.filename}</td><td>{d.category}</td><td>{(d.size_bytes / 1024).toFixed(1)} KB</td><td className="p2r-mono">{d.created_at}</td></tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>No documents uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
