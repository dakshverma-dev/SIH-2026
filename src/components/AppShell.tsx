import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  permission: string;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Overview",
    items: [
      { to: "/dashboard", label: "Command Center", permission: "view" },
      { to: "/site-3d", label: "3D Site", permission: "view" },
    ],
  },
  {
    group: "Execution",
    items: [
      { to: "/field-updates", label: "Field Updates", permission: "view" },
      { to: "/review", label: "Review Queue", permission: "review" },
      { to: "/conflicts", label: "Conflict Center", permission: "conflicts" },
      { to: "/activities", label: "Activity Register", permission: "view" },
    ],
  },
  {
    group: "Schedule",
    items: [
      { to: "/schedule", label: "Schedule", permission: "view" },
      { to: "/critical-path", label: "Critical Path", permission: "view" },
      { to: "/impact", label: "Schedule Impact", permission: "impact" },
      { to: "/recovery", label: "Recovery Simulator", permission: "recovery" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { to: "/analytics", label: "Analytics", permission: "analytics" },
      { to: "/execution-memory", label: "Execution Memory", permission: "view" },
    ],
  },
  {
    group: "Governance",
    items: [
      { to: "/audit", label: "Audit Ledger", permission: "audit" },
      { to: "/documents", label: "Documents", permission: "view" },
    ],
  },
  {
    group: "Configuration",
    items: [{ to: "/settings", label: "Settings", permission: "view" }],
  },
];

function Notifications() {
  const { role } = useAuth();
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      if (cancelled) return;
      setUnread((prev) => {
        if ((count ?? 0) > prev) setPulse(true);
        return count ?? 0;
      });
    };
    void poll();
    const t = setInterval(() => void poll(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [role]);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [pulse]);

  return (
    <div className="relative flex items-center gap-2 text-muted-foreground">
      <Bell className="h-4 w-4" aria-hidden />
      <span className="font-mono text-xs">{unread} unread</span>
      {pulse ? (
        <motion.span
          className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-warn"
          initial={{ scale: 0.6, opacity: 0.4 }}
          animate={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 1, repeat: 1 }}
        />
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, name, can, signOut, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.permission)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-panel/70 lg:block">
        <div className="border-b border-border px-5 py-5">
          <Link to="/dashboard" className="block">
            <p className="font-serif text-lg leading-tight text-foreground">Plan2Reality</p>
            <p className="eyebrow mt-1">Field ledger</p>
          </Link>
        </div>
        <nav className="px-3 py-4">
          {groups.map((group) => (
            <div key={group.group} className="mb-5">
              <p className="eyebrow px-2 pb-2">{group.group}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-text-soft hover:bg-panel-2",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel/60 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-muted-foreground">KRE-P2</span>
            <span className="hidden text-sm text-text-soft sm:inline">
              Kalinga Refinery Expansion, Phase 2
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Notifications />
            <div className="text-right">
              <p className="text-sm leading-tight text-foreground">{name || user?.email}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {role ? ROLE_LABEL[role] : "No role assigned"}
              </p>
            </div>
            <button
              onClick={() => void signOut().then(() => window.location.assign("/login"))}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1.5 text-xs text-text-soft transition-colors hover:bg-panel-2"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-w-0 flex-1 px-6 py-8"
        >
          {role ? (
            children
          ) : (
            <div className="panel-recessed p-8 text-center">
              <h2 className="font-serif text-xl">No role assigned to this account</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Project data is locked until an administrator assigns a role. This is enforced by
                the database, not by this screen.
              </p>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
}
