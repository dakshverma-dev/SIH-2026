import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useActivities } from "@/lib/data";
import { computeCpm } from "@/lib/domain/cpm";
import { EmptyState, PageHeader, Panel } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/critical-path")({
  head: () => ({
    meta: [
      { title: "Critical Path. Plan2Reality" },
      { name: "description", content: "A deterministic forward and backward pass over the schedule. No model writes a date here." },
      { property: "og:title", content: "Critical Path. Plan2Reality" },
      { property: "og:description", content: "Float, criticality and variance computed in code, not inferred." },
    ],
  }),
  component: CriticalPath,
});

function CriticalPath() {
  const activities = useActivities();
  const rows = activities.data ?? [];
  const cpm = computeCpm(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = [...cpm].sort((a, b) => a.earliest_start.localeCompare(b.earliest_start));
  const critical = ordered.filter((c) => c.is_critical);

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Critical path"
        description="Computed by the same pure function the tests cover. If the logic contains a cycle, planned dates are returned unchanged rather than a guess."
      />

      {activities.isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-panel-2" />
      ) : rows.length === 0 ? (
        <EmptyState title="No schedule to analyse" body="The critical path needs activities and logic links before it can say anything useful." />
      ) : (
        <div className="space-y-5">
          <Panel>
            <h2 className="font-serif text-xl">
              {critical.length} of {ordered.length} activities carry zero float
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Float is measured in days against the latest allowable finish of the whole network.
            </p>
          </Panel>

          <Panel>
            <div className="space-y-1.5">
              {ordered.map((c, i) => {
                const a = byId.get(c.id);
                if (!a) return null;
                const span = Math.max(1, a.duration_days);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scaleX: 0.96 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.6) }}
                    style={{ transformOrigin: "left" }}
                    className="flex items-center gap-3"
                  >
                    <Link
                      to="/activity/$id"
                      params={{ id: c.id }}
                      className="w-28 shrink-0 font-mono text-xs text-primary hover:underline"
                    >
                      {a.activity_id}
                    </Link>
                    <div
                      className={
                        c.is_critical
                          ? "h-6 rounded-sm border border-danger bg-danger-soft"
                          : "h-6 rounded-sm border border-border-strong bg-panel-2"
                      }
                      style={{ width: `${Math.min(60, span * 1.6)}%` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-soft">{a.description}</span>
                    <span className="w-24 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {c.float_days} d float
                    </span>
                    <span
                      className={
                        c.variance_days > 0
                          ? "w-20 shrink-0 text-right font-mono text-xs text-danger"
                          : "w-20 shrink-0 text-right font-mono text-xs text-muted-2"
                      }
                    >
                      {c.variance_days > 0 ? `+${c.variance_days} d` : "on plan"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
