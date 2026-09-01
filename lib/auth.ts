import { cookies } from "next/headers";
import { createClient } from "./supabase/server";

export type Role = "ADMIN" | "PROJECT_MANAGER" | "PLANNER" | "SUPERVISOR" | "VIEWER";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// Reads the Supabase Auth session or demo fallback session for this request
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const demoCookie = cookieStore.get("p2r_demo_user");
  if (demoCookie?.value) {
    try {
      const parsed = JSON.parse(demoCookie.value);
      if (parsed && parsed.id && parsed.role) {
        return parsed as SessionUser;
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

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ["*"],
  PROJECT_MANAGER: ["view", "impact", "recovery", "analytics", "review", "conflicts", "audit"],
  PLANNER: ["view", "review", "matching", "conflicts", "field-updates", "audit"],
  SUPERVISOR: ["view", "field-updates:create"],
  VIEWER: ["view"],
};

export function can(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(permission);
}

