import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useActivities, useConflicts, useMatches, useReports } from "@/lib/data";
import { Btn, EmptyState, PageHeader, Panel, StatusBadge, TrustBadge } from "@/components/kit";
import { processReport } from "@/lib/pipeline";
import { computeCpm } from "@/lib/domain/cpm";
import type { TrustLevel } from "@/lib/domain/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center. Plan2Reality" },
      { name: "description", content: "Role specific view of field capture, match trust, schedule variance and open conflicts." },
      { property: "og:title", content: "Command Center. Plan2Reality" },
      { property: "og:description", content: "Field capture, match trust and schedule variance in one view." },
    ],
  }),
  component: Dashboard,
});

function Counter({ value, suffix }: { value: number; suffix?: string | undefined }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    let frame = 0;
    const steps = 24;
    const id = setInterval(() => {
      frame += 1;
      setShown(Math.round((value * frame) / steps));
      if (frame >= steps) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [value, reduced]);
  return (
    <span className="font-serif text-4xl text-foreground">
      {shown}
      {suffix}
    </span>
  );
}

function Kpi({ label, value, suffix, source }: { label: string; value: number; suffix?: string | undefined; source: string }) {
  return (
    <Panel>
      <p className="eyebrow">{label}</p>
      <div className="mt-2">
        <Counter value={value} suffix={suffix} />
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">{source}</p>
    </Panel>
  );
}

function Dashboard() {
  const { role, can, name, user } = useAuth();
  const qc = useQueryClient();
  const activities = useActivities();
  const matches = useMatches();
  const reports = useReports();
  const conflicts = useConflicts();
  const [running, setRunning] = useState(false);

  const acts = activities.data ?? [];
  const cpm = computeCpm(
    acts.map((a) => ({
      id: a.id,
      planned_start: a.planned_start,
      planned_finish: a.planned_finish,
      actual_start: a.actual_start,
      actual_finish: a.actual_finish,
      progress: a.progress,
      duration_days: a.duration_days,
      predecessor_id: a.predecessor_id,
      status: a.status,
    })),
  );
  const slipped = cpm.filter((c) => c.variance_days > 0);
  const worstSlip = slipped.reduce((m, c) => Math.max(m, c.variance_days), 0);
  const pending = (matches.data ?? []).filter((m) => m.status === "PENDING");
  const openConflicts = (conflicts.data ?? []).filter((c) => c.status === "OPEN");
  const unprocessed = (reports.data ?? []).filter((r) => r.status === "PENDING");
  const avgProgress = acts.length
    ? Math.round(acts.reduce((s, a) => s + a.progress, 0) / acts.length)
    : 0;

  const runPipeline = async () => {
    setRunning(true);
    try {
      for (const report of unprocessed) {
        await processReport(report.id, { id: user?.id ?? null, name: name || "Unknown" });
      }
      await qc.invalidateQueries();
    } finally {
      setRunning(false);
    }
  };

  const loading = activities.isLoading || matches.isLoading;

  return (
    <div>
      <PageHeader
        eyebrow={`Command center. ${role ?? ""}`}
        title={roleTitle(role)}
        description={roleIntro(role)}
        actions={
          can("field-updates:create") && unprocessed.length > 0 ? (
            <Btn onClick={() => void runPipeline()} disabled={running}>
              {running ? "Processing" : `Run pipeline on ${unprocessed.length} pending reports`}
            </Btn>
          ) : null
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel h-32 animate-pulse bg-panel-2" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {role === "VIEWER" || role === "PROJECT_MANAGER" || role === "ADMIN" ? (
            <>
              <Kpi label="Average progress" value={avgProgress} suffix="%" source={`${acts.length} activities`} />
              <Kpi label="Activities slipping" value={slipped.length} source="Forward pass variance" />
              <Kpi label="Worst slip" value={worstSlip} suffix=" d" source="Against planned finish" />
              <Kpi label="Open conflicts" value={openConflicts.length} source="Contradiction records" />
            </>
          ) : role === "SUPERVISOR" ? (
            <>
              <Kpi label="Reports submitted" value={(reports.data ?? []).length} source="All field reports" />
              <Kpi label="Awaiting processing" value={unprocessed.length} source="Status PENDING" />
              <Kpi label="Activities in progress" value={acts.filter((a) => a.status === "IN_PROGRESS").length} source="Schedule status" />
              <Kpi label="Average progress" value={avgProgress} suffix="%" source={`${acts.length} activities`} />
            </>
          ) : (
            <>
              <Kpi label="Awaiting review" value={pending.length} source="Match status PENDING" />
              <Kpi label="Unmatched events" value={(matches.data ?? []).filter((m) => m.trust_level === "UNMATCHED").length} source="No credible counterpart" />
              <Kpi label="Open conflicts" value={openConflicts.length} source="Contradiction records" />
              <Kpi label="Activities slipping" value={slipped.length} source="Forward pass variance" />
            </>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">
              {role === "SUPERVISOR" ? "Your submission history" : "Latest matches"}
            </h2>
            {can("review") ? (
              <Link to="/review" className="text-sm text-primary hover:underline">
                Review queue
              </Link>
            ) : null}
          </div>
          {role === "SUPERVISOR" ? (
            (reports.data ?? []).length === 0 ? (
              <EmptyState
                title="No field updates yet"
                body="Submit one to start the golden path from field language to schedule truth."
                actionLabel="Submit a field update"
                actionTo="/field-updates"
              />
            ) : (
              <ul className="space-y-2">
                {(reports.data ?? []).slice(0, 6).map((r) => (
                  <li key={r.id} className="panel-recessed flex items-start justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{r.raw_text}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {r.report_date} . {r.contractor ?? "No contractor"}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )
          ) : (matches.data ?? []).length === 0 ? (
            <EmptyState
              title="Nothing has been matched yet"
              body="Seeded field reports are waiting. Run the pipeline to extract events and score them against the schedule."
              actionLabel={can("field-updates:create") ? "Go to field updates" : undefined}
              actionTo={can("field-updates:create") ? "/field-updates" : undefined}
            />
          ) : (
            <ul className="space-y-2">
              {(matches.data ?? []).slice(0, 6).map((m) => (
                <li key={m.id} className="panel-recessed flex items-start justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {(m.field_events as { activity_description?: string } | null)?.activity_description ?? "No description"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {(m.schedule_activities as { activity_id?: string } | null)?.activity_id ?? "No counterpart"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <TrustBadge level={m.trust_level as TrustLevel} score={Number(m.confidence)} />
                    <Link to="/evidence/$matchId" params={{ matchId: m.id }} className="text-xs text-primary hover:underline">
                      Evidence
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 font-serif text-xl">
            {role === "VIEWER" ? "Read only summary" : "Quick actions"}
          </h2>
          {role === "VIEWER" ? (
            <div className="space-y-3 text-sm text-text-soft">
              <p>
                You have view access. Every write control in this product is blocked for your role
                in the database, so nothing here can be changed by accident.
              </p>
              <ul className="space-y-1.5 font-mono text-xs text-muted-foreground">
                <li>Activities tracked: {acts.length}</li>
                <li>Critical activities: {acts.filter((a) => a.is_critical).length}</li>
                <li>Field reports on record: {(reports.data ?? []).length}</li>
                <li>Open conflicts: {openConflicts.length}</li>
              </ul>
            </div>
          ) : (
            <div className="grid gap-2">
              {quickActions(can).map((a) => (
                <motion.div key={a.to} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  <Link
                    to={a.to}
                    className="block rounded-md border border-border bg-panel-2 px-4 py-3 transition-colors hover:bg-panel"
                  >
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.body}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function roleTitle(role: string | null) {
  switch (role) {
    case "PROJECT_MANAGER":
    case "ADMIN":
      return "Executive variance view";
    case "PLANNER":
      return "Operational console";
    case "SUPERVISOR":
      return "Field submission view";
    default:
      return "Project summary";
  }
}

function roleIntro(role: string | null) {
  switch (role) {
    case "PROJECT_MANAGER":
    case "ADMIN":
      return "Where the schedule is moving away from plan, and what the field said that caused it.";
    case "PLANNER":
      return "Everything waiting on a human decision: uncertain matches, contradictions and slippage.";
    case "SUPERVISOR":
      return "Submit what happened on site. The system will show you what it did with it.";
    default:
      return "A read only view of project progress and data quality.";
  }
}

function quickActions(can: (p: string) => boolean) {
  const all = [
    { to: "/field-updates", label: "Submit a field update", body: "Raw shift language, processed into a structured event.", perm: "field-updates:create" },
    { to: "/review", label: "Work the review queue", body: "Lowest confidence first, then contradiction severity.", perm: "review" },
    { to: "/conflicts", label: "Resolve conflicts", body: "Field and schedule disagree on progress or status.", perm: "conflicts:resolve" },
    { to: "/recovery", label: "Run recovery scenarios", body: "Transparent rule based options against the current forecast.", perm: "recovery:run" },
    { to: "/critical-path", label: "Inspect the critical path", body: "Baseline against forecast, computed by deterministic CPM.", perm: "view" },
    { to: "/site-3d", label: "Open the 3D site view", body: "Every block is a real schedule activity.", perm: "view" },
  ];
  return all.filter((a) => can(a.perm));
}
