import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import { getDefaultProject } from "@/lib/project";

export default async function FieldReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const supabase = await createClient();
  const { data: report } = await supabase.from("field_reports").select("*").eq("id", id).single();
  const project = await getDefaultProject(supabase);
  if (!report || !project) return <div style={{ padding: 40 }}>Not found.</div>;

  const { data } = await supabase.from("field_events").select("*").eq("report_id", id);
  const events = data || [];

  return (
    <Shell active="/field-updates" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Field Report</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>{report.report_date} · {report.contractor} · {report.location}</p>

      <div className="p2r-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Raw text (source evidence)</div>
        <div style={{ fontSize: 13.5 }}>{report.raw_text}</div>
      </div>

      {events.map((e) => (
        <div key={e.id} className="p2r-card" style={{ padding: 18, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>Extracted Event</div>
            <span className={`badge ${e.extraction_mode === "LLM" ? "badge-info" : "badge-neutral"}`}>
              {e.extraction_mode === "LLM" ? "REAL AI" : "DEMO FALLBACK"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 13 }}>
            <Field label="Event Type" value={e.event_type} />
            <Field label="Engineering Tag" value={e.engineering_tag} />
            <Field label="Line Number" value={e.line_number} />
            <Field label="Location" value={e.location} />
            <Field label="Discipline" value={e.discipline} />
            <Field label="Progress" value={e.progress !== null ? `${e.progress}%` : null} />
            <Field label="Delay Reason" value={e.delay_reason} />
          </div>
        </div>
      ))}
    </Shell>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>{label}</div>
      <div>{value === null || value === undefined || value === "" ? <span style={{ color: "var(--muted)" }}>null</span> : value}</div>
    </div>
  );
}
