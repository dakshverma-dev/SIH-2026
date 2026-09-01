"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MatchCandidate {
  id: string;
  score: number;
  reasons: string[];
  activity_id: string;
  sched_activity_id?: string | null;
  sched_description?: string | null;
  wbs?: string | null;
  discipline?: string | null;
  location?: string | null;
}

interface ReviewMatch {
  id: string;
  evidence_span?: string | null;
  candidates: MatchCandidate[];
  trust_level: string;
  confidence: number;
  status: string;
  reviewed_by?: string | null;
}

interface ReviewImpact {
  baselineFinish: string;
  forecastFinish: string;
  varianceDays: number;
}

export default function ReviewCard({ match, canReview }: { match: ReviewMatch; canReview: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<ReviewImpact | null>(null);
  const best = match.candidates[0];
  const trustClass = match.trust_level === "HIGH" ? "badge-high" : match.trust_level === "MEDIUM" ? "badge-medium" : "badge-low";

  async function decide(decision: "APPROVE" | "REJECT") {
    setLoading(true);
    const res = await fetch(`/api/matches/${match.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, activityId: best?.activity_id }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.impact) setImpact(data.impact);
    router.refresh();
  }

  return (
    <div className="p2r-card" style={{ padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Source evidence</div>
          <div style={{ fontSize: 13.5, maxWidth: 640 }}>&ldquo;{match.evidence_span}&rdquo;</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${trustClass}`}>{match.trust_level}</span>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{Math.round(match.confidence * 100)}%</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>confidence</div>
        </div>
      </div>

      {best && (
        <div className="p2r-panel" style={{ marginTop: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Match Result</div>
          <div className="p2r-mono" style={{ color: "var(--accent)", fontSize: 13 }}>{best.sched_activity_id}</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{best.sched_description}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            <span>WBS {best.wbs}</span><span>{best.discipline}</span><span>{best.location}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            {best.reasons.map((r: string, i: number) => (
              <div key={i} style={{ fontSize: 12.5, color: "var(--accent-2)" }}>✓ {r}</div>
            ))}
          </div>

          {match.candidates.length > 1 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Alternative candidates ({match.candidates.length - 1})</summary>
              <table style={{ marginTop: 8 }}>
                <thead><tr><th>Activity</th><th>Score</th></tr></thead>
                <tbody>
                  {match.candidates.slice(1).map((c) => (
                    <tr key={c.id}><td className="p2r-mono" style={{ fontSize: 12 }}>{c.sched_activity_id} — {c.sched_description}</td><td>{Math.round(c.score * 100)}%</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      )}

      {!best && <div style={{ marginTop: 14, fontSize: 13, color: "var(--danger)" }}>No candidate found. This event remains UNMATCHED and will not be forced onto the schedule.</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
        {canReview && match.status === "PENDING" && (
          <>
            <button disabled={loading} onClick={() => decide("APPROVE")} style={{ padding: "7px 16px", background: "var(--accent-2)", color: "#fffdf8", fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Approve</button>
            <button disabled={loading} onClick={() => decide("REJECT")} style={{ padding: "7px 16px", background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Reject</button>
          </>
        )}
        <Link href={`/evidence/${match.id}`} className="p2r-link" style={{ fontSize: 12.5, marginLeft: canReview && match.status === "PENDING" ? 4 : 0 }}>
          View full evidence →
        </Link>
      </div>
      {match.status !== "PENDING" && (
        <div style={{ marginTop: 12 }}>
          <span className={`badge ${match.status === "APPROVED" ? "badge-high" : "badge-neutral"}`}>{match.status}</span>
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>by {match.reviewed_by}</span>
        </div>
      )}

      {impact && (
        <div className="p2r-panel" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Schedule impact recalculated</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Baseline <span className="p2r-mono">{impact.baselineFinish}</span> → Forecast <span className="p2r-mono">{impact.forecastFinish}</span>
            {" "}(<span style={{ color: impact.varianceDays > 0 ? "var(--danger)" : "var(--accent-2)" }}>{impact.varianceDays > 0 ? `+${impact.varianceDays}` : impact.varianceDays} days</span>)
          </div>
        </div>
      )}
    </div>
  );
}
