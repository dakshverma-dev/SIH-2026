import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Panel } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/execution-memory")({
  head: () => ({
    meta: [
      { title: "Execution Memory. Plan2Reality" },
      { name: "description", content: "What this kind of work actually took last time, and what recovered it." },
      { property: "og:title", content: "Execution Memory. Plan2Reality" },
      { property: "og:description", content: "Historic durations, delay causes and recovery actions." },
    ],
  }),
  component: ExecutionMemory,
});

function ExecutionMemory() {
  const [q, setQ] = useState("");
  const memory = useQuery({
    queryKey: ["execution-memory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execution_memory")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (memory.data ?? []).filter((r) => {
    if (!q) return true;
    const hay = `${r.activity_type} ${r.contractor ?? ""} ${r.delay_cause ?? ""} ${r.recovery_action ?? ""} ${r.outcome ?? ""}`;
    return hay.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Execution memory"
        description="A record of how comparable work behaved before. It informs a judgement, it does not make one."
      />

      <Panel className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search activity type, contractor, delay cause or recovery action"
          className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </Panel>

      {memory.isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-panel-2" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No execution history matches"
          body="Either nothing has been recorded yet, or the search is too narrow."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const over =
              r.actual_duration !== null && r.planned_duration !== null
                ? r.actual_duration - r.planned_duration
                : null;
            return (
              <Panel key={r.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg">{r.activity_type}</h3>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {r.contractor ?? "Contractor not recorded"}
                    </p>
                  </div>
                  {over === null ? (
                    <span className="rounded-md border border-border-strong px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      duration unknown
                    </span>
                  ) : (
                    <span
                      className={
                        over > 0
                          ? "rounded-md border border-danger/30 bg-danger-soft px-2 py-0.5 font-mono text-[11px] text-danger"
                          : "rounded-md border border-moss/30 bg-moss-soft px-2 py-0.5 font-mono text-[11px] text-moss"
                      }
                    >
                      {over > 0 ? `+${over} d over plan` : `${Math.abs(over)} d under plan`}
                    </span>
                  )}
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Planned</dt>
                    <dd className="font-mono">{r.planned_duration ?? "unknown"} d</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Actual</dt>
                    <dd className="font-mono">{r.actual_duration ?? "unknown"} d</dd>
                  </div>
                </dl>
                {r.delay_cause ? (
                  <p className="mt-3 text-sm">
                    <span className="eyebrow">Delay cause</span>
                    <br />
                    {r.delay_cause}
                  </p>
                ) : null}
                {r.recovery_action ? (
                  <p className="mt-3 text-sm">
                    <span className="eyebrow">Recovery action</span>
                    <br />
                    {r.recovery_action}
                  </p>
                ) : null}
                {r.outcome ? (
                  <p className="mt-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text-soft">
                    {r.outcome}
                  </p>
                ) : null}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
