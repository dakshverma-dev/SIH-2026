import { createServerFn } from "@tanstack/react-start";

export const DEMO_ACCOUNTS = [
  { email: "admin@plan2reality.demo", name: "Ada Okonkwo", role: "ADMIN" },
  { email: "pm@plan2reality.demo", name: "Marcus Reid", role: "PROJECT_MANAGER" },
  { email: "planner@plan2reality.demo", name: "Sana Iqbal", role: "PLANNER" },
  { email: "supervisor@plan2reality.demo", name: "Tomas Berg", role: "SUPERVISOR" },
  { email: "viewer@plan2reality.demo", name: "Lin Zhao", role: "VIEWER" },
] as const;

export const DEMO_PASSWORD = "Plan2Reality!2026";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

/**
 * Idempotently provisions the five labelled demo accounts, one per role.
 * Runs server-side only. It creates nothing except these fixed accounts.
 */
export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      console.warn("[ensureDemoAccounts] Skipping auto-provisioning:", listErr.message);
      return { ok: false, reason: listErr.message };
    }

    const existing = new Map(list.users.map((u) => [u.email ?? "", u.id]));
    const created: string[] = [];

    for (const account of DEMO_ACCOUNTS) {
      let userId = existing.get(account.email);
      if (!userId) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { name: account.name },
        });
        if (error) {
          console.warn("[ensureDemoAccounts] Could not create user:", account.email, error.message);
          continue;
        }
        userId = data.user.id;
        created.push(account.email);
      }
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, name: account.name, email: account.email });
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: account.role }, { onConflict: "user_id,role" });
      await supabaseAdmin
        .from("project_members")
        .upsert({ project_id: PROJECT_ID, user_id: userId, role: account.role });
    }

    return { ok: true, created, total: DEMO_ACCOUNTS.length };
  } catch (err) {
    console.warn("[ensureDemoAccounts] Provisioning error:", err);
    return { ok: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }
});
