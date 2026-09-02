import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useConflicts } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { Btn, EmptyState, PageHeader, Panel, RoleGate, StatusBadge } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/conflicts")({
  head: () => ({
    meta: [
      { title: "Conflict Center. Plan2Reality" },
      { name: "description", content: "Where the field and the schedule disagree, and what was decided about it." },
      { property: "og:title", content: "Conflict Center. Plan2Reality" },
      { property: "og:description", content: "Contradictions between reported reality and recorded schedule." },
    ],
  }),
  component: ConflictCenter,
});

function ConflictCenter() {
  const { can, user, name } = useAuth();
  const conflicts = useConflicts();
  const qc = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});

  if (!can("conflicts")) {
    return (
      <div>
        <PageHeader eyebrow="Execution" title="Conflict center" />
        <RoleGate allowed={false} feature="The conflict center">
          <span />
        </RoleGate>
      </div>
    );
  }

  const act = async (id: string, status: "RESOLVED" | "IGNORED", projectId: string) => {
    const { error } = await supabase
      .from("conflicts")
      .update({
        status,
        resolution_reason: reason[id] ?? null,
        resolved_by: user?.id ?? null,
      })
      .eq("id", id);
    if (error) return;
    await supabase.from("audit_events").insert({
      project_id: projectId,
      actor: name || user?.email || "Unknown",
      actor_id: user?.id ?? null,
      action: status === "RESOLVED" ? "RESOLVE_CONFLICT" : "IGNORE_CONFLICT",
      entity_type: "conflict",
      entity_id: id,
      after_json: { status },
      source: "human_review",
      reason: reason[id] ?? "No reason given.",
    });
    await qc.invalidateQueries();
  };

  const rows = conflicts.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Conflict center"
        description="A conflict is recorded when a field event and its schedule counterpart cannot both be true. Nothing is auto corrected."
      />
      {conflicts.isLoading ? (
        <div className="h-40 animate-pulse rounded-md bg-panel-2" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No contradictions on record"
          body="Either no reports have been processed, or every processed event agreed with the schedule it was matched to."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const a = c.schedule_activities as { activity_id?: string; description?: string } | null;
            return (
              <li key={c.id}>
                <Panel>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-danger">{c.conflict_type}</p>
                      <p className="mt-1 text-sm">{c.description}</p>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                        {a?.activity_id ?? "No activity"} . {a?.description ?? ""}
                      </p>
                      {c.resolution_reason ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reason recorded: {c.resolution_reason}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.status === "OPEN" && can("conflicts:resolve") ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <input
                        placeholder="Reason for the decision"
                        value={reason[c.id] ?? ""}
                        onChange={(e) => setReason({ ...reason, [c.id]: e.target.value })}
                        className="min-w-56 flex-1 rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <Btn onClick={() => void act(c.id, "RESOLVED", c.project_id)}>Resolve</Btn>
                      <Btn variant="ghost" onClick={() => void act(c.id, "IGNORED", c.project_id)}>
                        Ignore
                      </Btn>
                    </div>
                  ) : c.status === "OPEN" ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Your role can see this conflict but cannot close it.
                    </p>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
