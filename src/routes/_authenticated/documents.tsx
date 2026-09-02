import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_ID } from "@/lib/pipeline";
import { Btn, EmptyState, PageHeader, Panel, RoleGate } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents. Plan2Reality" },
      { name: "description", content: "Private project documents stored behind signed access, never public URLs." },
      { property: "og:title", content: "Documents. Plan2Reality" },
      { property: "og:description", content: "Drawings, specifications and reports kept in private storage." },
    ],
  }),
  component: Documents,
});

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "text/plain", "text/csv"];
const meta = z.object({ category: z.string().trim().max(60) });

function Documents() {
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Drawing");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (e) throw e;
      return data ?? [];
    },
  });

  const upload = async () => {
    setError(null);
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is larger than the 10 MB limit enforced on the bucket.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError("That file type is not accepted. Use PDF, PNG, JPEG, plain text or CSV.");
      return;
    }
    const parsed = meta.safeParse({ category });
    if (!parsed.success) {
      setError("Category is too long.");
      return;
    }
    setBusy(true);
    try {
      const path = `${PROJECT_ID}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("project-documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("documents").insert({
        project_id: PROJECT_ID,
        filename: file.name,
        storage_path: path,
        size_bytes: file.size,
        category: parsed.data.category,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      setFile(null);
      await qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload was rejected.");
    } finally {
      setBusy(false);
    }
  };

  const open = async (path: string) => {
    const { data, error: e } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(path, 60);
    if (e || !data) {
      setError("A signed link could not be created for that document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Documents"
        description="The bucket is private. Every download goes through a short lived signed link created for the signed in user."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {can("documents:upload") ? (
          <Panel>
            <h2 className="font-serif text-xl">Upload</h2>
            <div className="mt-4 space-y-3">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              <div>
                <label className="eyebrow mb-1.5 block" htmlFor="cat">
                  Category
                </label>
                <select
                  id="cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option>Drawing</option>
                  <option>Specification</option>
                  <option>Daily report</option>
                  <option>Correspondence</option>
                </select>
              </div>
              <Btn onClick={() => void upload()} disabled={busy} className="w-full">
                {busy ? "Uploading" : "Upload document"}
              </Btn>
              <p className="font-mono text-[11px] text-muted-foreground">
                PDF, PNG, JPEG, TXT or CSV. 10 MB maximum, enforced on the bucket as well as here.
              </p>
              {error ? (
                <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          </Panel>
        ) : (
          <RoleGate allowed={false} feature="Uploading documents">
            <span />
          </RoleGate>
        )}

        <Panel>
          <h2 className="mb-4 font-serif text-xl">Project documents</h2>
          {docs.isLoading ? (
            <div className="h-40 animate-pulse rounded-md bg-panel-2" />
          ) : (docs.data ?? []).length === 0 ? (
            <EmptyState title="No documents stored" body="Upload a drawing or a daily report to start the project record." />
          ) : (
            <ul className="divide-y divide-border">
              {(docs.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{d.filename}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {d.category ?? "Uncategorised"} .{" "}
                      {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : "size unknown"} .{" "}
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Btn variant="ghost" onClick={() => void open(d.storage_path)}>
                    Open
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
