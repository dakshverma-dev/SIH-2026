import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Field, PageHeader, Panel, StatusBadge, TrustBadge } from "@/components/kit";
import type { TrustLevel } from "@/lib/domain/types";

export const Route = createFileRoute("/_authenticated/activity/$id")({
  head: () => ({
    meta: [
      { title: "Activity detail. Plan2Reality" },
      { name: "description", content: "Dates, logic, progress and every field event linked to this activity." },
      { property: "og:title", content: "Activity detail. Plan2Reality" },
      { property: "og:description", content: "One schedule activity and everything the field said about it." },
    ],
  }),
  component: ActivityDetail,
  errorComponent: ({ error }) => (
    <div className="panel p-6" role="alert">
      <h2 className="font-serif text-xl">This activity could not be loaded</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="panel p-6">That activity does not exist.</div>,
});

function ActivityDetail() {
  const { id } = Route.useParams();
  const query = useQuery({
    queryKey: ["activity", id],
    queryFn: async () => {
      const { data: activity, error } = await supabase
        .from("schedule_activities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const [{ data: matches }, { data: conflicts }, { data: impacts }] = await Promise.all([
        supabase
          .from("activity_matches")
          .select("*, field_events(activity_description, evidence_span, progress)")
          .eq("best_activity_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("conflicts").select("*").eq("activity_id", id),
        supabase.from("schedule_impacts").select("*").eq("activity_id", id),
      ]);
      return { activity, matches: matches ?? [], conflicts: conflicts ?? [], impacts: impacts ?? [] };
    },
  });

  if (query.isLoading) return <div className="panel h-96 animate-pulse bg-panel-2" />;
  const a = query.data?.activity;
  if (!a) return <div className="panel p-6">That activity does not exist.</div>;

  return (
    <div>
      <PageHeader
        eyebrow={a.discipline}
        title={a.description}
        description={`${a.activity_id} . WBS ${a.wbs}`}
        actions={<StatusBadge status={a.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-serif text-xl">Schedule position</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Planned start" value={<span className="font-mono">{a.planned_start}</span>} />
            <Field label="Planned finish" value={<span className="font-mono">{a.planned_finish}</span>} />
            <Field label="Actual start" value={<span className="font-mono">{a.actual_start ?? "Not started"}</span>} />
            <Field label="Actual finish" value={<span className="font-mono">{a.actual_finish ?? "Not finished"}</span>} />
            <Field label="Duration" value={`${a.duration_days} days`} />
            <Field label="Critical" value={a.is_critical ? "Yes" : "No"} />
            <Field label="Progress" value={`${a.progress ?? 0}%`} />
            <Field label="Location" value={a.location ?? "Not recorded"} />
            <Field label="Engineering tag" value={a.engineering_tag ?? "None"} />
          </div>
          <div className="mt-4">
            <p className="eyebrow mb-1.5">Predecessor</p>
            <p className="font-mono text-xs text-text-soft">
              {a.predecessor_id ?? "None. This is a start node."}
            </p>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h2 className="font-serif text-xl">Linked field events</h2>
            {query.data?.matches.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing from the field has been linked to this activity yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {query.data?.matches.map((m) => {
                  const e = m.field_events as { activity_description?: string } | null;
                  return (
                    <li key={m.id} className="panel-recessed flex items-start justify-between gap-4 p-3">
                      <p className="min-w-0 text-sm">{e?.activity_description ?? "No description"}</p>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <TrustBadge level={m.trust_level as TrustLevel} score={Number(m.confidence)} />
                        <Link
                          to="/evidence/$matchId"
                          params={{ matchId: m.id }}
                          className="text-xs text-primary hover:underline"
                        >
                          Evidence
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <h2 className="font-serif text-xl">Conflicts and impacts</h2>
            {(query.data?.conflicts.length ?? 0) === 0 && (query.data?.impacts.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No contradictions and no recorded schedule impact for this activity.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {query.data?.conflicts.map((c) => (
                  <li key={c.id} className="panel-recessed p-3">
                    <p className="font-mono text-[11px] text-danger">{c.conflict_type}</p>
                    <p className="text-sm">{c.description}</p>
                  </li>
                ))}
                {query.data?.impacts.map((i) => (
                  <li key={i.id} className="panel-recessed p-3">
                    <p className="font-mono text-[11px] text-warn">SCHEDULE IMPACT</p>
                    <p className="text-sm">
                      {i.variance_days} days of variance.{" "}
                      {i.critical_path_changed ? "The critical path changed." : "The critical path did not change."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
