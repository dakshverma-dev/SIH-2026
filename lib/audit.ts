import { SupabaseClient } from "@supabase/supabase-js";

// Writes an immutable audit record as the currently authenticated user
// (subject to RLS — see audit_insert policy). There is deliberately no
// update/delete path anywhere in the app for this table.
export async function logAudit(
  supabase: SupabaseClient,
  entry: {
    projectId?: string | null;
    actor: string;
    action: string;
    entityType?: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    source?: string;
    model?: string;
    confidence?: number;
    reason?: string;
  }
) {
  await supabase.from("audit_events").insert({
    project_id: entry.projectId ?? null,
    actor: entry.actor,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    before_json: entry.before ?? null,
    after_json: entry.after ?? null,
    source: entry.source ?? null,
    model: entry.model ?? null,
    confidence: entry.confidence ?? null,
    reason: entry.reason ?? null,
  });
}
