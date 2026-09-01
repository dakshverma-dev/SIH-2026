import { cookies } from "next/headers";
import { createClient } from "./supabase/server";

export type Role = "ADMIN" | "PROJECT_MANAGER" | "PLANNER" | "SUPERVISOR" | "VIEWER";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** true only when authenticated via the opt-in demo-account fallback, never real Supabase auth */
  _demo?: boolean;
}

// Reads the Supabase Auth session or demo fallback session for this request
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const demoLoginEnabled = process.env.P2R_DEMO_LOGIN === "true";
  const demoCookie = demoLoginEnabled ? cookieStore.get("p2r_demo_user") : undefined;
  if (demoCookie?.value) {
    try {
      const parsed = JSON.parse(demoCookie.value);
      if (parsed && parsed.id && parsed.role) {
        return { ...parsed, _demo: true } as SessionUser;
      }
    } catch {}
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: (user.user_metadata?.role as Role) || "PLANNER",
      };
    }
    return profile as SessionUser;
  } catch {
    return null;
  }
}

// Mirrors the RLS policies in supabase/migrations exactly — this table exists
// to give the UI/API a fast, honest "can I show this button" answer, but RLS
// is the actual enforcement boundary. If this table is ever more permissive
// than RLS, the database still rejects the write; if it's stricter, a
// legitimate action silently disappears from the UI. Keep it in sync.
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ["*"],
  PROJECT_MANAGER: [
    "view", "impact", "recovery", "recovery:run", "analytics", "review", "conflicts",
    "conflicts:resolve", "audit", "field-updates:create", "documents:create",
  ],
  PLANNER: [
    "view", "review", "matching", "conflicts", "conflicts:resolve", "field-updates",
    "field-updates:create", "audit", "impact", "recovery", "recovery:run", "documents:create",
  ],
  SUPERVISOR: ["view", "field-updates:create", "documents:create"],
  VIEWER: ["view"],
};

export function can(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(permission);
}

