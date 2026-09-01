import Link from "next/link";
import { SessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import CommandPalette from "./shell/CommandPalette";
import NotificationBell from "./shell/NotificationBell";

interface NavItem { href: string; label: string }
interface NavGroup { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { label: "Overview", items: [{ href: "/dashboard", label: "Command Center" }, { href: "/site-3d", label: "3D Site View" }] },
  {
    label: "Execution",
    items: [
      { href: "/field-updates", label: "Field Updates" },
      { href: "/review", label: "Review Queue" },
      { href: "/conflicts", label: "Conflicts" },
      { href: "/activities", label: "Activities" },
    ],
  },
  {
    label: "Schedule",
    items: [
      { href: "/schedule", label: "Schedule" },
      { href: "/critical-path", label: "Critical Path" },
      { href: "/impact", label: "Impact" },
      { href: "/recovery", label: "Recovery" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/analytics", label: "Analytics" },
      { href: "/execution-memory", label: "Execution Memory" },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/audit", label: "Audit Ledger" },
      { href: "/documents", label: "Documents" },
    ],
  },
  { label: "Configuration", items: [{ href: "/settings", label: "Settings" }] },
];

function findLabel(active?: string): string {
  for (const g of NAV) {
    const hit = g.items.find((i) => i.href === active);
    if (hit) return hit.label;
  }
  return "Overview";
}

export default function Shell({
  children,
  active,
  user,
  projectName,
}: {
  children: React.ReactNode;
  active?: string;
  user: SessionUser;
  projectName?: string;
}) {
  const pageLabel = findLabel(active);

  return (
    <div className="p2r-shell">
      <input type="checkbox" id="p2r-nav-toggle" className="p2r-shell-toggle-input" aria-hidden />
      <aside className="p2r-shell-aside" style={{ borderRight: "1px solid var(--border)", padding: "20px 14px", background: "var(--bg-2)" }}>
        <div style={{ padding: "0 8px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="p2r-serif" style={{ fontSize: 16, letterSpacing: "0.02em", color: "var(--text)", fontWeight: 700 }}>
              Plan2Reality
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{projectName || "North Basin Process Expansion"}</div>
          </div>
          <label htmlFor="p2r-nav-toggle" className="p2r-shell-hamburger-close" aria-label="Close navigation">✕</label>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {NAV.map((group) => (
            <div key={group.label}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted-2)", padding: "0 10px 6px" }}>
                {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {group.items.map((item) => {
                  const isActive = active === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        padding: "7px 10px",
                        borderRadius: 7,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: isActive ? "var(--text)" : "var(--text-soft)",
                        background: isActive ? "var(--panel)" : "transparent",
                        border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {isActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <label htmlFor="p2r-nav-toggle" className="p2r-shell-backdrop" aria-hidden />

      <div className="p2r-shell-main">
        <header style={{ borderBottom: "1px solid var(--border)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "var(--panel)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <label htmlFor="p2r-nav-toggle" className="p2r-shell-hamburger" aria-label="Open navigation">☰</label>
            <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: "var(--muted)", whiteSpace: "nowrap" }}>
              <span className="p2r-hide-narrow">EPC Package</span> <span className="p2r-hide-narrow" style={{ margin: "0 6px" }}>/</span> <span style={{ color: "var(--text)", fontWeight: 600 }}>{pageLabel}</span>
            </nav>
            <span
              className="p2r-hide-narrow"
              style={{
                fontSize: 10.5, background: "var(--warn-soft)", color: "var(--warn)",
                border: "1px solid #dcc38a", padding: "2px 8px", borderRadius: 12, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.04em", flexShrink: 0,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--warn)" }} />
              PROTOTYPE · SIH 2026
            </span>
            {user._demo && (
              <span
                title="This session was authenticated via the opt-in demo-account fallback, not live Supabase auth."
                className="badge badge-neutral p2r-hide-narrow"
              >
                Demo session
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <span className="p2r-hide-narrow"><CommandPalette /></span>
            <NotificationBell />
            <span className="p2r-hide-narrow" style={{ fontSize: 12.5 }}>{user.name}</span>
            <span className="badge badge-info">{user.role.replace("_", " ")}</span>
            <LogoutButton />
          </div>
        </header>
        <main style={{ padding: 24, flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
