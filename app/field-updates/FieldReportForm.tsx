"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SAMPLE =
  "Spool erection completed for 24-inch header at Rack 3. Work started yesterday and reached approximately 65 percent completion. Larsen Mech Co. crew of 5 on day shift.";

interface ProcessResult {
  matchResult: {
    confidence: number;
    trustLevel: "HIGH" | "MEDIUM" | "LOW" | "UNMATCHED";
  };
}

export default function FieldReportForm() {
  const router = useRouter();
  const [text, setText] = useState(SAMPLE);
  const [contractor, setContractor] = useState("Larsen Mech Co.");
  const [location, setLocation] = useState("Rack 3");
  const [discipline, setDiscipline] = useState("Piping");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/field-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: text, contractor, location, discipline, report_date: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const processRes = await fetch(`/api/field-reports/${data.id}/process`, { method: "POST" });
      const processData: ProcessResult & { error?: string } = await processRes.json();
      if (!processRes.ok) throw new Error(processData.error);
      setResult(processData);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p2r-card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Submit Field Report</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input placeholder="Contractor" value={contractor} onChange={(e) => setContractor(e.target.value)} style={inputStyle} />
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
        </div>
        <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={{ ...inputStyle, marginBottom: 8, width: "100%" }}>
          {["Piping", "Mechanical", "Electrical", "Instrumentation", "Civil", "Structural"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit" }}
          placeholder="Paste DPR text or supervisor update…"
        />
        {error && <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 8 }}>{error}</div>}
        <button
          disabled={loading}
          style={{ marginTop: 10, width: "100%", padding: "9px 0", background: "var(--accent)", color: "#0b0f14", fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer" }}
        >
          {loading ? "Extracting & matching…" : "Submit & Run Matching Engine"}
        </button>
      </form>

      {result && (
        <div className="p2r-panel" style={{ marginTop: 14, padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Match result</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span className={`badge ${result.matchResult.trustLevel === "HIGH" ? "badge-high" : result.matchResult.trustLevel === "MEDIUM" ? "badge-medium" : "badge-low"}`}>
              {result.matchResult.trustLevel}
            </span>
            <span style={{ fontSize: 13 }}>{Math.round(result.matchResult.confidence * 100)}% confidence</span>
          </div>
          <a href="/review" style={{ display: "inline-block", marginTop: 10, fontSize: 12.5, color: "var(--accent)" }}>Go to Review Queue →</a>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--panel-2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: 13,
};
