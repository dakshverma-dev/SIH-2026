import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action, reason } = await req.json();
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
    reason,
    source: "conflict-center",
  });

  return NextResponse.json({ ok: true });
}
