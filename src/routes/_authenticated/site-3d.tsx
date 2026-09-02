import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useActivities } from "@/lib/data";
import { EmptyState, Field, PageHeader, Panel, StatusBadge } from "@/components/kit";

const SiteScene = lazy(() => import("@/components/SiteScene"));

export const Route = createFileRoute("/_authenticated/site-3d")({
  head: () => ({
    meta: [
      { title: "Site Command Center. Plan2Reality" },
      { name: "description", content: "A spatial read of the same schedule rows, grouped by location and scaled by reported progress." },
      { property: "og:title", content: "Site Command Center. Plan2Reality" },
      { property: "og:description", content: "The schedule as a site, not as a spreadsheet." },
    ],
  }),
  component: Site3D,
});

const LEGEND: Array<[string, string]> = [
  ["Not started", "#c9bc9c"],
  ["In progress", "#0f6e64"],
  ["Completed", "#5c6b3f"],
  ["Delayed", "#99392c"],
  ["On hold", "#9c6b1f"],
];

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

function Site3D() {
  const activities = useActivities();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setWebgl(hasWebgl());
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const rows = activities.data ?? [];
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const byLocation = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.location ?? "Unassigned";
    const list = byLocation.get(key) ?? [];
    list.push(r);
    byLocation.set(key, list);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Site command center"
        description="Block height is reported progress. Colour is status. A red outline means zero float. Nothing here is decorative."
      />

      {activities.isLoading ? (
        <div className="h-[520px] animate-pulse rounded-md bg-panel-2" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No schedule to render"
          body="The scene draws real activity rows only. With none loaded there is nothing honest to show."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Panel className="overflow-hidden p-0">
            <div className="h-[520px] w-full">
              {webgl === null ? (
                <div className="h-full animate-pulse bg-panel-2" />
              ) : webgl ? (
                <ClientOnly fallback={<div className="h-full animate-pulse bg-panel-2" />}>
                  <Suspense fallback={<div className="h-full animate-pulse bg-panel-2" />}>
                    <SiteScene
                      activities={rows}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      reducedMotion={reducedMotion}
                    />
                  </Suspense>
                </ClientOnly>
              ) : (
                <div className="h-full overflow-y-auto p-5">
                  <p className="mb-4 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
                    This browser has no working WebGL context, so the 3D view cannot render. The same data
                    is laid out below by location.
                  </p>
                  {Array.from(byLocation.entries()).map(([loc, list]) => (
                    <div key={loc} className="mb-5">
                      <p className="eyebrow mb-2">{loc}</p>
                      <div className="space-y-1.5">
                        {list.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => setSelectedId(a.id)}
                            className="flex w-full items-center gap-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-left"
                          >
                            <span className="w-24 shrink-0 font-mono text-xs">{a.activity_id}</span>
                            <span className="h-2 w-32 overflow-hidden rounded-full bg-panel">
                              <span
                                className="block h-full bg-primary"
                                style={{ width: `${Math.min(100, Math.max(0, a.progress ?? 0))}%` }}
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm">{a.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel>
              <h2 className="font-serif text-xl">Legend</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {LEGEND.map(([label, color]) => (
                  <li key={label} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm border border-border-strong"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm border-2 border-danger" />
                  Zero float, critical
                </li>
              </ul>
            </Panel>

            <Panel>
              <h2 className="font-serif text-xl">Selected activity</h2>
              {!selected ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Select a block to read the underlying schedule row.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Activity" value={<span className="font-mono">{selected.activity_id}</span>} />
                    <Field label="Discipline" value={selected.discipline} />
                    <Field label="Progress" value={`${selected.progress ?? 0}%`} />
                    <Field label="Critical" value={selected.is_critical ? "Yes" : "No"} />
                  </div>
                  <p className="text-sm">{selected.description}</p>
                  <StatusBadge status={selected.status} />
                  <Link
                    to="/activity/$id"
                    params={{ id: selected.id }}
                    className="block text-sm text-primary hover:underline"
                  >
                    Open full activity detail
                  </Link>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
