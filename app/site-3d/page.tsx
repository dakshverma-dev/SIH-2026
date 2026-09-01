import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import EmptyState from "@/components/shared/EmptyState";
import SiteSceneLoader from "@/components/3d/SiteSceneLoader";

export default async function Site3DPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { data: activitiesData } = await supabase
    .from("schedule_activities")
    .select("id, activity_id, wbs, discipline, description, location, progress, status, is_critical, planned_start, planned_finish, duration_days, contractor")
    .eq("project_id", project.id)
    .order("wbs", { ascending: true });
  const activities = activitiesData || [];

  return (
    <Shell active="/site-3d" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>3D Site Command Center</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Every block is a real schedule activity, grouped by field location. Colour = status, red outline = critical path, height = planned duration. Click a block to inspect it.
      </p>
      {activities.length === 0 ? (
        <EmptyState title="No activities to visualize" body="Import or seed the schedule for this project first." />
      ) : (
        <SiteSceneLoader activities={activities} />
      )}
    </Shell>
  );
}
