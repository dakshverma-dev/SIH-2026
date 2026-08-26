import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const DEMO_ACCOUNTS_MAP: Record<
  string,
  { id: string; name: string; email: string; role: "ADMIN" | "PROJECT_MANAGER" | "PLANNER" | "SUPERVISOR" | "VIEWER"; pass: string }
> = {
  "admin@plan2reality.io": { id: "00000000-0000-0000-0000-000000000001", name: "Amit Rao", email: "admin@plan2reality.io", role: "ADMIN", pass: "admin123" },
  "pm@plan2reality.io": { id: "00000000-0000-0000-0000-000000000002", name: "Neha Kulkarni", email: "pm@plan2reality.io", role: "PROJECT_MANAGER", pass: "pm12345" },
  "planner@plan2reality.io": { id: "00000000-0000-0000-0000-000000000003", name: "Suresh Iyer", email: "planner@plan2reality.io", role: "PLANNER", pass: "plan123" },
  "supervisor@plan2reality.io": { id: "00000000-0000-0000-0000-000000000004", name: "Ramesh Yadav", email: "supervisor@plan2reality.io", role: "SUPERVISOR", pass: "sup1234" },
  "viewer@plan2reality.io": { id: "00000000-0000-0000-0000-000000000005", name: "Divya Menon", email: "viewer@plan2reality.io", role: "VIEWER", pass: "view123" },
};

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const cleanEmail = email?.toLowerCase()?.trim() || "";

  // 1. Try remote Supabase auth with 3s timeout
  try {
    const supabase = await createClient();
    const authPromise = supabase.auth.signInWithPassword({ email: cleanEmail, password });
    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase auth timeout")), 3000)
    );

    const { data, error } = await Promise.race([authPromise, timeoutPromise]);
    if (!error && data?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      try {
        await supabase.from("audit_events").insert({
          actor: cleanEmail,
          action: "LOGIN",
          entity_type: "user",
          entity_id: data.user.id,
          source: "auth",
        });
      } catch {}

      return NextResponse.json({ ok: true, role: profile?.role || "PLANNER" });
    }
  } catch {}

  // 2. Demo fallback accounts
  const demo = DEMO_ACCOUNTS_MAP[cleanEmail];
  if (demo && demo.pass === password) {
    const res = NextResponse.json({ ok: true, role: demo.role });
    res.cookies.set(
      "p2r_demo_user",
      JSON.stringify({
        id: demo.id,
        name: demo.name,
        email: demo.email,
        role: demo.role,
      }),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      }
    );
    return res;
  }

  return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
}

