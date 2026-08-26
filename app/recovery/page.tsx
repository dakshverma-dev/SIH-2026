import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import RecoverySimulator from "./RecoverySimulator";

export default async function RecoveryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data } = await supabase
    .from("schedule_activities")
    .select("id, activity_id, description, is_critical")
    .eq("project_id", project.id)
    .order("is_critical", { ascending: false })
    .order("wbs", { ascending: true });
  const activities = data || [];

  return (
    <Shell active="/recovery" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Recovery Simulator</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Compare recovery interventions for a delayed activity. Prototype assumptions — not a real-world optimized recommendation.
      </p>
      <RecoverySimulator activities={activities} />
    </Shell>
  );
}
