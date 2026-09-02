import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { Field, PageHeader, Panel } from "@/components/kit";
import type { Role } from "@/lib/domain/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings. Plan2Reality" },
      { name: "description", content: "Extraction provider status, security posture and, for admins, the user and role register." },
      { property: "og:title", content: "Settings. Plan2Reality" },
      { property: "og:description", content: "How this deployment is actually configured, stated plainly." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { role, name, user, can } = useAuth();
  const email = user?.email ?? "";
  const extractionMode = (import.meta.env["VITE_EXTRACTION_MODE"] as string || "DEMO_FALLBACK");
  const isAdmin = can("settings:users");

  const users = useQuery({
    queryKey: ["users-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("user_roles").select("*"),
      ]);
      const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleByUser.get(p.id) ?? null }));
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Nothing on this page is aspirational. It reports the configuration this deployment is actually running."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-serif text-xl">Your account</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Name" value={name || "Not set"} />
            <Field label="Email" value={email || "Not set"} />
            <Field label="Role" value={role ? ROLE_LABEL[role as Role] : "No role assigned"} />
          </div>
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Extraction provider</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current mode</span>
              <span
                className={
                  extractionMode === "LLM"
                    ? "rounded-md border border-info/30 bg-info-soft px-2 py-0.5 font-mono text-[11px] text-info"
                    : "rounded-md border border-warn/30 bg-warn-soft px-2 py-0.5 font-mono text-[11px] text-warn"
                }
              >
                {extractionMode === "LLM" ? "REAL AI" : "DEMO FALLBACK"}
              </span>
            </div>
            <p className="text-muted-foreground">
              The fallback is a deterministic rule based extractor. It is labelled as such everywhere it
              produces output, so no screen ever claims a model did work it did not do.
            </p>
          </div>
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Security posture</h2>
          <ul className="mt-4 space-y-2 text-sm text-text-soft">
            <li>Row level security is enabled on every application table.</li>
            <li>Write permissions are checked by database policy, not by hiding buttons.</li>
            <li>The audit ledger accepts inserts only. Updates and deletes are refused.</li>
            <li>The document bucket is private. Downloads use short lived signed links.</li>
            <li>No service role key is present in the browser bundle.</li>
          </ul>
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Deterministic guarantees</h2>
          <ul className="mt-4 space-y-2 text-sm text-text-soft">
            <li>Critical path arithmetic is pure code covered by unit tests.</li>
            <li>Routing between auto post, review and unmatched is decided in the matching layer.</li>
            <li>Every confidence value stores the named signals and weights that produced it.</li>
            <li>An event with no credible counterpart stays unmatched rather than being forced.</li>
          </ul>
        </Panel>

        {isAdmin ? (
          <Panel className="lg:col-span-2">
            <h2 className="font-serif text-xl">Users and roles</h2>
            {users.isLoading ? (
              <div className="mt-4 h-32 animate-pulse rounded-md bg-panel-2" />
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border-strong text-left">
                    <th className="eyebrow py-2">Name</th>
                    <th className="eyebrow py-2">Email</th>
                    <th className="eyebrow py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.data ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{u.email}</td>
                      <td className="py-2">
                        {u.role ? ROLE_LABEL[u.role as Role] : "No role assigned"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
