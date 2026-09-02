import { createFileRoute, Link } from "@tanstack/react-router";
import { useActivities } from "@/lib/data";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule. Plan2Reality" },
      { name: "description", content: "The flat schedule view with planned dates and reported progress side by side." },
      { property: "og:title", content: "Schedule. Plan2Reality" },
      { property: "og:description", content: "Planned dates against reported progress, in one table." },
    ],
  }),
  component: Schedule,
});

function Schedule() {
  const activities = useActivities();
  const rows = [...(activities.data ?? [])].sort((a, b) =>
    a.planned_start.localeCompare(b.planned_start),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Schedule"
        description="Sorted by planned start. Slip is planned finish against the current reported position, not a forecast."
      />
      {activities.isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-panel-2" />
      ) : rows.length === 0 ? (
        <EmptyState title="No schedule loaded" body="Import or seed a schedule before the matching layer has anything to match against." />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-strong text-left">
                  <th className="eyebrow py-2">ID</th>
                  <th className="eyebrow py-2">Activity</th>
                  <th className="eyebrow py-2">Start</th>
                  <th className="eyebrow py-2">Finish</th>
                  <th className="eyebrow py-2">Days</th>
                  <th className="eyebrow py-2">Progress</th>
                  <th className="eyebrow py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                    <td className="py-2 font-mono text-xs">{r.actual_start ?? r.planned_start}</td>
                    <td className="py-2 font-mono text-xs">{r.actual_finish ?? r.planned_finish}</td>
                    <td className="py-2 font-mono text-xs">{r.duration_days}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel-2">
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
      )}
    </div>
  );
}
