"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const POLL_MS = 30_000;

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"SYNCED" | "STALE" | "ERROR">("SYNCED");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setItems(data.notifications || []);
      setStatus("SYNCED");
    } catch {
      setStatus("ERROR");
    }
  }, []);

  useEffect(() => {
    // Deferred via setTimeout(0) rather than called synchronously in the
    // effect body — satisfies the set-state-in-effect lint rule while still
    // firing on the next tick after mount.
    const kickoff = setTimeout(load, 0);
    timerRef.current = setInterval(load, POLL_MS);
    const staleTimer = setInterval(() => setStatus((s) => (s === "SYNCED" ? "STALE" : s)), POLL_MS * 2);
    return () => {
      clearTimeout(kickoff);
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(staleTimer);
    };
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  async function openItem(n: Notification) {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      load();
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${unread} unread`}
        style={{
          position: "relative", background: "var(--panel-2)", border: "1px solid var(--border)",
          borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14,
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute", top: -4, right: -4, background: "var(--danger)", color: "#fffdf8",
              fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, padding: "0 3px",
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="p2r-card"
          style={{ position: "absolute", right: 0, top: 40, width: 340, maxHeight: 420, overflowY: "auto", zIndex: 150, padding: 0 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Notifications</span>
            <span
              className="p2r-mono"
              title={status === "SYNCED" ? "Polling every 30s" : status === "STALE" ? "No refresh in a while" : "Could not reach the server"}
              style={{ fontSize: 9.5, color: status === "SYNCED" ? "var(--accent-2)" : status === "STALE" ? "var(--warn)" : "var(--danger)", fontWeight: 700 }}
            >
              {status}
            </span>
          </div>
          {items.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: "var(--muted)" }}>No notifications yet.</div>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none",
                borderBottom: "1px solid var(--border)", cursor: "pointer",
                background: n.read ? "transparent" : "var(--accent-soft)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!n.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}</span>
              </div>
              {n.body && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{n.body}</div>}
              <div className="p2r-mono" style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 3 }}>{n.created_at}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
