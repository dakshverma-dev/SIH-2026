import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="p2r-card" style={{ maxWidth: 420, padding: 28, textAlign: "center" }}>
        <div className="p2r-serif" style={{ fontSize: 40, fontWeight: 700, color: "var(--accent)" }}>404</div>
        <h1 style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>Nothing here</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, marginBottom: 18 }}>
          This route, activity, or evidence record doesn&apos;t exist — or you don&apos;t have access to it.
        </p>
        <Link href="/dashboard" style={{ padding: "9px 20px", background: "var(--accent)", color: "#fffdf8", fontWeight: 600, borderRadius: 7, fontSize: 13, display: "inline-block" }}>
          Back to Command Center
        </Link>
      </div>
    </div>
  );
}
