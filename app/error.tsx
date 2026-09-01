"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="p2r-card" style={{ maxWidth: 440, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
        <h1 className="p2r-serif" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
          This page failed to render. The underlying data was not lost — the audit ledger and database state are unaffected.
        </p>
        {error?.digest && <p className="p2r-mono" style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 16 }}>Reference: {error.digest}</p>}
        <button
          onClick={() => reset()}
          style={{ padding: "9px 20px", background: "var(--accent)", color: "#fffdf8", fontWeight: 600, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13 }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
