import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data } = await supabase
    .from("audit_events")
    .select("*")
    .or(`project_id.eq.${project.id},project_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(200);
  const events = data || [];

  return (
    <Shell active="/audit" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Audit Timeline</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>Every important mutation — who, what, when, before/after, source, model, confidence. Append-only at the database level (RLS grants no update/delete on this table).</p>

      <div className="p2r-card" style={{ padding: 0 }}>
        {events.map((e, i) => (
          <div key={e.id} style={{ padding: "12px 18px", borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="p2r-mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.created_at}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{e.action.replace(/_/g, " ")}</span>
                {e.confidence !== null && <span className="badge badge-info">{Math.round(e.confidence * 100)}%</span>}
                {e.model && <span className="badge badge-neutral">{e.model}</span>}
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{e.actor}</span>
            </div>
            {e.reason && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{e.reason}</div>}
            {(e.before_json || e.after_json) && (
              <details style={{ marginTop: 4 }}>
                <summary style={{ fontSize: 11.5, color: "var(--accent)", cursor: "pointer" }}>Details</summary>
                <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11.5 }} className="p2r-mono">
                  {e.before_json && <pre style={{ background: "var(--panel-2)", padding: 8, borderRadius: 6, maxWidth: 380, overflow: "auto" }}>{JSON.stringify(e.before_json, null, 2)}</pre>}
                  {e.after_json && <pre style={{ background: "var(--panel-2)", padding: 8, borderRadius: 6, maxWidth: 380, overflow: "auto" }}>{JSON.stringify(e.after_json, null, 2)}</pre>}
                </div>
              </details>
            )}
          </div>
        ))}
        {events.length === 0 && <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>No audit events yet.</div>}
      </div>
    </Shell>
  );
}
