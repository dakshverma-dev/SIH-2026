import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useActivities, useConflicts, useMatches } from "@/lib/data";
import { EmptyState, PageHeader, Panel } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics. Plan2Reality" },
      { name: "description", content: "Counts drawn only from rows that exist. No benchmarks, no invented baselines." },
      { property: "og:title", content: "Analytics. Plan2Reality" },
      { property: "og:description", content: "Trust distribution, discipline progress and contradiction counts." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const activities = useActivities();
  const matches = useMatches();
  const conflicts = useConflicts();

  const rows = activities.data ?? [];
  const matchRows = matches.data ?? [];

  const trustCounts = ["HIGH", "MEDIUM", "LOW", "UNMATCHED"].map((level) => ({
    name: level,
    value: matchRows.filter((m) => m.trust_level === level).length,
  }));

  const byDiscipline = new Map<string, { total: number; sum: number }>();
  for (const r of rows) {
    const entry = byDiscipline.get(r.discipline) ?? { total: 0, sum: 0 };
    entry.total += 1;
    entry.sum += r.progress ?? 0;
    byDiscipline.set(r.discipline, entry);
  }
  const disciplineData = Array.from(byDiscipline.entries()).map(([name, v]) => ({
    name,
    progress: Math.round(v.sum / Math.max(1, v.total)),
  }));

  const trustColors: Record<string, string> = {
    HIGH: "var(--moss)",
    MEDIUM: "var(--warn)",
    LOW: "var(--danger)",
    UNMATCHED: "var(--muted)",
  };

  const openConflicts = (conflicts.data ?? []).filter((c) => c.status === "OPEN").length;

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Analytics"
        description="Every figure here counts real rows. Where there is nothing to count, the panel says so instead of drawing a chart."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-serif text-xl">Trust distribution</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {matchRows.length} matches on record, {openConflicts} open contradictions.
          </p>
          {matchRows.length === 0 ? (
            <EmptyState
              title="No matches to distribute"
              body="Process a field update and this chart will describe the confidence spread."
              actionLabel="Go to field updates"
              actionTo="/field-updates"
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trustCounts}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {trustCounts.map((t) => (
                      <Cell key={t.name} fill={trustColors[t.name] ?? "var(--muted)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Average progress by discipline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Simple mean of reported progress across {rows.length} activities. Not weighted by quantity.
          </p>
          {disciplineData.length === 0 ? (
            <EmptyState title="No schedule loaded" body="Load a schedule to see discipline level progress." />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disciplineData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--muted)"
                    fontSize={11}
                    width={110}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="progress" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
