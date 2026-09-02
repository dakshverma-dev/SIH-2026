import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useConflicts, useMatches } from "@/lib/data";
import { EmptyState, PageHeader, Panel, RoleGate, TrustBadge } from "@/components/kit";
import type { TrustLevel } from "@/lib/domain/types";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review Queue. Plan2Reality" },
      { name: "description", content: "Uncertain matches sorted by lowest confidence first, then contradiction severity." },
      { property: "og:title", content: "Review Queue. Plan2Reality" },
      { property: "og:description", content: "Every match that needs a human decision, with its reasoning attached." },
    ],
  }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const { can } = useAuth();
  const matches = useMatches();
  const conflicts = useConflicts();

  if (!can("review")) {
    return (
      <div>
        <PageHeader eyebrow="Execution" title="Review queue" />
        <RoleGate allowed={false} feature="The review queue">
          <span />
        </RoleGate>
      </div>
    );
  }

  const conflictCount = new Map<string, number>();
  for (const c of conflicts.data ?? []) {
    if (!c.field_event_id) continue;
    conflictCount.set(c.field_event_id, (conflictCount.get(c.field_event_id) ?? 0) + 1);
  }

  const queue = (matches.data ?? [])
    .filter((m) => m.status === "PENDING")
    .sort((a, b) => {
      const byConfidence = Number(a.confidence) - Number(b.confidence);
      if (byConfidence !== 0) return byConfidence;
      return (conflictCount.get(b.field_event_id) ?? 0) - (conflictCount.get(a.field_event_id) ?? 0);
    });

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Review queue"
        description="Lowest confidence first, then contradiction severity. Nothing here has been posted to the schedule."
      />
      {matches.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-panel-2" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <EmptyState
          title="Nothing is waiting on a decision"
          body="Either no reports have been processed yet, or every match cleared the high confidence threshold on its own."
          actionLabel="Go to field updates"
          actionTo="/field-updates"
        />
      ) : (
        <ul className="space-y-2">
          {queue.map((m, i) => {
            const event = m.field_events as { activity_description?: string; evidence_span?: string } | null;
            const activity = m.schedule_activities as { activity_id?: string; description?: string } | null;
            const conflictsHere = conflictCount.get(m.field_event_id) ?? 0;
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              >
                <Panel className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{event?.activity_description ?? "No description"}</p>
                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                      {activity?.activity_id
                        ? `Proposed counterpart ${activity.activity_id}. ${activity.description}`
                        : "No credible schedule counterpart proposed."}
                    </p>
                    {conflictsHere > 0 ? (
                      <p className="mt-2 inline-block rounded-md border border-danger/30 bg-danger-soft px-2 py-0.5 font-mono text-[11px] text-danger">
                        {conflictsHere} contradiction{conflictsHere > 1 ? "s" : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <TrustBadge level={m.trust_level as TrustLevel} score={Number(m.confidence)} />
                    <Link
                      to="/evidence/$matchId"
                      params={{ matchId: m.id }}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Open evidence
                    </Link>
                  </div>
                </Panel>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
