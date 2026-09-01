export default function Loading() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }} aria-busy="true" aria-label="Loading page">
      <div style={{ width: 232, borderRight: "1px solid var(--border)", background: "var(--bg-2)", padding: 20 }}>
        <div className="p2r-skel" style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 24 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p2r-skel" style={{ width: "100%", height: 12, borderRadius: 4, marginBottom: 12 }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 24 }}>
        <div className="p2r-skel" style={{ width: 220, height: 22, borderRadius: 4, marginBottom: 10 }} />
        <div className="p2r-skel" style={{ width: 380, height: 12, borderRadius: 4, marginBottom: 28 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p2r-card p2r-skel" style={{ height: 90 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
