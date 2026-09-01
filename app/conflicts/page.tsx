import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import ConflictRow from "./ConflictRow";

export default async function ConflictsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { data } = await supabase
    .from("conflicts")
    .select("*, schedule_activities(activity_id, description)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const conflicts = (data || []).map((c) => ({
    ...c,
    sched_activity_id: c.schedule_activities?.activity_id,
    sched_description: c.schedule_activities?.description,
  }));

  return (
    <Shell active="/conflicts" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Conflict Center</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        {conflicts.filter((c) => c.status === "OPEN").length} open · Contradictory or suspicious updates are never silently accepted.
      </p>
      {conflicts.length === 0 && <div className="p2r-card" style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>No conflicts detected.</div>}
      {conflicts.map((c) => <ConflictRow key={c.id} conflict={c} canResolve={session.role !== "VIEWER" && session.role !== "SUPERVISOR"} />)}
    </Shell>
  );
}
