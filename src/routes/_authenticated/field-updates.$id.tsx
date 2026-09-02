import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Field, PageHeader, Panel, StatusBadge, TrustBadge } from "@/components/kit";
import type { TrustLevel } from "@/lib/domain/types";

export const Route = createFileRoute("/_authenticated/field-updates/$id")({
  head: () => ({
    meta: [
      { title: "Field update detail. Plan2Reality" },
      { name: "description", content: "Raw report text, the extracted event, and how it was extracted." },
      { property: "og:title", content: "Field update detail. Plan2Reality" },
      { property: "og:description", content: "Raw report text alongside the structured event derived from it." },
    ],
  }),
  component: ReportDetail,
  errorComponent: ({ error }) => (
    <div className="panel p-6" role="alert">
      <h2 className="font-serif text-xl">This report could not be loaded</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="panel p-6">That field update does not exist.</div>,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const query = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data: report, error } = await supabase
        .from("field_reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const { data: events } = await supabase
        .from("field_events")
        .select("*, activity_matches(*)")
        .eq("report_id", id);
      return { report, events: events ?? [] };
    },
  });

  if (query.isLoading) return <div className="panel h-64 animate-pulse bg-panel-2" />;
  const report = query.data?.report;
  if (!report) return <div className="panel p-6">That field update does not exist.</div>;
  const events = query.data?.events ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Field update"
        title={`Report ${report.report_date}`}
        description={`${report.contractor ?? "No contractor recorded"}. ${report.location ?? "No location recorded"}.`}
        actions={<StatusBadge status={report.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-serif text-xl">Original text</h2>
          <p className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-panel-2 p-4 text-sm leading-relaxed">
            {report.raw_text}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Author" value={report.author} />
            <Field label="Shift" value={report.shift} />
            <Field label="Discipline stated" value={report.discipline ?? "Not stated"} />
            <Field label="Submitted" value={new Date(report.created_at).toLocaleString()} />
          </div>
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Extracted events</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This report has not been processed yet. Nothing was inferred from it.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {events.map((e) => {
                const matches = (e.activity_matches ?? []) as Array<{
                  id: string;
                  trust_level: string;
                  confidence: number;
                }>;
                return (
                  <div key={e.id} className="panel-recessed p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border-strong bg-panel px-2 py-0.5 font-mono text-[11px]">
                        {e.event_type}
                      </span>
                      <span
                        className={
                          e.extraction_mode === "LLM"
                            ? "rounded-md border border-info/30 bg-info-soft px-2 py-0.5 font-mono text-[11px] text-info"
                            : "rounded-md border border-warn/30 bg-warn-soft px-2 py-0.5 font-mono text-[11px] text-warn"
                        }
                      >
                        {e.extraction_mode === "LLM" ? "REAL AI" : "DEMO FALLBACK"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm">{e.activity_description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Field label="Engineering tag" value={e.engineering_tag ?? "Not found"} />
                      <Field label="Line number" value={e.line_number ?? "Not found"} />
                      <Field label="Discipline" value={e.discipline ?? "Not found"} />
                      <Field label="Location" value={e.location ?? "Not found"} />
                      <Field label="Progress" value={e.progress === null ? "Not stated" : `${e.progress}%`} />
                      <Field label="Delay cause" value={e.delay_reason ?? "None reported"} />
                    </div>
                    {e.evidence_span ? (
                      <p className="mt-4 border-l-2 border-primary bg-accent px-3 py-2 text-sm italic">
                        {e.evidence_span}
                      </p>
                    ) : null}
                    {matches.map((m) => (
                      <div key={m.id} className="mt-4 flex items-center justify-between">
                        <TrustBadge level={m.trust_level as TrustLevel} score={Number(m.confidence)} />
                        <Link
                          to="/evidence/$matchId"
                          params={{ matchId: m.id }}
                          className="text-sm text-primary hover:underline"
                        >
                          Open evidence view
                        </Link>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
