"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  group: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset transient state as part of the close action itself, not as a
  // reaction inside an effect (avoids the cascading-render anti-pattern).
  function close() {
    setOpen(false);
    setQ("");
    setResults([]);
    setActiveIdx(0);
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const runSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setActiveIdx(0);
        }
      } catch {
        // network failure: leave prior results, do not crash the palette
      } finally {
        setLoading(false);
      }
    }, 220);
  }, []);

  function go(href: string) {
    close();
    router.push(href);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open global search"
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
          background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8,
          color: "var(--muted)", fontSize: 12.5, cursor: "pointer",
        }}
      >
        <span>Search activities, updates, conflicts…</span>
        <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, border: "1px solid var(--border-strong)", borderRadius: 4, padding: "1px 5px", background: "var(--panel)" }}>
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command search"
      onClick={close}
      style={{
        position: "fixed", inset: 0, background: "rgba(54,44,31,0.35)", zIndex: 200,
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="p2r-card"
        style={{ width: 560, maxWidth: "92vw", padding: 0, overflow: "hidden" }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            runSearch(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && results[activeIdx]) go(results[activeIdx].href);
          }}
          placeholder="Search by activity ID, WBS, tag, contractor, location…"
          style={{
            width: "100%", padding: "16px 18px", border: "none", borderBottom: "1px solid var(--border)",
            fontSize: 15, outline: "none", background: "transparent", color: "var(--text)",
          }}
        />
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {loading && <div style={{ padding: 16, fontSize: 12.5, color: "var(--muted)" }}>Searching…</div>}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: 16, fontSize: 12.5, color: "var(--muted)" }}>
              No matches for &ldquo;{q}&rdquo; in activities, field updates, or conflicts.
            </div>
          )}
          {!loading && q.trim().length < 2 && (
            <div style={{ padding: 16, fontSize: 12.5, color: "var(--muted)" }}>Type at least 2 characters to search live project data.</div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.group}-${r.id}`}
              onClick={() => go(r.href)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 18px", border: "none",
                borderBottom: "1px solid var(--border)", cursor: "pointer",
                background: i === activeIdx ? "var(--panel-2)" : "transparent",
              }}
            >
              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>{r.group}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{r.title}</div>
              {r.subtitle && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{r.subtitle}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
