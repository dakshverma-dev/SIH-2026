import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession, can } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ConflictActionSchema, zodErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "conflicts:resolve")) {
    return NextResponse.json({ error: `Role '${session.role}' cannot resolve conflicts.` }, { status: 403 });
  }
  const { id } = await params;
  const raw = await req.json().catch(() => null);
  if (raw === null) return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  const parsed = ConflictActionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
  const { action, reason } = parsed.data;
  const supabase = await createClient();

  const { data: conflict } = await supabase.from("conflicts").select("*").eq("id", id).single();
  if (!conflict) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("conflicts")
    .update({ status: action === "RESOLVE" ? "RESOLVED" : "IGNORED", resolution_reason: reason || null, resolved_by: session.id })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await logAudit(supabase, {
    projectId: conflict.project_id,
    actor: session.email,
    action: action === "RESOLVE" ? "CONFLICT_RESOLVED" : "CONFLICT_IGNORED",
    entityType: "conflict",
    entityId: id,
    before: { status: conflict.status },
    after: { status: action === "RESOLVE" ? "RESOLVED" : "IGNORED" },
    reason: reason || undefined,
    source: "conflict-center",
  });

  return NextResponse.json({ ok: true });
}
