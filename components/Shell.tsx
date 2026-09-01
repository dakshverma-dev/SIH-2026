import Link from "next/link";
import { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/schedule", label: "Schedule" },
  { href: "/field-updates", label: "Field Updates" },
  { href: "/review", label: "Review" },
  { href: "/conflicts", label: "Conflicts" },
  { href: "/impact", label: "Impact" },
  { href: "/recovery", label: "Recovery" },
  { href: "/analytics", label: "Analytics" },
  { href: "/execution-memory", label: "Execution Memory" },
  { href: "/audit", label: "Audit" },
];

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
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 224, borderRight: "1px solid var(--border)", padding: "18px 14px", flexShrink: 0 }}>
        <div style={{ padding: "0 8px 18px 8px" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--accent)", fontWeight: 700 }}>PLAN2REALITY</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{projectName || "North Basin Process Expansion"}</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 13,
                color: active === item.href ? "var(--text)" : "var(--muted)",
                background: active === item.href ? "var(--panel-2)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 24, padding: "0 8px" }}>
          <Link href="/documents" style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Documents</Link>
          <Link href="/settings" style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>Settings</Link>
        </div>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ borderBottom: "1px solid var(--border)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>EPC Package · Demo Data</span>
            <span style={{ fontSize: 11, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "2px 8px", borderRadius: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
              WORK IN PROGRESS · SIH 2026
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12.5 }}>{user.name}</span>
            <span className="badge badge-info">{user.role.replace("_", " ")}</span>
            <LogoutButton />
          </div>
        </header>
        <main style={{ padding: 24, flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}

import LogoutButton from "./LogoutButton";
