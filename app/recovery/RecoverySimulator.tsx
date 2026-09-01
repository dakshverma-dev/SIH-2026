"use client";
import { useState } from "react";

interface RecoveryActivity {
  id: string;
  activity_id: string;
  description: string;
  is_critical: boolean;
}

interface RecoveryOption {
  id: string;
  label: string;
  projectedFinish: string;
  recoveryDays: number;
  effort: string;
  risk: string;
}

interface RecoveryResult {
  currentForecast: string;
  options: RecoveryOption[];
}

export default function RecoverySimulator({ activities }: { activities: RecoveryActivity[] }) {
  const [activityId, setActivityId] = useState(activities[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecoveryResult | null>(null);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId }),
    });
    const data: RecoveryResult = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="p2r-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <select value={activityId} onChange={(e) => setActivityId(e.target.value)} style={{ padding: "8px 10px", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 13, flex: 1 }}>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.activity_id} — {a.description}{a.is_critical ? " (critical)" : ""}</option>
          ))}
        </select>
        <button onClick={run} disabled={loading} style={{ padding: "9px 16px", background: "var(--accent)", color: "#0b0f14", fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          {loading ? "Simulating…" : "Run Simulation"}
        </button>
      </div>

      {result && (
        <>
          <div className="p2r-panel" style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>CURRENT FORECAST</div>
            <div className="p2r-mono" style={{ fontSize: 20, fontWeight: 700 }}>{result.currentForecast}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {result.options.map((o) => (
              <div key={o.id} className="p2r-panel" style={{ padding: 14 }}>
                <div style={{ fontWeight: 600 }}>{o.label}</div>
                <div className="p2r-mono" style={{ fontSize: 18, marginTop: 6 }}>{o.projectedFinish}</div>
                <div style={{ fontSize: 12, color: "var(--accent-2)", marginTop: 4 }}>−{o.recoveryDays} days</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{o.effort}</div>
                <span className={`badge ${o.risk === "LOW" ? "badge-high" : o.risk === "MEDIUM" ? "badge-medium" : "badge-low"}`} style={{ marginTop: 8, display: "inline-block" }}>{o.risk} RISK</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
