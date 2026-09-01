"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@plan2reality.io", password: "admin123" },
  { role: "Project Manager", email: "pm@plan2reality.io", password: "pm12345" },
  { role: "Planner", email: "planner@plan2reality.io", password: "plan123" },
  { role: "Supervisor", email: "supervisor@plan2reality.io", password: "sup1234" },
  { role: "Viewer", email: "viewer@plan2reality.io", password: "view123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("planner@plan2reality.io");
  const [password, setPassword] = useState("plan123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Login request failed. Please try again.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.15em", color: "var(--accent)", fontWeight: 700 }}>PLAN2REALITY</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Trusted Execution Intelligence</div>
        </div>
        <form onSubmit={submit} className="p2r-card" style={{ padding: 28 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", marginTop: 6, marginBottom: 14, padding: "9px 12px", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }}
          />
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginTop: 6, marginBottom: 18, padding: "9px 12px", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }}
          />
          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            disabled={loading}
            style={{ width: "100%", padding: "10px 0", background: "var(--accent)", color: "#0b0f14", fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="p2r-panel" style={{ marginTop: 16, padding: 16, fontSize: 12.5 }}>
          <div style={{ color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>Demo accounts</div>
          {DEMO_ACCOUNTS.map((a) => (
            <div
              key={a.email}
              style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", cursor: "pointer" }}
              onClick={() => {
                setEmail(a.email);
                setPassword(a.password);
              }}
            >
              <span style={{ color: "var(--text)" }}>{a.role}</span>
              <span className="p2r-mono" style={{ color: "var(--muted)" }}>{a.email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
