import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useReports } from "@/lib/data";
import { PROJECT_ID, processReport, rateLimit } from "@/lib/pipeline";
import { supabase } from "@/integrations/supabase/client";
import { Btn, EmptyState, PageHeader, Panel, RoleGate, StatusBadge } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/field-updates")({
  head: () => ({
    meta: [
      { title: "Field Updates. Plan2Reality" },
      { name: "description", content: "Submit raw field reports and see how each one was extracted and matched." },
      { property: "og:title", content: "Field Updates. Plan2Reality" },
      { property: "og:description", content: "Raw shift language in, structured schedule events out." },
    ],
  }),
  component: FieldUpdates,
});

const schema = z.object({
  raw_text: z.string().trim().min(20, "Write at least 20 characters of what happened on site."),
  contractor: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  shift: z.enum(["DAY", "NIGHT"]),
  report_date: z.string().min(10),
});

function FieldUpdates() {
  const { can, user, name } = useAuth();
  const reports = useReports();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    raw_text: "",
    contractor: "",
    location: "",
    shift: "DAY",
    report_date: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const runPipeline = async (reportId: string) => {
    setError(null);
    setResult(null);
    if (!rateLimit(10)) {
      setError("Processing limit reached. This is a per session sliding window, not a distributed limit.");
      return;
    }
    setProcessing(reportId);
    try {
      const outcome = await processReport(reportId, { id: user?.id ?? null, name: name || "Unknown" });
      setResult(
        outcome
          ? `Processed. Routed as ${outcome.trust} at confidence ${outcome.confidence.toFixed(2)}.`
          : "Processed, but no schedule counterpart could be read back.",
      );
      await qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be processed.");
    } finally {
      setProcessing(null);
    }
  };


  const submit = async () => {
    setError(null);
    setResult(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    if (!rateLimit(10)) {
      setError("Submission limit reached. This is a per session sliding window, not a distributed limit.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: insertError } = await supabase
        .from("field_reports")
        .insert({
          project_id: PROJECT_ID,
          raw_text: parsed.data.raw_text,
          contractor: parsed.data.contractor || null,
          location: parsed.data.location || null,
          shift: parsed.data.shift,
          report_date: parsed.data.report_date,
          author: name || user?.email || "Unknown",
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (insertError || !data) throw insertError ?? new Error("Could not store the report.");
      const outcome = await processReport(data.id, { id: user?.id ?? null, name: name || "Unknown" });
      setResult(
        outcome
          ? `Processed. Routed as ${outcome.trust} at confidence ${outcome.confidence.toFixed(2)}.`
          : "Stored, but the pipeline could not read it back.",
      );
      setForm({ ...form, raw_text: "" });
      await qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The submission was rejected.");
    } finally {
      setBusy(false);
    }
  };

  const rows = reports.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Capture"
        title="Field updates"
        description="Whatever was typed at the end of the shift, kept verbatim. Extraction never overwrites the original text."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div>
          {can("field-updates:create") ? (
            <Panel>
              <h2 className="font-serif text-xl">Submit an update</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="eyebrow mb-1.5 block" htmlFor="raw">
                    What happened on site
                  </label>
                  <textarea
                    id="raw"
                    rows={6}
                    value={form.raw_text}
                    onChange={(e) => setForm({ ...form, raw_text: e.target.value })}
                    placeholder="Spool fabrication for line 12-PL-2101 at Unit 100 is about 55% done."
                    className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="eyebrow mb-1.5 block" htmlFor="contractor">
                      Contractor
                    </label>
                    <input
                      id="contractor"
                      value={form.contractor}
                      onChange={(e) => setForm({ ...form, contractor: e.target.value })}
                      className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="eyebrow mb-1.5 block" htmlFor="location">
                      Location
                    </label>
                    <input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="eyebrow mb-1.5 block" htmlFor="shift">
                      Shift
                    </label>
                    <select
                      id="shift"
                      value={form.shift}
                      onChange={(e) => setForm({ ...form, shift: e.target.value })}
                      className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="DAY">Day</option>
                      <option value="NIGHT">Night</option>
                    </select>
                  </div>
                  <div>
                    <label className="eyebrow mb-1.5 block" htmlFor="date">
                      Report date
                    </label>
                    <input
                      id="date"
                      type="date"
                      value={form.report_date}
                      onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                      className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <Btn onClick={() => void submit()} disabled={busy} className="w-full">
                  {busy ? "Processing" : "Submit and process"}
                </Btn>
                {error ? (
                  <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                ) : null}
                {result ? (
                  <p className="rounded-md border border-moss/30 bg-moss-soft px-3 py-2 text-sm text-moss">
                    {result}
                  </p>
                ) : null}
              </div>
            </Panel>
          ) : (
            <RoleGate allowed={false} feature="Submitting field updates">
              <span />
            </RoleGate>
          )}
        </div>

        <Panel>
          <h2 className="mb-4 font-serif text-xl">Submitted reports</h2>
          {reports.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-panel-2" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No field updates yet"
              body="Submit one to start the golden path from field language to schedule truth."
            />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="panel-recessed p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{r.raw_text}</p>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                        {r.report_date} . {r.shift ?? "shift not stated"} . {r.contractor ?? "no contractor"} . {r.location ?? "no location"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.status === "PENDING" && can("field-updates:create") ? (
                        <button
                          type="button"
                          disabled={processing === r.id}
                          onClick={() => void runPipeline(r.id)}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs text-foreground transition-colors hover:bg-panel-2 disabled:opacity-50"
                        >
                          {processing === r.id ? "Processing" : "Process"}
                        </button>
                      ) : null}
                      <Link
                        to="/field-updates/$id"
                        params={{ id: r.id }}
                        className="text-xs text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

          )}
        </Panel>
      </div>
    </div>
  );
}
