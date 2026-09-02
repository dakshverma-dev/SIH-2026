import { createFileRoute } from "@tanstack/react-router";
import { useActivities, useImpacts } from "@/lib/data";
import { computeCpm } from "@/lib/domain/cpm";
import { EmptyState, PageHeader, Panel } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/impact")({
  head: () => ({
    meta: [
      { title: "Schedule Impact. Plan2Reality" },
      { name: "description", content: "Recorded impacts alongside the live deterministic variance for every activity." },
      { property: "og:title", content: "Schedule Impact. Plan2Reality" },
      { property: "og:description", content: "What reported reality does to the finish dates." },
    ],
  }),
  component: Impact,
});

function Impact() {
  const impacts = useImpacts();
  const activities = useActivities();
  const rows = activities.data ?? [];
  const cpm = computeCpm(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const slipping = cpm.filter((c) => c.variance_days > 0).sort((a, b) => b.variance_days - a.variance_days);

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Schedule impact"
        description="The left column is computed live from the current schedule. The right column is the persisted impact log."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-serif text-xl">Live variance</h2>
          {activities.isLoading ? (
            <div className="mt-3 h-40 animate-pulse rounded-md bg-panel-2" />
          ) : slipping.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No activity currently forecasts a finish later than its planned finish.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {slipping.map((c) => {
                const a = byId.get(c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{a?.activity_id}</p>
                      <p className="truncate text-sm text-text-soft">{a?.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm text-danger">+{c.variance_days} d</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {c.is_critical ? "critical" : `${c.float_days} d float`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Recorded impacts</h2>
          {impacts.isLoading ? (
            <div className="mt-3 h-40 animate-pulse rounded-md bg-panel-2" />
          ) : (impacts.data ?? []).length === 0 ? (
            <EmptyState
              title="No impact has been written to the log"
              body="An impact record is only created when an approved match moves a date. Reviewing a match is what puts entries here."
            />
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {(impacts.data ?? []).map((i) => {
                const a = i.schedule_activities as { activity_id?: string; description?: string } | null;
                return (
                  <li key={i.id} className="py-3">
                    <p className="font-mono text-xs">{a?.activity_id ?? "Project level"}</p>
                    <p className="text-sm text-text-soft">{a?.description}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      baseline {i.baseline_finish ?? "unknown"} to forecast {i.forecast_finish ?? "unknown"} .{" "}
                      {i.variance_days} d .{" "}
                      {i.critical_path_changed ? "critical path changed" : "critical path unchanged"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
