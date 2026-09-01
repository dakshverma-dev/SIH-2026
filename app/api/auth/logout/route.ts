import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("p2r_demo_user");
  return res;
}

