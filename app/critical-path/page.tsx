import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import Link from "next/link";
import { recalcCpm } from "@/lib/engine/schedule";

const DAY_MS = 86400000;
const PX_PER_DAY = 9;
const ROW_H = 30;
const LABEL_W = 260;

function toDayOffset(dateStr: string, origin: number): number {
  return Math.round((new Date(dateStr).getTime() - origin) / DAY_MS);
}

export default async function CriticalPathPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { activities, cpm } = await recalcCpm(supabase, project.id);

  if (activities.length === 0) {
    return (
      <Shell active="/impact" user={session} projectName={project.name}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Critical Path</h1>
        <div className="p2r-card" style={{ padding: 24, color: "var(--muted)", fontSize: 13, marginTop: 12 }}>
          No schedule activities loaded for this project yet.
        </div>
      </Shell>
    );
  }

  const allDates = activities.flatMap((a) => {
    const node = cpm.get(a.id)!;
    return [a.planned_start, a.planned_finish, node.earliestStart, node.earliestFinish, node.latestFinish].filter(Boolean) as string[];
  });
  const originMs = Math.min(...allDates.map((d) => new Date(d).getTime()));
  const maxOffset = Math.max(...allDates.map((d) => toDayOffset(d, originMs))) + 2;
  const chartWidth = maxOffset * PX_PER_DAY;

  // Sort: critical activities first (grouped visually), then by earliest start.
  const rows = [...activities].sort((a, b) => {
    const na = cpm.get(a.id)!;
    const nb = cpm.get(b.id)!;
    if (na.isCritical !== nb.isCritical) return na.isCritical ? -1 : 1;
    return na.earliestStart.localeCompare(nb.earliestStart);
  });

  const criticalCount = rows.filter((a) => cpm.get(a.id)!.isCritical).length;
  const totalFloatDays = rows.reduce((s, a) => s + Math.max(0, cpm.get(a.id)!.floatDays), 0);

  return (
    <Shell active="/impact" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Critical Path</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        Computed deterministically from the current schedule graph — forward pass (earliest start/finish) then backward pass (latest start/finish, float).
        {" "}<strong>{criticalCount}</strong> of {rows.length} activities are on the critical path (zero float).
      </p>

      <div style={{ display: "flex", gap: 20, marginBottom: 16, fontSize: 12 }}>
        <Legend swatch="var(--danger)" label="Critical (zero float)" />
        <Legend swatch="var(--accent)" label="Has float" />
        <Legend swatch="var(--border-strong)" label="Baseline (planned)" outline />
        <span style={{ color: "var(--muted)" }}>Total slack in schedule: <strong>{totalFloatDays}</strong> activity-days</span>
      </div>

      <div className="p2r-card" style={{ padding: 0, overflowX: "auto" }}>
        <svg width={LABEL_W + chartWidth + 40} height={rows.length * ROW_H + 30} role="img" aria-label="Critical path timeline">
          <text x={LABEL_W + 8} y={16} fontSize={10} fill="var(--muted)" fontFamily="var(--font-mono)">
            baseline → forecast (day offset from {new Date(originMs).toISOString().slice(0, 10)})
          </text>
          {rows.map((a, i) => {
            const node = cpm.get(a.id)!;
            const y = 24 + i * ROW_H;
            const baselineX1 = toDayOffset(a.planned_start || node.earliestStart, originMs) * PX_PER_DAY;
            const baselineX2 = toDayOffset(a.planned_finish || node.earliestFinish, originMs) * PX_PER_DAY;
            const fcX1 = toDayOffset(node.earliestStart, originMs) * PX_PER_DAY;
            const fcX2 = toDayOffset(node.earliestFinish, originMs) * PX_PER_DAY;
            const floatX2 = toDayOffset(node.latestFinish, originMs) * PX_PER_DAY;
            const color = node.isCritical ? "var(--danger)" : "var(--accent)";
            return (
              <g key={a.id} transform={`translate(0, ${y})`}>
                <title>
                  {a.activity_id} — {a.description}
                  {"\n"}Earliest: {node.earliestStart} → {node.earliestFinish}
                  {"\n"}Latest: {node.latestStart} → {node.latestFinish}
                  {"\n"}Float: {node.floatDays} day(s) — {node.isCritical ? "CRITICAL" : "has slack"}
                </title>
                <text x={0} y={ROW_H / 2} dy={4} fontSize={11} fontFamily="var(--font-mono)" fill={node.isCritical ? "var(--danger)" : "var(--text)"}>
                  {a.activity_id.length > 22 ? a.activity_id.slice(0, 21) + "…" : a.activity_id}
                </text>
                {/* baseline (planned) — thin outline */}
                <rect
                  x={LABEL_W + baselineX1}
                  y={ROW_H / 2 - 3}
                  width={Math.max(2, baselineX2 - baselineX1)}
                  height={6}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth={1}
                  rx={2}
                />
                {/* float extension to latest finish */}
                {floatX2 > fcX2 && (
                  <rect x={LABEL_W + fcX2} y={ROW_H / 2 - 1} width={floatX2 - fcX2} height={2} fill="var(--muted-2)" />
                )}
                {/* earliest start/finish — the real forecast bar */}
                <rect
                  x={LABEL_W + fcX1}
                  y={ROW_H / 2 - 5}
                  width={Math.max(3, fcX2 - fcX1)}
                  height={10}
                  fill={color}
                  rx={2}
                  opacity={0.9}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--muted)" }}>
        Hover a bar for exact dates and float. Full identity, dependencies and evidence for any activity: open{" "}
        <Link href="/activities" className="p2r-link">Activity Register</Link>.
      </div>
    </Shell>
  );
}

function Legend({ swatch, label, outline }: { swatch: string; label: string; outline?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
      <span
        style={{
          width: 14, height: 8, borderRadius: 2,
          background: outline ? "transparent" : swatch,
          border: outline ? `1.5px solid ${swatch}` : "none",
        }}
      />
      {label}
    </span>
  );
}
