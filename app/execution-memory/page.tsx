import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import ExecutionMemorySearch from "./ExecutionMemorySearch";

export default async function ExecutionMemoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data } = await supabase
    .from("execution_memory")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <Shell active="/execution-memory" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Execution Memory</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Searchable institutional history of past activities, delay causes and recovery actions. Answers are database-backed and cite the underlying record.
      </p>
      <ExecutionMemorySearch records={data || []} />
    </Shell>
  );
}
