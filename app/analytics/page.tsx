import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { data: activitiesData } = await supabase.from("schedule_activities").select("*").eq("project_id", project.id);
  const activities = activitiesData || [];

  const byDiscipline: Record<string, { count: number; avgProgress: number }> = {};
  for (const a of activities) {
    if (!byDiscipline[a.discipline]) byDiscipline[a.discipline] = { count: 0, avgProgress: 0 };
    byDiscipline[a.discipline].count++;
    byDiscipline[a.discipline].avgProgress += Number(a.progress);
  }
  Object.values(byDiscipline).forEach((d) => (d.avgProgress = Math.round(d.avgProgress / d.count)));

  const delayed = activities.filter((a) => a.status === "DELAYED" || (a.actual_finish && a.planned_finish && a.actual_finish > a.planned_finish));

  const { data: matchesData } = await supabase.from("activity_matches").select("trust_level").eq("project_id", project.id);
  const matchCounts: Record<string, number> = {};
  (matchesData || []).forEach((m) => { matchCounts[m.trust_level] = (matchCounts[m.trust_level] || 0) + 1; });

  const { data: conflictsData } = await supabase.from("conflicts").select("status").eq("project_id", project.id);
  const conflictCounts: Record<string, number> = {};
  (conflictsData || []).forEach((c) => { conflictCounts[c.status] = (conflictCounts[c.status] || 0) + 1; });

  const byContractor: Record<string, { count: number; total: number }> = {};
  for (const a of activities) {
    if (!a.contractor) continue;
    if (!byContractor[a.contractor]) byContractor[a.contractor] = { count: 0, total: 0 };
    byContractor[a.contractor].count++;
    byContractor[a.contractor].total += Number(a.progress);
  }

  return (
    <Shell active="/analytics" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Analytics</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="p2r-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Progress by Discipline</div>
          {Object.entries(byDiscipline).map(([disc, d]) => (
            <div key={disc} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span>{disc} ({d.count})</span><span>{d.avgProgress}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginTop: 3 }}>
                <div style={{ width: `${d.avgProgress}%`, height: "100%", background: "var(--accent)" }} />
              </div>
            </div>
          ))}
        </div>

        <div className="p2r-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>AI Matching Confidence Distribution</div>
          {Object.keys(matchCounts).length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No matches recorded yet.</div>}
          {Object.entries(matchCounts).map(([level, c]) => (
            <div key={level} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span className={`badge ${level === "HIGH" ? "badge-high" : level === "MEDIUM" ? "badge-medium" : "badge-low"}`}>{level}</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="p2r-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Contractor Performance</div>
          <table>
            <thead><tr><th>Contractor</th><th>Activities</th><th>Avg Progress</th></tr></thead>
            <tbody>
              {Object.entries(byContractor).map(([contractor, d]) => (
                <tr key={contractor}><td>{contractor}</td><td>{d.count}</td><td>{Math.round(d.total / d.count)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p2r-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Conflict Reconciliation Volume</div>
          {Object.keys(conflictCounts).length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No conflicts recorded.</div>}
          {Object.entries(conflictCounts).map(([status, c]) => (
            <div key={status} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span>{status}</span><span>{c}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12.5 }}>
            Delayed / late-finish activities: <strong>{delayed.length}</strong>
          </div>
        </div>
      </div>
    </Shell>
  );
}
