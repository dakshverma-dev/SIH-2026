import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import { StatusBadge } from "../dashboard/page";
import Link from "next/link";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("project_id", project.id)
    .order("wbs", { ascending: true });
  const activities = data || [];

  return (
    <Shell active="/schedule" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Schedule</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        {activities.length} L5/L6 activities · {activities.filter((a) => a.is_critical).length} on critical path
      </p>
      <div className="p2r-card" style={{ padding: 4 }}>
        <table>
          <thead>
            <tr>
              <th>Activity ID</th><th>WBS</th><th>Description</th><th>Discipline</th><th>Location</th>
              <th>Contractor</th><th>Planned</th><th>Progress</th><th>Status</th><th>Critical</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <td className="p2r-mono" style={{ color: "var(--accent)" }}>
                  <Link href={`/activity/${a.id}`} className="p2r-link" style={{ color: "var(--accent)" }}>{a.activity_id}</Link>
                </td>
                <td className="p2r-mono" style={{ color: "var(--muted)" }}>{a.wbs}</td>
                <td>{a.description}<div style={{ fontSize: 11, color: "var(--muted)" }}>{a.engineering_tag}</div></td>
                <td>{a.discipline}</td>
                <td>{a.location}</td>
                <td>{a.contractor}</td>
                <td className="p2r-mono" style={{ fontSize: 12 }}>{a.planned_start} → {a.planned_finish}</td>
                <td>
                  <div style={{ width: 60, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${a.progress}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.progress}%</div>
                </td>
                <td><StatusBadge status={a.status} /></td>
                <td>{a.is_critical ? <span className="badge badge-low">CRITICAL</span> : <span className="badge badge-neutral">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
