import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import ActivitiesExplorer from "./ActivitiesExplorer";
import EmptyState from "@/components/shared/EmptyState";

export default async function ActivitiesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { data: activitiesData } = await supabase
    .from("schedule_activities")
    .select("*")
    .eq("project_id", project.id)
    .order("wbs", { ascending: true });
  const activities = activitiesData || [];

  // Latest match per activity, for the Confidence column. Ordered desc so the
  // first hit per activity_id in this pass is the most recent one.
  const { data: matchesData } = await supabase
    .from("activity_matches")
    .select("best_activity_id, confidence, trust_level, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const latestMatchByActivity = new Map<string, { confidence: number; trust_level: string; status: string }>();
  for (const m of matchesData || []) {
    if (m.best_activity_id && !latestMatchByActivity.has(m.best_activity_id)) {
      latestMatchByActivity.set(m.best_activity_id, { confidence: m.confidence, trust_level: m.trust_level, status: m.status });
    }
  }

  const rows = activities.map((a) => ({
    ...a,
    match: latestMatchByActivity.get(a.id) || null,
  }));

  return (
    <Shell active="/activities" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Activity Register</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        {activities.length} L5/L6 activities across the WBS. Confidence reflects the most recent field-event match, where one exists.
      </p>
      {activities.length === 0 ? (
        <EmptyState
          title="No schedule activities loaded"
          body="Import the L5/L6 activity register for this project, or run the seed migration, to populate the WBS."
          action={{ href: "/settings", label: "Open Settings" }}
        />
      ) : (
        <ActivitiesExplorer rows={rows} />
      )}
    </Shell>
  );
}
