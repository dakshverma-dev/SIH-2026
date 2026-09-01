import { SupabaseClient } from "@supabase/supabase-js";

export async function notify(
  supabase: SupabaseClient,
  entry: {
    projectId: string | null;
    userRole?: "ADMIN" | "PROJECT_MANAGER" | "PLANNER" | "SUPERVISOR" | "VIEWER";
    userId?: string;
    title: string;
    body?: string;
    link?: string;
  }
) {
  // Best-effort: a notification failing to write must never break the
  // pipeline step that triggered it.
  try {
    await supabase.from("notifications").insert({
      project_id: entry.projectId,
      user_role: entry.userRole ?? null,
      user_id: entry.userId ?? null,
      title: entry.title,
      body: entry.body ?? null,
      link: entry.link ?? null,
    });
  } catch {}
}
