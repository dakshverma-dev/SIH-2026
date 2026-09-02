import type { Role } from "./types";

/**
 * App-level permission table. This mirrors the Postgres `public.can()` function.
 * RLS is the real boundary. This copy only exists so the UI can render the
 * correct navigation and avoid offering actions that would be rejected.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN: ["*"],
  PROJECT_MANAGER: [
    "view",
    "impact",
    "recovery",
    "recovery:run",
    "analytics",
    "review",
    "conflicts",
    "conflicts:resolve",
    "audit",
    "field-updates:create",
    "documents:create",
  ],
  PLANNER: [
    "view",
    "review",
    "matching",
    "conflicts",
    "conflicts:resolve",
    "field-updates",
    "field-updates:create",
    "audit",
    "impact",
    "recovery",
    "recovery:run",
    "documents:create",
    "analytics",
  ],
  SUPERVISOR: ["view", "field-updates:create", "documents:create"],
  VIEWER: ["view"],
};

export function can(role: Role | null | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(permission);
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  PROJECT_MANAGER: "Project Manager",
  PLANNER: "Planner",
  SUPERVISOR: "Supervisor",
  VIEWER: "Viewer",
};

export type { Role };
