import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useActivities } from "@/lib/data";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({
    meta: [
      { title: "Activity Register. Plan2Reality" },
      { name: "description", content: "The full schedule register with search, discipline grouping and a critical only filter." },
      { property: "og:title", content: "Activity Register. Plan2Reality" },
      { property: "og:description", content: "Every scheduled activity, grouped and searchable." },
    ],
  }),
  component: Activities,
});

function Activities() {
  const activities = useActivities();
  const [q, setQ] = useState("");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [discipline, setDiscipline] = useState("ALL");

  const rows = activities.data ?? [];
  const disciplines = useMemo(
    () => Array.from(new Set(rows.map((r) => r.discipline))).sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (criticalOnly && !r.is_critical) return false;
    if (discipline !== "ALL" && r.discipline !== discipline) return false;
    if (!q) return true;
    const hay = `${r.activity_id} ${r.description} ${r.wbs} ${r.location ?? ""} ${r.engineering_tag ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const grouped = new Map<string, typeof filtered>();
  for (const r of filtered) {
    const list = grouped.get(r.discipline) ?? [];
    list.push(r);
    grouped.set(r.discipline, list);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Activity register"
        description="The imported schedule as it stands. Progress values shown here only change through a reviewed match."
      />

      <Panel className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ID, description, WBS, tag or location"
          className="min-w-64 flex-1 rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="ALL">All disciplines</option>
          {disciplines.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => setCriticalOnly(e.target.checked)}
          />
          Critical only
        </label>
      </Panel>

      {activities.isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-panel-2" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No activities match this filter" body="Widen the search or clear the critical only filter." />
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([disc, list]) => (
            <Panel key={disc}>
              <h2 className="eyebrow mb-3">
                {disc} . {list.length} activities
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-strong text-left">
                      <th className="eyebrow py-2">ID</th>
                      <th className="eyebrow py-2">Description</th>
                      <th className="eyebrow py-2">WBS</th>
                      <th className="eyebrow py-2">Location</th>
                      <th className="eyebrow py-2">Progress</th>
                      <th className="eyebrow py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="py-2 font-mono text-xs">
                          <Link to="/activity/$id" params={{ id: r.id }} className="text-primary hover:underline">
                            {r.activity_id}
                          </Link>
                        </td>
                        <td className="py-2">
                          {r.description}
                          {r.is_critical ? (
                            <span className="ml-2 rounded border border-danger/40 px-1 font-mono text-[10px] text-danger">
                              CRITICAL
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 font-mono text-xs text-muted-foreground">{r.wbs}</td>
                        <td className="py-2 text-text-soft">{r.location ?? "Not recorded"}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-panel-2">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(100, Math.max(0, r.progress ?? 0))}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs">{r.progress ?? 0}%</span>
                          </div>
                        </td>
                        <td className="py-2">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
