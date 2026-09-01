import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import Link from "next/link";

interface ScoreSignal {
  signal: string;
  label: string;
  weight: number;
  hit: boolean;
}

function highlightSpan(fullText: string, span: string) {
  if (!fullText || !span) return fullText;
  const idx = fullText.toLowerCase().indexOf(span.toLowerCase());
  if (idx === -1) return fullText;
  return (
    <>
      {fullText.slice(0, idx)}
      <mark style={{ background: "var(--accent-soft)", color: "var(--text)", padding: "1px 2px", borderRadius: 3, boxDecorationBreak: "clone" }}>
        {fullText.slice(idx, idx + span.length)}
      </mark>
      {fullText.slice(idx + span.length)}
    </>
  );
}

function trustBadgeClass(level: string) {
  return level === "HIGH" ? "badge-high" : level === "MEDIUM" ? "badge-medium" : level === "LOW" ? "badge-low" : "badge-neutral";
}

export default async function EvidencePage({ params }: { params: Promise<{ matchId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { matchId } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase.from("activity_matches").select("*").eq("id", matchId).single();
  if (!match) notFound();

  const [{ data: event }, { data: candidatesData }, { data: conflicts }, { data: auditEvents }] = await Promise.all([
    supabase.from("field_events").select("*").eq("id", match.field_event_id).single(),
    supabase
      .from("match_candidates")
      .select("*, schedule_activities(activity_id, description, wbs, discipline, location, engineering_tag, status)")
      .eq("field_event_id", match.field_event_id)
      .order("rank", { ascending: true }),
    supabase.from("conflicts").select("*").eq("field_event_id", match.field_event_id).order("created_at", { ascending: false }),
    supabase
      .from("audit_events")
      .select("*")
      .or(`entity_id.eq.${matchId},entity_id.eq.${match.field_event_id}`)
      .order("created_at", { ascending: true }),
  ]);

  const report = event?.report_id
    ? (await supabase.from("field_reports").select("*").eq("id", event.report_id).single()).data
    : null;

  const bestActivity = candidatesData?.find((c) => c.activity_id === match.best_activity_id)?.schedule_activities || null;
  const alternatives = (candidatesData || []).filter((c) => c.activity_id !== match.best_activity_id);
  const breakdown: ScoreSignal[] = (match.score_breakdown as ScoreSignal[]) || [];
  const project = (await supabase.from("projects").select("name").eq("id", match.project_id).maybeSingle()).data;

  const decision =
    match.status === "APPROVED" ? "AUTO-POSTED / APPROVED" : match.status === "REJECTED" ? "REJECTED" : match.trust_level === "UNMATCHED" ? "UNMATCHED" : "PENDING REVIEW";

  return (
    <Shell active="/review" user={session} projectName={project?.name}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          <Link href="/review" className="p2r-link">Review Queue</Link> / Evidence
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>Evidence — {event?.activity_description || "Field event"}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Every field in this view is traceable to a database record. Nothing here is inferred for display purposes only.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ORIGINAL FIELD REPORT */}
          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 8 }}>Original field report</div>
            {report ? (
              <>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  {report.report_date} · {report.contractor || "—"} · {report.location || "—"}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  {event?.evidence_span ? highlightSpan(report.raw_text, event.evidence_span) : report.raw_text}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Source report unavailable — this event may have been captured outside the standard field-report flow.</div>
            )}
          </div>

          {/* WHY WE MATCHED THIS */}
          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Why we matched this</div>
            {breakdown.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                No candidate scored above zero. Nothing in this report shares an identifier, discipline, location, or description overlap with a known schedule activity.
              </div>
            )}
            {breakdown.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < breakdown.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontSize: 13, color: s.hit ? "var(--text)" : "var(--muted)" }}>{s.label}</div>
                <div
                  className="p2r-mono"
                  style={{ fontSize: 12.5, fontWeight: 700, color: s.weight > 0 ? "var(--accent-2)" : s.weight < 0 ? "var(--danger)" : "var(--muted)", flexShrink: 0, marginLeft: 12 }}
                >
                  {s.weight > 0 ? "+" : ""}
                  {s.weight.toFixed(2)}
                </div>
              </div>
            ))}
            {breakdown.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-strong)" }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Final confidence</div>
                <div className="p2r-mono" style={{ fontWeight: 700, fontSize: 15 }}>{Math.round(match.confidence * 100)}%</div>
              </div>
            )}
          </div>

          {/* CONTRADICTIONS */}
          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Contradictions</div>
            {(!conflicts || conflicts.length === 0) && (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>No contradictions detected against prior reports for this activity.</div>
            )}
            {(conflicts || []).map((c) => (
              <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="badge badge-low">{c.conflict_type.replace(/_/g, " ")}</span>
                <div style={{ fontSize: 13, marginTop: 6 }}>{c.description}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Status: {c.status}{c.resolution_reason ? ` — ${c.resolution_reason}` : ""}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* MATCHED ACTIVITY + DECISION */}
          <div className="p2r-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="p2r-eyebrow">Matched activity</div>
              <span className={`badge ${trustBadgeClass(match.trust_level)}`}>{match.trust_level}</span>
            </div>
            {bestActivity ? (
              <>
                <div className="p2r-mono" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{bestActivity.activity_id}</div>
                <div style={{ fontSize: 15.5, fontWeight: 600, marginTop: 2 }}>{bestActivity.description}</div>
                <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                  <span>WBS {bestActivity.wbs}</span>
                  <span>{bestActivity.discipline}</span>
                  <span>{bestActivity.location}</span>
                </div>
                <Link href={`/schedule#${match.best_activity_id}`} className="p2r-link" style={{ display: "inline-block", marginTop: 10, fontSize: 12.5 }}>Open in Schedule →</Link>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--danger)", marginTop: 8 }}>
                No credible schedule counterpart. This event remains <strong>UNMATCHED</strong> and was never forced onto an activity.
              </div>
            )}

            <div className="p2r-panel" style={{ marginTop: 14, padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>DECISION</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>{decision}</div>
              {match.reviewed_by && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>by {match.reviewed_by} · {match.reviewed_at}</div>}
              {match.status === "PENDING" && (
                <Link href="/review" className="p2r-link" style={{ display: "inline-block", marginTop: 8, fontSize: 12.5 }}>Go to Review Queue →</Link>
              )}
            </div>
          </div>

          {/* ALTERNATIVE CANDIDATES */}
          {alternatives.length > 0 && (
            <div className="p2r-card" style={{ padding: 18 }}>
              <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Alternative candidates considered</div>
              {alternatives.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span className="p2r-mono">{c.schedule_activities?.activity_id} — {c.schedule_activities?.description}</span>
                  <span style={{ flexShrink: 0, marginLeft: 8 }}>{Math.round(c.score * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* AUDIT HISTORY */}
          <div className="p2r-card" style={{ padding: 18 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Audit history</div>
            {(!auditEvents || auditEvents.length === 0) && <div style={{ fontSize: 13, color: "var(--muted)" }}>No audit events recorded yet.</div>}
            {(auditEvents || []).map((a, i) => (
              <div key={a.id} style={{ padding: "8px 0", borderBottom: i < (auditEvents?.length || 0) - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{a.action.replace(/_/g, " ")}</span>
                  <span className="p2r-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{a.created_at}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{a.actor}{a.source ? ` · ${a.source}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
