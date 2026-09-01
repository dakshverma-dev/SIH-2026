import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import Link from "next/link";

function statusBadgeClass(status: string) {
  return status === "COMPLETE" ? "badge-high" : status === "DELAYED" ? "badge-low" : status === "IN_PROGRESS" ? "badge-info" : "badge-neutral";
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { activityId } = await params;
  const supabase = await createClient();

  const { data: activity } = await supabase.from("schedule_activities").select("*").eq("id", activityId).single();
  if (!activity) notFound();

  const [
    { data: predecessor },
    { data: successors },
    { data: matches },
    { data: impacts },
    { data: recoveries },
    { data: conflicts },
    { data: auditEvents },
    { data: project },
  ] = await Promise.all([
    activity.predecessor_id
      ? supabase.from("schedule_activities").select("id, activity_id, description, status, progress").eq("id", activity.predecessor_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("schedule_activities").select("id, activity_id, description, status, progress").eq("predecessor_id", activityId),
    supabase
      .from("activity_matches")
      .select("*, field_events(activity_description, evidence_span, progress)")
      .eq("best_activity_id", activityId)
      .order("created_at", { ascending: false }),
    supabase.from("schedule_impacts").select("*").eq("activity_id", activityId).order("created_at", { ascending: false }),
    supabase.from("recovery_scenarios").select("*").eq("activity_id", activityId).order("created_at", { ascending: false }).limit(6),
    supabase.from("conflicts").select("*").eq("activity_id", activityId).order("created_at", { ascending: false }),
    supabase.from("audit_events").select("*").eq("entity_id", activityId).order("created_at", { ascending: false }).limit(20),
    supabase.from("projects").select("name").eq("id", activity.project_id).maybeSingle(),
  ]);

  return (
    <Shell active="/activities" user={session} projectName={project?.name}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          <Link href="/activities" className="p2r-link">Activity Register</Link> / {activity.activity_id}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <h1 className="p2r-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{activity.activity_id}</h1>
          <span className={`badge ${statusBadgeClass(activity.status)}`}>{activity.status.replace("_", " ")}</span>
          {activity.is_critical && <span className="badge badge-low">CRITICAL PATH</span>}
        </div>
        <p style={{ fontSize: 15, marginTop: 4 }}>{activity.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Identity &amp; schedule</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 13 }}>
              <Field label="WBS" value={activity.wbs} mono />
              <Field label="Discipline" value={activity.discipline} />
              <Field label="Location" value={activity.location} />
              <Field label="Engineering Tag" value={activity.engineering_tag} mono />
              <Field label="Line/Size" value={activity.line_number} />
              <Field label="Contractor" value={activity.contractor} />
              <Field label="Planned Start" value={activity.planned_start} mono />
              <Field label="Planned Finish" value={activity.planned_finish} mono />
              <Field label="Actual Start" value={activity.actual_start} mono />
              <Field label="Actual Finish" value={activity.actual_finish} mono />
              <Field label="Duration (days)" value={String(activity.duration_days)} />
              <Field label="Progress" value={`${activity.progress}%`} />
            </div>
          </div>

          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Dependencies</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>PREDECESSOR</div>
            {predecessor ? (
              <Link href={`/activity/${predecessor.id}`} className="p2r-link" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="p2r-mono">{predecessor.activity_id} — {predecessor.description}</span>
                <span className={`badge ${statusBadgeClass(predecessor.status)}`}>{predecessor.status.replace("_", " ")}</span>
              </Link>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>No predecessor — this is a schedule origin point.</div>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)", margin: "12px 0 4px" }}>SUCCESSORS ({successors?.length || 0})</div>
            {(!successors || successors.length === 0) && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No downstream activities depend on this one.</div>}
            {(successors || []).map((s) => (
              <Link key={s.id} href={`/activity/${s.id}`} className="p2r-link" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="p2r-mono">{s.activity_id} — {s.description}</span>
                <span className={`badge ${statusBadgeClass(s.status)}`}>{s.status.replace("_", " ")}</span>
              </Link>
            ))}
          </div>

          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Field updates &amp; match decisions</div>
            {(!matches || matches.length === 0) && <div style={{ fontSize: 13, color: "var(--muted)" }}>No field report has matched to this activity yet.</div>}
            {(matches || []).map((m) => (
              <div key={m.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>&ldquo;{m.field_events?.evidence_span}&rdquo;</span>
                  <span className={`badge ${m.trust_level === "HIGH" ? "badge-high" : m.trust_level === "MEDIUM" ? "badge-medium" : "badge-low"}`}>{m.trust_level}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{m.status} · {Math.round(m.confidence * 100)}% confidence</div>
                <Link href={`/evidence/${m.id}`} className="p2r-link" style={{ fontSize: 12, marginTop: 4, display: "inline-block" }}>View evidence →</Link>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Schedule impact history</div>
            {(!impacts || impacts.length === 0) && <div style={{ fontSize: 13, color: "var(--muted)" }}>No impact recalculation has run against this activity yet.</div>}
            {(impacts || []).map((im) => (
              <div key={im.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                <span className="p2r-mono">{im.baseline_finish} → {im.forecast_finish}</span>{" "}
                <span className={`badge ${im.variance_days > 0 ? "badge-low" : "badge-high"}`}>{im.variance_days > 0 ? `+${im.variance_days}` : im.variance_days}d</span>
              </div>
            ))}
          </div>

          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Recovery scenarios</div>
            {(!recoveries || recoveries.length === 0) && (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                No scenarios run yet. <Link href="/recovery" className="p2r-link">Open Recovery Simulator →</Link>
              </div>
            )}
            {(recoveries || []).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                <span>{r.label}</span>
                <span className="p2r-mono">{r.projected_finish}</span>
              </div>
            ))}
          </div>

          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Conflicts</div>
            {(!conflicts || conflicts.length === 0) && <div style={{ fontSize: 13, color: "var(--muted)" }}>No contradictions recorded against this activity.</div>}
            {(conflicts || []).map((c) => (
              <div key={c.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="badge badge-low">{c.conflict_type.replace(/_/g, " ")}</span>
                <div style={{ fontSize: 12, marginTop: 4 }}>{c.description}</div>
              </div>
            ))}
          </div>

          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Audit trail</div>
            {(!auditEvents || auditEvents.length === 0) && <div style={{ fontSize: 13, color: "var(--muted)" }}>No audit entries yet.</div>}
            {(auditEvents || []).map((a) => (
              <div key={a.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{a.action.replace(/_/g, " ")}</span>
                  <span className="p2r-mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>{a.created_at}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div className={mono ? "p2r-mono" : undefined} style={{ marginTop: 2 }}>
        {value || <span style={{ color: "var(--muted)" }}>—</span>}
      </div>
    </div>
  );
}
