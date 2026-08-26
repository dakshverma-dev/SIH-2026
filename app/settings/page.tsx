import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data: users } = await supabase.from("profiles").select("id, name, email, role");
  const hasAiKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <Shell active="/settings" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Settings</h1>

      <div className="p2r-card" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>AI Provider</div>
        <div style={{ fontSize: 13 }}>
          Status: <span className={`badge ${hasAiKey ? "badge-high" : "badge-neutral"}`}>{hasAiKey ? "REAL AI (Anthropic)" : "DEMO FALLBACK (deterministic)"}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
          Set ANTHROPIC_API_KEY in the environment to enable LLM-based extraction. Without it, the system uses a deterministic
          rule-based extractor — always clearly labelled, never presented as AI.
        </div>
      </div>

      <div className="p2r-card" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Database & Security</div>
        <div style={{ fontSize: 13 }}>Backend: <span className="p2r-mono">Supabase Postgres</span></div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Row Level Security: <span className="badge badge-high">ENFORCED</span> on every table</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
          Every query in this app runs as the signed-in user&apos;s real Postgres role via their session JWT —
          not a service-role bypass. Project membership and role checks are enforced by the database itself,
          so even a bug in this UI cannot leak another project&apos;s data.
        </div>
      </div>

      <div className="p2r-card" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Project</div>
        <div style={{ fontSize: 13 }}>{project.name} ({project.code})</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Data mode: {project.data_status}</div>
      </div>

      {can(session.role, "*") && (
        <div className="p2r-card" style={{ padding: 4 }}>
          <div style={{ fontWeight: 600, padding: "14px 18px 0" }}>Users & Roles</div>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {(users || []).map((u) => (
                <tr key={u.id}><td>{u.name}</td><td className="p2r-mono">{u.email}</td><td><span className="badge badge-info">{u.role.replace("_", " ")}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
