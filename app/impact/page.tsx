import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";

export default async function ImpactPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { data } = await supabase
    .from("schedule_impacts")
    .select("*, schedule_activities(activity_id, description)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const impacts = (data || []).map((im) => ({
    ...im,
    sched_activity_id: im.schedule_activities?.activity_id,
    sched_description: im.schedule_activities?.description,
  }));

  return (
    <Shell active="/impact" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Schedule Impact</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Recalculated automatically whenever a matched field event is approved onto the schedule.
      </p>

      {impacts.length === 0 && (
        <div className="p2r-card" style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>
          No impact events yet. Approve a matched event from the Review Queue to trigger a recalculation.
        </div>
      )}

      {impacts.map((im) => {
        const affected: string[] = im.affected_activities || [];
        return (
          <div key={im.id} className="p2r-card" style={{ padding: 18, marginBottom: 14 }}>
            <div className="p2r-mono" style={{ color: "var(--accent)", fontSize: 12.5 }}>{im.sched_activity_id}</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{im.sched_description}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>BASELINE FINISH</div>
                <div className="p2r-mono" style={{ fontSize: 15 }}>{im.baseline_finish}</div>
              </div>
              <div style={{ color: "var(--muted)" }}>→</div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>UPDATED FORECAST</div>
                <div className="p2r-mono" style={{ fontSize: 15 }}>{im.forecast_finish}</div>
              </div>
              <div>
                <span className={`badge ${im.variance_days > 0 ? "badge-low" : "badge-high"}`}>
                  {im.variance_days > 0 ? `+${im.variance_days}` : im.variance_days} days
                </span>
              </div>
              {im.critical_path_changed ? <span className="badge badge-low">CRITICAL PATH CHANGED</span> : null}
            </div>

            {affected.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>AFFECTED DOWNSTREAM ACTIVITIES</div>
                {affected.map((a, i) => <div key={i} style={{ fontSize: 13 }}>• {a}</div>)}
              </div>
            )}
          </div>
        );
      })}
    </Shell>
  );
}
