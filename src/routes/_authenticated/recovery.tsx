import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useActivities } from "@/lib/data";
import { computeCpm, fromDay, toDay } from "@/lib/domain/cpm";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_ID } from "@/lib/pipeline";
import { Btn, EmptyState, PageHeader, Panel, RoleGate } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/recovery")({
  head: () => ({
    meta: [
      { title: "Recovery. Plan2Reality" },
      { name: "description", content: "Three transparent, rule based recovery options with their stated assumptions." },
      { property: "og:title", content: "Recovery. Plan2Reality" },
      { property: "og:description", content: "Options for pulling a slipping activity back, with the arithmetic shown." },
    ],
  }),
  component: Recovery,
});

interface Scenario {
  option_key: string;
  label: string;
  rule: string;
  recovery_days: number;
  effort: string;
  risk_level: string;
  projected_finish: string;
}

function buildScenarios(slip: number, duration: number, plannedFinish: string): Scenario[] {
  const shifts = Math.min(slip, Math.round(duration * 0.3));
  const resequence = Math.min(slip, Math.round(duration * 0.15));
  const crew = Math.min(slip, Math.round(duration * 0.5));
  const finish = (recovered: number) => fromDay(toDay(plannedFinish) + Math.max(0, slip - recovered));
  return [
    {
      option_key: "EXTEND_SHIFTS",
      label: "Extend shifts on the affected crew",
      rule: "Recovers up to 30 percent of the remaining duration, capped by the slip itself.",
      recovery_days: shifts,
      effort: "Low",
      risk_level: "Fatigue and quality risk after two weeks",
      projected_finish: finish(shifts),
    },
    {
      option_key: "RESEQUENCE",
      label: "Resequence downstream work",
      rule: "Recovers up to 15 percent of the remaining duration, capped by the slip itself.",
      recovery_days: resequence,
      effort: "Medium",
      risk_level: "Requires successor float that may not exist",
      projected_finish: finish(resequence),
    },
    {
      option_key: "ADD_CREW",
      label: "Add a second crew",
      rule: "Recovers up to 50 percent of the remaining duration, capped by the slip itself.",
      recovery_days: crew,
      effort: "High",
      risk_level: "Cost and congestion at the work face",
      projected_finish: finish(crew),
    },
  ];
}

function Recovery() {
  const { can, user, name } = useAuth();
  const activities = useActivities();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const saved = useQuery({
    queryKey: ["recovery-scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_scenarios")
        .select("*, schedule_activities:activity_id(activity_id, description)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!can("recovery")) {
    return (
      <div>
        <PageHeader eyebrow="Intelligence" title="Recovery" />
        <RoleGate allowed={false} feature="Recovery planning">
          <span />
        </RoleGate>
      </div>
    );
  }

  const rows = activities.data ?? [];
  const cpm = computeCpm(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const slipping = cpm.filter((c) => c.variance_days > 0).sort((a, b) => b.variance_days - a.variance_days);
  const target = slipping.find((s) => s.id === selected) ?? slipping[0];
  const targetActivity = target ? byId.get(target.id) : undefined;
  const scenarios =
    target && targetActivity
      ? buildScenarios(target.variance_days, targetActivity.duration_days, targetActivity.planned_finish)
      : [];

  const persist = async (s: Scenario) => {
    if (!target) return;
    await supabase.from("recovery_scenarios").insert({
      project_id: PROJECT_ID,
      activity_id: target.id,
      option_key: s.option_key,
      label: s.label,
      recovery_days: s.recovery_days,
      effort: s.effort,
      risk_level: s.risk_level,
      projected_finish: s.projected_finish,
    });
    await supabase.from("audit_events").insert({
      project_id: PROJECT_ID,
      actor: name || user?.email || "Unknown",
      actor_id: user?.id ?? null,
      action: "SAVE_RECOVERY_SCENARIO",
      entity_type: "recovery_scenario",
      entity_id: target.id,
      after_json: { option: s.option_key, recovery_days: s.recovery_days },
      source: "deterministic_rules",
      reason: s.rule,
    });
    await qc.invalidateQueries({ queryKey: ["recovery-scenarios"] });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Recovery"
        description="Every number below comes from a stated rule applied to the current slip. These are options to argue about, not predictions."
      />

      {activities.isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-panel-2" />
      ) : slipping.length === 0 ? (
        <EmptyState
          title="Nothing is slipping"
          body="No activity currently forecasts later than its planned finish, so there is nothing to recover."
        />
      ) : (
        <div className="space-y-5">
          <Panel>
            <label className="eyebrow mb-2 block" htmlFor="target">
              Slipping activity
            </label>
            <select
              id="target"
              value={target?.id ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {slipping.map((s) => {
                const a = byId.get(s.id);
                return (
                  <option key={s.id} value={s.id}>
                    {a?.activity_id} . {a?.description} . {s.variance_days} d late
                  </option>
                );
              })}
            </select>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-3">
            {scenarios.map((s) => (
              <Panel key={s.option_key} className="flex flex-col">
                <h3 className="font-serif text-lg">{s.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.rule}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Days recovered</dt>
                    <dd className="font-mono">{s.recovery_days}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Projected finish</dt>
                    <dd className="font-mono">{s.projected_finish}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Effort</dt>
                    <dd>{s.effort}</dd>
                  </div>
                </dl>
                <p className="mt-3 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
                  {s.risk_level}
                </p>
                <div className="mt-auto pt-4">
                  <Btn onClick={() => void persist(s)} className="w-full">
                    Record this option
                  </Btn>
                </div>
              </Panel>
            ))}
          </div>

          <Panel>
            <h2 className="font-serif text-xl">Recorded options</h2>
            {(saved.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No recovery option has been recorded yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(saved.data ?? []).map((r) => {
                  const a = r.schedule_activities as { activity_id?: string } | null;
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span>
                        <span className="font-mono text-xs">{a?.activity_id ?? "unknown"}</span> . {r.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.recovery_days} d . finish {r.projected_finish ?? "unknown"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
