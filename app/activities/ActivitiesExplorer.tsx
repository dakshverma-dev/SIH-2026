"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

interface ActivityRow {
  id: string;
  activity_id: string;
  wbs: string;
  discipline: string;
  description: string;
  location: string | null;
  contractor: string | null;
  planned_start: string | null;
  planned_finish: string | null;
  progress: number | string;
  is_critical: boolean;
  status: string;
  match: { confidence: number; trust_level: string; status: string } | null;
}

type SortKey = "activity_id" | "wbs" | "progress" | "planned_finish" | "discipline";

function trustBadgeClass(level?: string) {
  if (!level) return "badge-neutral";
  return level === "HIGH" ? "badge-high" : level === "MEDIUM" ? "badge-medium" : level === "LOW" ? "badge-low" : "badge-neutral";
}

export default function ActivitiesExplorer({ rows }: { rows: ActivityRow[] }) {
  const [q, setQ] = useState("");
  const [discipline, setDiscipline] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("wbs");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [grouped, setGrouped] = useState(true);

  const disciplines = useMemo(() => Array.from(new Set(rows.map((r) => r.discipline))).sort(), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return rows
      .filter((r) => !lower || [r.activity_id, r.description, r.wbs, r.location, r.contractor].filter(Boolean).some((f) => String(f).toLowerCase().includes(lower)))
      .filter((r) => discipline === "ALL" || r.discipline === discipline)
      .filter((r) => status === "ALL" || r.status === status)
      .filter((r) => !criticalOnly || r.is_critical)
      .sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      });
  }, [rows, q, discipline, status, criticalOnly, sortKey, sortDir]);

  const groups = useMemo(() => {
    if (!grouped) return { "All activities": filtered };
    const out: Record<string, ActivityRow[]> = {};
    for (const r of filtered) {
      const top = r.wbs?.split(".").slice(0, 2).join(".") || "Ungrouped";
      out[top] = out[top] || [];
      out[top].push(r);
    }
    return out;
  }, [filtered, grouped]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search activity ID, description, WBS, contractor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 260px", padding: "8px 10px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}
        />
        <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={selectStyle}>
          <option value="ALL">All disciplines</option>
          {disciplines.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
          <option value="ALL">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} />
          Critical path only
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
          Group by WBS
        </label>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{filtered.length} of {rows.length}</span>
      </div>

      {filtered.length === 0 && (
        <div className="p2r-card" style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>
          No activities match these filters. Try clearing the search or discipline filter.
        </div>
      )}

      {Object.entries(groups).map(([groupLabel, groupRows]) => (
        <div key={groupLabel} className="p2r-card" style={{ padding: 4, marginBottom: 14 }}>
          {grouped && (
            <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--accent)", textTransform: "uppercase" }}>
              WBS {groupLabel} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({groupRows.length})</span>
            </div>
          )}
          <table>
            <thead>
              <tr>
                <Th label="Activity ID" onClick={() => toggleSort("activity_id")} active={sortKey === "activity_id"} dir={sortDir} />
                <Th label="WBS" onClick={() => toggleSort("wbs")} active={sortKey === "wbs"} dir={sortDir} />
                <th>Description</th>
                <Th label="Discipline" onClick={() => toggleSort("discipline")} active={sortKey === "discipline"} dir={sortDir} />
                <th>Location</th>
                <Th label="Progress" onClick={() => toggleSort("progress")} active={sortKey === "progress"} dir={sortDir} />
                <Th label="Planned Finish" onClick={() => toggleSort("planned_finish")} active={sortKey === "planned_finish"} dir={sortDir} />
                <th>Status</th>
                <th>Critical</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/activity/${a.id}`} className="p2r-link p2r-mono" style={{ color: "var(--accent)" }}>{a.activity_id}</Link>
                  </td>
                  <td className="p2r-mono" style={{ color: "var(--muted)", fontSize: 12 }}>{a.wbs}</td>
                  <td>{a.description}</td>
                  <td>{a.discipline}</td>
                  <td>{a.location || "—"}</td>
                  <td>
                    <div style={{ width: 56, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${a.progress}%`, height: "100%", background: "var(--accent)" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.progress}%</div>
                  </td>
                  <td className="p2r-mono" style={{ fontSize: 12 }}>{a.planned_finish}</td>
                  <td><span className={`badge ${a.status === "COMPLETE" ? "badge-high" : a.status === "DELAYED" ? "badge-low" : a.status === "IN_PROGRESS" ? "badge-info" : "badge-neutral"}`}>{a.status.replace("_", " ")}</span></td>
                  <td>{a.is_critical ? <span className="badge badge-low">CRITICAL</span> : <span className="badge badge-neutral">—</span>}</td>
                  <td>
                    {a.match ? (
                      <span className={`badge ${trustBadgeClass(a.match.trust_level)}`}>{Math.round(a.match.confidence * 100)}%</span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>No matches</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Th({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: 1 | -1 }) {
  return (
    <th onClick={onClick} style={{ cursor: "pointer", userSelect: "none" }}>
      {label} {active ? (dir === 1 ? "↑" : "↓") : ""}
    </th>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 10px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)",
};
