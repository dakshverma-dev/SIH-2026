import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return <div style={{ padding: 40 }}>No project found. Run the seed migration first.</div>;

  const { data: activities } = await supabase.from("schedule_activities").select("*").eq("project_id", project.id);
  const acts = activities || [];
  const critical = acts.filter((a) => a.is_critical);
  const avgProgress = acts.length ? Math.round(acts.reduce((s, a) => s + Number(a.progress), 0) / acts.length) : 0;

  const { count: pendingReviews } = await supabase
    .from("activity_matches")
    .select("*", { count: "exact", head: true })
    .eq("project_id", project.id)
    .eq("status", "PENDING");

  const { count: openConflicts } = await supabase
    .from("conflicts")
    .select("*", { count: "exact", head: true })
    .eq("project_id", project.id)
    .eq("status", "OPEN");

  const { count: totalReports } = await supabase
    .from("field_reports")
    .select("*", { count: "exact", head: true })
    .eq("project_id", project.id);

  const { data: matches } = await supabase.from("activity_matches").select("confidence").eq("project_id", project.id);
  const avgConfidence = matches && matches.length
    ? Math.round((matches.reduce((s, m) => s + Number(m.confidence), 0) / matches.length) * 100)
    : null;

  const { data: latestImpact } = await supabase
    .from("schedule_impacts")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const kpis = [
    { label: "Project Health", value: `${avgProgress}%`, sub: "Avg. activity progress" },
    { label: "Critical Activities", value: critical.length, sub: "On critical path" },
    { label: "Pending Reviews", value: pendingReviews ?? 0, sub: "Awaiting planner decision" },
    { label: "Open Conflicts", value: openConflicts ?? 0, sub: "Require resolution" },
    { label: "Field Reports Logged", value: totalReports ?? 0, sub: "Total submitted" },
    { label: "AI Matching Confidence", value: avgConfidence !== null ? `${avgConfidence}%` : "—", sub: "Avg. across matched events" },
  ];

  return (
    <Shell active="/dashboard" user={session} projectName={project.name}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{project.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{project.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} className="p2r-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="p2r-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Critical Path Activities</div>
          <table>
            <thead><tr><th>Activity</th><th>Discipline</th><th>Progress</th><th>Status</th><th>Planned Finish</th></tr></thead>
            <tbody>
              {critical.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="p2r-mono" style={{ fontSize: 12, color: "var(--accent)" }}>{a.activity_id}</div>
                    <div>{a.description}</div>
                  </td>
                  <td>{a.discipline}</td>
                  <td>{a.progress}%</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="p2r-mono">{a.planned_finish}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="p2r-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Forecast Finish (Golden Path)</div>
            {latestImpact ? (
              <>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Baseline: <span className="p2r-mono">{latestImpact.baseline_finish}</span></div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Forecast: <span className="p2r-mono">{latestImpact.forecast_finish}</span></div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${latestImpact.variance_days > 0 ? "badge-low" : "badge-high"}`}>
                    {latestImpact.variance_days > 0 ? `+${latestImpact.variance_days}` : latestImpact.variance_days} days variance
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Run the golden path from Field Updates → Review → Impact to populate a live forecast.</div>
            )}
          </div>
          <div className="p2r-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href="/field-updates" className="p2r-panel" style={{ padding: "9px 12px", fontSize: 13 }}>Submit a field report →</Link>
              <Link href="/review" className="p2r-panel" style={{ padding: "9px 12px", fontSize: 13 }}>Open review queue →</Link>
              <Link href="/recovery" className="p2r-panel" style={{ padding: "9px 12px", fontSize: 13 }}>Run recovery simulator →</Link>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === "COMPLETE" ? "badge-high" : status === "DELAYED" ? "badge-low" : status === "IN_PROGRESS" ? "badge-info" : "badge-neutral";
  return <span className={`badge ${cls}`}>{status.replace("_", " ")}</span>;
}
