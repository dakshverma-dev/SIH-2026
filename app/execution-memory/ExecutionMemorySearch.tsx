"use client";
import { useState, useMemo } from "react";

interface ExecutionMemoryRecord {
  id: string;
  activity_type: string;
  planned_duration: number | null;
  actual_duration: number | null;
  delay_cause: string | null;
  contractor: string | null;
  recovery_action: string | null;
  outcome: string | null;
}

export default function ExecutionMemorySearch({ records }: { records: ExecutionMemoryRecord[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return records;
    const lower = q.toLowerCase();
    return records.filter((r) =>
      [r.activity_type, r.delay_cause, r.contractor, r.recovery_action, r.outcome]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(lower))
    );
  }, [q, records]);

  return (
    <div>
      <input
        placeholder='Search e.g. "hydrotest delays" or "Larsen Mech Co."'
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", marginBottom: 16, fontSize: 13.5 }}
      />
      {filtered.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>No matching records.</div>}
      {filtered.map((r) => (
        <div key={r.id} className="p2r-card" style={{ padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 600 }}>{r.activity_type}</div>
            <span className="p2r-mono" style={{ fontSize: 12, color: "var(--muted)" }}>{r.contractor}</span>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--muted)" }}>
            Planned {r.planned_duration}d · Actual {r.actual_duration}d
            {r.delay_cause ? ` · Delay: ${r.delay_cause}` : ""}
          </div>
          {r.recovery_action && <div style={{ fontSize: 12.5, marginTop: 4 }}>Recovery action: {r.recovery_action} → {r.outcome}</div>}
        </div>
      ))}
    </div>
  );
}
