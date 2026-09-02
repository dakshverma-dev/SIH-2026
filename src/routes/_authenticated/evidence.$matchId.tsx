import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { asBreakdown } from "@/lib/data";
import { Btn, Field, PageHeader, Panel, StatusBadge, TrustBadge } from "@/components/kit";
import type { ScoreSignal, TrustLevel } from "@/lib/domain/types";

export const Route = createFileRoute("/_authenticated/evidence/$matchId")({
  head: () => ({
    meta: [
      { title: "Evidence. Plan2Reality" },
      { name: "description", content: "The original field text, the signal by signal reasoning, the alternatives considered and the decision trail." },
      { property: "og:title", content: "Evidence. Plan2Reality" },
      { property: "og:description", content: "Why this field event was matched to this schedule activity, in full." },
    ],
  }),
  component: EvidenceView,
  errorComponent: ({ error }) => (
    <div className="panel p-6" role="alert">
      <h2 className="font-serif text-xl">This evidence view failed to load</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="panel p-6">That match does not exist.</div>,
});

function Highlighted({ text, span }: { text: string; span: string | null }) {
  if (!span || !text.includes(span)) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
  }
  const start = text.indexOf(span);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {text.slice(0, start)}
      <mark className="rounded bg-warn-soft px-1 py-0.5 text-foreground shadow-[inset_0_-2px_0_var(--warn)]">
        {span}
      </mark>
      {text.slice(start + span.length)}
    </p>
  );
}

function EvidenceView() {
  const { matchId } = Route.useParams();
  const { can, user, name } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["evidence", matchId],
    queryFn: async () => {
      const { data: match, error } = await supabase
        .from("activity_matches")
        .select("*, field_events(*, field_reports(*)), schedule_activities:best_activity_id(*)")
        .eq("id", matchId)
        .maybeSingle();
      if (error) throw error;
      if (!match) return null;
      const [{ data: candidates }, { data: conflicts }, { data: audit }] = await Promise.all([
        supabase
          .from("match_candidates")
          .select("*, schedule_activities:activity_id(activity_id, description, discipline)")
          .eq("field_event_id", match.field_event_id)
          .order("rank"),
        supabase.from("conflicts").select("*").eq("field_event_id", match.field_event_id),
        supabase
          .from("audit_events")
          .select("*")
          .in("entity_id", [match.id, match.field_event_id])
          .order("created_at"),
      ]);
      return { match, candidates: candidates ?? [], conflicts: conflicts ?? [], audit: audit ?? [] };
    },
  });

  const decide = async (status: "APPROVED" | "REJECTED") => {
    const match = query.data?.match;
    if (!match) return;
    const { error } = await supabase
      .from("activity_matches")
      .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", match.id);
    if (error) return;
    await supabase.from("audit_events").insert({
      project_id: match.project_id,
      actor: name || user?.email || "Unknown",
      actor_id: user?.id ?? null,
      action: status === "APPROVED" ? "APPROVE_MATCH" : "REJECT_MATCH",
      entity_type: "activity_match",
      entity_id: match.id,
      before_json: { status: match.status },
      after_json: { status },
      source: "human_review",
      confidence: Number(match.confidence),
      reason: "Reviewer decision recorded from the evidence view.",
    });
    await qc.invalidateQueries();
  };

  if (query.isLoading) return <div className="panel h-96 animate-pulse bg-panel-2" />;
  if (!query.data) return <div className="panel p-6">That match does not exist.</div>;

  const { match, candidates, conflicts, audit } = query.data;
  const event = match.field_events as unknown as {
    id: string;
    activity_description: string | null;
    evidence_span: string | null;
    extraction_mode: string;
    field_reports: { raw_text: string; report_date: string; author: string | null } | null;
  } | null;
  const activity = match.schedule_activities as unknown as {
    id: string;
    activity_id: string;
    description: string;
    wbs: string;
    discipline: string;
    location: string | null;
  } | null;
  const breakdown: ScoreSignal[] = asBreakdown(match.score_breakdown);
  const total = breakdown.reduce((s, b) => s + b.weight, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Evidence"
        title="Why this was matched"
        description="Every number on this page is derived from the signals below. Nothing here is a summary produced by a language model."
        actions={<TrustBadge level={match.trust_level as TrustLevel} score={Number(match.confidence)} />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel>
            <h2 className="font-serif text-xl">Original field report</h2>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {event?.field_reports?.report_date} . {event?.field_reports?.author ?? "Unknown author"}
            </p>
            <div className="mt-3 rounded-md border border-border bg-panel-2 p-4">
              <Highlighted
                text={event?.field_reports?.raw_text ?? "The source text is unavailable."}
                span={event?.evidence_span ?? null}
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Highlighted span is the verbatim evidence the extractor used.{" "}
              {event?.extraction_mode === "LLM" ? "Extraction mode REAL AI." : "Extraction mode DEMO FALLBACK, rule based."}
            </p>
          </Panel>

          <Panel>
            <h2 className="font-serif text-xl">Why we matched this</h2>
            <ul className="mt-4 divide-y divide-border">
              {breakdown.map((s, i) => (
                <motion.li
                  key={`${s.signal}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.07, 0.5) }}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-sm text-foreground">{s.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{s.signal}</p>
                  </div>
                  <span
                    className={
                      s.weight > 0
                        ? "font-mono text-sm text-moss"
                        : s.weight < 0
                          ? "font-mono text-sm text-danger"
                          : "font-mono text-sm text-muted-2"
                    }
                  >
                    {s.weight > 0 ? "+" : ""}
                    {s.weight.toFixed(2)}
                  </span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border-strong pt-3">
              <p className="text-sm font-medium">Sum, clamped to the range 0 to 1</p>
              <span className="font-mono text-base">
                {total.toFixed(2)} to {Number(match.confidence).toFixed(2)}
              </span>
            </div>
          </Panel>

          <Panel>
            <h2 className="font-serif text-xl">Alternative candidates considered</h2>
            {candidates.length <= 1 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No other activity scored above zero against this event.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {candidates.slice(1).map((c) => {
                  const a = c.schedule_activities as { activity_id?: string; description?: string } | null;
                  return (
                    <li key={c.id} className="panel-recessed flex items-center justify-between gap-4 p-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs">{a?.activity_id ?? "Unknown"}</p>
                        <p className="truncate text-sm text-text-soft">{a?.description}</p>
                      </div>
                      <span className="font-mono text-sm text-muted-foreground">
                        {Number(c.score).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="font-serif text-xl">Matched activity</h2>
            {activity ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Activity ID" value={<span className="font-mono">{activity.activity_id}</span>} />
                  <Field label="WBS" value={<span className="font-mono">{activity.wbs}</span>} />
                  <Field label="Discipline" value={activity.discipline} />
                  <Field label="Location" value={activity.location ?? "Not recorded"} />
                </div>
                <p className="text-sm">{activity.description}</p>
                <Link
                  to="/activity/$id"
                  params={{ id: activity.id }}
                  className="inline-block text-sm text-primary hover:underline"
                >
                  Open full activity detail
                </Link>
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-border-strong bg-panel-2 p-4">
                <p className="text-sm text-foreground">
                  No credible schedule counterpart. This event remains UNMATCHED and was never forced
                  onto an activity.
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <h2 className="font-serif text-xl">Contradictions</h2>
            {conflicts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No contradiction was detected between this event and the schedule.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {conflicts.map((c) => (
                  <li key={c.id} className="panel-recessed p-3">
                    <p className="font-mono text-[11px] text-danger">{c.conflict_type}</p>
                    <p className="mt-1 text-sm">{c.description}</p>
                    <div className="mt-2">
                      <StatusBadge status={c.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <h2 className="font-serif text-xl">Decision</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={match.best_activity_id ? match.status : "UNMATCHED"} />
              {match.reviewed_at ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Decided {new Date(match.reviewed_at).toLocaleString()}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-muted-foreground">Not yet decided</span>
              )}
            </div>
            {can("review") ? (
              <div className="mt-4 flex gap-2">
                <Btn onClick={() => void decide("APPROVED")} disabled={!match.best_activity_id}>
                  Approve match
                </Btn>
                <Btn variant="ghost" onClick={() => void decide("REJECTED")}>
                  Reject match
                </Btn>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Your role can read this evidence but cannot record a decision. The database enforces
                that, not this screen.
              </p>
            )}
          </Panel>

          <Panel>
            <h2 className="font-serif text-xl">Audit history</h2>
            {audit.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No audit entries recorded yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {audit.map((a) => (
                  <li key={a.id} className="border-l-2 border-border-strong pl-3">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()} . {a.actor ?? "system"}
                    </p>
                    <p className="text-sm">
                      {a.action} on {a.entity_type}
                      {a.confidence !== null ? ` at ${Number(a.confidence).toFixed(2)}` : ""}
                    </p>
                    {a.reason ? <p className="text-xs text-muted-foreground">{a.reason}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
