import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { NotificationActionSchema, zodErrorResponse } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${session.id},user_role.eq.${session.role}`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ notifications: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => null);
  if (raw === null) return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  const parsed = NotificationActionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
  const supabase = await createClient();

  if ("markAllRead" in parsed.data) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .or(`user_id.eq.${session.id},user_role.eq.${session.role}`)
      .eq("read", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
