import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

const PIPELINE = [
  { step: "CAPTURE", detail: "DPR text, Excel trackers, field reports" },
  { step: "UNDERSTAND", detail: "Structured extraction — activity, location, progress, evidence" },
  { step: "MATCH + TRUST", detail: "Identifiers, discipline, location, description overlap → explainable confidence" },
  { step: "SCHEDULE IMPACT", detail: "Deterministic CPM — forecast finish, critical path, delay" },
  { step: "PROJECT ACTION", detail: "Auto-post, human review, or recovery scenario" },
];

const PRINCIPLES = [
  { title: "When the system knows, it acts.", body: "High-confidence, uncontradicted updates auto-post to the schedule with a full evidence trail." },
  { title: "When it is uncertain, it explains.", body: "Every score is a sum of named signals — identifier match, discipline, location, description overlap — never a bare percentage." },
  { title: "When it does not know, it says so.", body: "Unmatched events are never forced onto an activity. \"I don't know\" is a valid, correctly-routed output." },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
        <div className="p2r-serif" style={{ fontSize: 17, fontWeight: 700 }}>Plan2Reality</div>
        <Link href="/login" className="p2r-link" style={{ fontSize: 13, fontWeight: 600, padding: "8px 16px", background: "var(--accent)", color: "#fffdf8", borderRadius: 7 }}>
          Sign in
        </Link>
      </header>

      {/* HERO */}
      <section style={{ padding: "72px 32px 56px", maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
        <span
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--warn)",
            background: "var(--warn-soft)", border: "1px solid #dcc38a", padding: "3px 10px", borderRadius: 12, display: "inline-block", marginBottom: 20,
          }}
        >
          Prototype · SIH 2026 · PS26122 · Oil India Limited
        </span>
        <h1 className="p2r-serif" style={{ fontSize: 44, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.01em" }}>
          Turn field reality into schedule truth.
        </h1>
        <p style={{ fontSize: 16.5, color: "var(--text-soft)", marginTop: 18, maxWidth: 620, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          Infrastructure projects plan in Primavera and report in WhatsApp. Plan2Reality is the trust layer between
          messy field reporting and structured project schedules — it never guesses, and it never hides what it doesn&apos;t know.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
          <Link href="/login" style={{ padding: "11px 22px", background: "var(--accent)", color: "#fffdf8", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
            Open Planner Console
          </Link>
          <a href="#how-it-works" style={{ padding: "11px 22px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
            Explore how it works
          </a>
        </div>
      </section>

      {/* PIPELINE VISUAL */}
      <section id="how-it-works" style={{ padding: "0 32px 64px", maxWidth: 1080, margin: "0 auto" }}>
        <div className="p2r-card" style={{ padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${PIPELINE.length}, 1fr)`, gap: 0, alignItems: "stretch" }}>
            {PIPELINE.map((p, i) => (
              <div key={p.step} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1, textAlign: "center", padding: "0 8px" }}>
                  <div
                    className="p2r-panel"
                    style={{
                      padding: "14px 10px", borderRadius: 10, borderColor: i === 2 ? "var(--accent)" : "var(--border)",
                      borderWidth: i === 2 ? 2 : 1, borderStyle: "solid",
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: i === 2 ? "var(--accent)" : "var(--muted)" }}>{p.step}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.4 }}>{p.detail}</div>
                  </div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div aria-hidden style={{ fontSize: 18, color: "var(--border-strong)", padding: "0 2px" }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST-FIRST PRINCIPLES */}
      <section style={{ padding: "0 32px 64px", maxWidth: 1080, margin: "0 auto" }}>
        <h2 className="p2r-serif" style={{ fontSize: 24, textAlign: "center", marginBottom: 8 }}>&ldquo;I don&apos;t know&rdquo; is a valid output.</h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>
          The system is never designed as if AI must always be correct. Trust, evidence, and human review are first-class.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="p2r-card" style={{ padding: 22 }}>
              <div className="p2r-serif" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.55 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ARCHITECTURE — honest, not aspirational */}
      <section style={{ padding: "0 32px 72px", maxWidth: 1080, margin: "0 auto" }}>
        <div className="p2r-card" style={{ padding: 26 }}>
          <div className="p2r-eyebrow" style={{ marginBottom: 10 }}>Architecture</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Frontend</div>
              <div style={{ color: "var(--muted)" }}>Next.js 16 App Router, TypeScript, React 19 — every page a real Server Component reading live data.</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Database &amp; security</div>
              <div style={{ color: "var(--muted)" }}>Supabase Postgres. Row Level Security enforced on every table — no service-role bypass, ever.</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Matching &amp; CPM</div>
              <div style={{ color: "var(--muted)" }}>Deterministic, explainable scoring and a pure, unit-tested critical-path engine — never an LLM guessing dates.</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Extraction</div>
              <div style={{ color: "var(--muted)" }}>Real LLM extraction when configured; otherwise a clearly-labelled deterministic fallback — never presented as AI when it isn&apos;t.</div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ padding: "24px 32px", borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
        Plan2Reality — SIH 2026 prototype for Oil India Limited. Not a finished product.
      </footer>
    </div>
  );
}
