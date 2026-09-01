"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Conflict {
  id: string;
  conflict_type: string;
  description: string;
  sched_activity_id?: string | null;
  sched_description?: string | null;
  status: string;
  resolution_reason?: string | null;
}

export default function ConflictRow({ conflict, canResolve }: { conflict: Conflict; canResolve: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "RESOLVE" | "IGNORE") {
    const reason = action === "IGNORE" ? prompt("Reason for ignoring this conflict?") || "" : "Reviewed and corrected in schedule.";
    setLoading(true);
    await fetch(`/api/conflicts/${conflict.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="p2r-card" style={{ padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="badge badge-low">{conflict.conflict_type.replace(/_/g, " ")}</span>
          <div style={{ marginTop: 6, fontSize: 13.5 }}>{conflict.description}</div>
          {conflict.sched_activity_id && (
            <div className="p2r-mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{conflict.sched_activity_id} — {conflict.sched_description}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${conflict.status === "OPEN" ? "badge-low" : conflict.status === "RESOLVED" ? "badge-high" : "badge-neutral"}`}>{conflict.status}</span>
          {canResolve && conflict.status === "OPEN" && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button disabled={loading} onClick={() => act("RESOLVE")} style={{ padding: "5px 10px", fontSize: 12, background: "var(--accent-2)", color: "#0b0f14", border: "none", borderRadius: 5, cursor: "pointer" }}>Resolve</button>
              <button disabled={loading} onClick={() => act("IGNORE")} style={{ padding: "5px 10px", fontSize: 12, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer" }}>Ignore</button>
            </div>
          )}
          {conflict.resolution_reason && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, maxWidth: 220 }}>{conflict.resolution_reason}</div>}
        </div>
      </div>
    </div>
  );
}
