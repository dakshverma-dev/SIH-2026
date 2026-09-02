import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useAudit } from "@/lib/data";
import { EmptyState, PageHeader, Panel, RoleGate } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Ledger. Plan2Reality" },
      { name: "description", content: "Append only history of every automated and human decision on this project." },
      { property: "og:title", content: "Audit Ledger. Plan2Reality" },
      { property: "og:description", content: "Who or what decided, when, on what evidence." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { can } = useAuth();
  const audit = useAudit(300);
  const [q, setQ] = useState("");

  if (!can("audit")) {
    return (
      <div>
        <PageHeader eyebrow="Governance" title="Audit ledger" />
        <RoleGate allowed={false} feature="The audit ledger">
          <span />
        </RoleGate>
      </div>
    );
  }

  const rows = (audit.data ?? []).filter((r) => {
    if (!q) return true;
    const hay = `${r.action} ${r.entity_type} ${r.actor ?? ""} ${r.source ?? ""} ${r.reason ?? ""}`;
    return hay.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit ledger"
        description="Rows are inserted, never updated or deleted. The database enforces that, not this screen."
      />

      <Panel className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search action, actor, entity or reason"
          className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </Panel>

      {audit.isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-panel-2" />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing recorded yet" body="The ledger fills as soon as the pipeline or a reviewer acts." />
      ) : (
        <Panel>
          <ol className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {r.action}
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">{r.entity_type}</span>
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {r.actor ?? "system"} . source {r.source ?? "unspecified"}
                  {r.model ? ` . model ${r.model}` : ""}
                  {r.confidence !== null ? ` . confidence ${Number(r.confidence).toFixed(2)}` : ""}
                </p>
                {r.reason ? <p className="mt-1 text-sm text-text-soft">{r.reason}</p> : null}
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
