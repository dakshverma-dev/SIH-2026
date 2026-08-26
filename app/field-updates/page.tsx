import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import Link from "next/link";
import FieldReportForm from "./FieldReportForm";

export default async function FieldUpdatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;
  const { data } = await supabase
    .from("field_reports")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  const reports = data || [];

  return (
    <Shell active="/field-updates" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Field Updates</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Submit raw DPR / supervisor text. The extraction service and L5/L6 matching engine run automatically on submission.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <FieldReportForm />

        <div className="p2r-card" style={{ padding: 4 }}>
          <table>
            <thead><tr><th>Date</th><th>Contractor</th><th>Location</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="p2r-mono">{r.report_date}</td>
                  <td>{r.contractor || "—"}</td>
                  <td>{r.location || "—"}</td>
                  <td>
                    <span className={`badge ${r.status === "PROCESSED" ? "badge-high" : r.status === "ERROR" ? "badge-low" : "badge-neutral"}`}>{r.status}</span>
                  </td>
                  <td><Link href={`/field-updates/${r.id}`} style={{ color: "var(--accent)", fontSize: 12.5 }}>Open →</Link></td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={5} style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>No field reports yet. Submit one to start the golden path.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
